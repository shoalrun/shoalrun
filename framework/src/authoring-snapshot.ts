import { componentPluginFiles } from './component-manifest.js';
import { createHash } from 'node:crypto';
import { lstat, mkdir, open, readFile, readdir, realpath, stat, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { explainSegments, loadConfig } from './config.js';
import { parse } from './semantic-markdown.js';
import { readDocument } from './content-source.js';
import { parseAuditSettings } from './audit.js';

export const snapshotSchemaVersion = 1;
export class SnapshotError extends Error {
  constructor(public readonly code: 'invalid_input' | 'unsafe_path' | 'stale_input' | 'capture_limit' | 'unsupported_dependency', message: string) { super(message); }
}
export const sha256 = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
export const isWithin = (root: string, file: string) => file === root || file.startsWith(root.endsWith(path.sep) ? root : root + path.sep);
export const excludedNames = new Set(['.git', 'node_modules', 'dist', 'site-dist', '.vercel', '.shoalrun', '.private-archives', '.private-evals', '.aws', '.ssh', '.codex', '.npmrc']);
const excluded = (name: string) => excludedNames.has(name) || name === '.env' || name.startsWith('.env.');
export type SnapshotInput = { file: string; digest: string; mode: number };
export type ProfileCapture = { file: string; sources: Record<string, string> };
export type SnapshotCapture = { profile?: ProfileCapture; root: string; config: string; inputs: SnapshotInput[]; buffers: Map<string, Buffer>; externalDirectories: string[]; excluded: Array<{ file: string; reason: string }>; configDigest?: string };
export type AuthoringBaseline = { profile?: ProfileCapture; schemaVersion: 1; kind: 'shoalrun-authoring-baseline'; project: string; config: string; digest: string; inputs: SnapshotInput[]; externalDirectories: string[]; excluded: SnapshotCapture['excluded'] };
const framework = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function validateProfileCapture(root: string, profile?: ProfileCapture) {
  if (profile === undefined) return;
  if (!profile || typeof profile.file !== 'string' || !profile.sources || typeof profile.sources !== 'object' || Array.isArray(profile.sources)) throw new SnapshotError('invalid_input', 'Invalid captured deployment profile');
  const source = profile.sources[profile.file];
  if (typeof source !== 'string' || !path.isAbsolute(source)) throw new SnapshotError('invalid_input', 'Captured profile needs its explicit source file');
  const directory = `../.shoalrun-profile-${sha256(source).slice(0, 16)}`;
  if (profile.file !== `${directory}/${path.basename(source)}`) throw new SnapshotError('unsafe_path', 'Captured profile identity does not match its source');
  for (const [file, original] of Object.entries(profile.sources)) {
    relativeInput(root, file);
    const relative = path.relative(directory, file);
    if (!relative || path.isAbsolute(relative) || relative.startsWith('..') || typeof original !== 'string' || original !== path.resolve(path.dirname(source), relative)) throw new SnapshotError('unsafe_path', 'Captured profile asset escapes its declared directory');
  }
}

export function relativeInput(root: string, file: string) {
  if (typeof file !== 'string' || !file || path.isAbsolute(file) || /[\\\0\r\n]/.test(file)) throw new SnapshotError('unsafe_path', 'Input paths must be project-relative');
  const target = path.resolve(root, file);
  if (!isWithin(path.dirname(root), target) || target === path.dirname(root) || target === root) throw new SnapshotError('unsafe_path', `Input escapes the project parent: ${file}`);
  return target;
}

async function noSymlinks(file: string, boundary: string) {
  let current = file;
  while (isWithin(boundary, current)) {
    const info = await lstat(current).catch(error => { if (error.code === 'ENOENT') return undefined; throw error; });
    if (info?.isSymbolicLink()) throw new SnapshotError('unsafe_path', `Snapshot inputs must not use symlinks: ${file}`);
    if (current === boundary) break;
    current = path.dirname(current);
  }
}

/** Read only the named mounted file, including assets retained by a baseline. */
export async function readProfileInput(source: string) {
  const boundary = path.parse(source).root;
  await noSymlinks(source, boundary);
  const handle = await open(source, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const before = await handle.stat();
    if (!before.isFile()) throw new SnapshotError('unsafe_path', 'Profile inputs must be regular files');
    if (before.size > 16 * 1024 * 1024) throw new SnapshotError('capture_limit', 'Profile input exceeds 16 MiB');
    const bytes = await handle.readFile();
    const after = await handle.stat();
    await noSymlinks(source, boundary);
    const current = await lstat(source);
    if (bytes.length > 16 * 1024 * 1024 || before.ino !== current.ino || before.dev !== current.dev || before.size !== after.size || before.mtimeMs !== after.mtimeMs || before.mode !== after.mode) throw new SnapshotError('stale_input', 'Profile input changed while reading; retry validation');
    return { bytes, digest: sha256(bytes), mode: before.mode & 0o777 };
  } finally { await handle.close(); }
}

export async function collectSnapshotInputs(root: string, externalFiles: string[] = [], externalDirectories: string[] = []) {
  const buffers = new Map<string, Buffer>();
  const inputs: SnapshotInput[] = [];
  const exclusions: SnapshotCapture['excluded'] = [];
  let bytes = 0;
  const add = async (file: string) => {
    const name = path.relative(root, file);
    if (name.split(path.sep).some(excluded) && !(externalFiles.includes(name) && name.split(path.sep).includes('node_modules') && !name.split(path.sep).some(part => !['node_modules', 'dist', 'site-dist'].includes(part) && excluded(part)))) throw new SnapshotError('unsupported_dependency', `Dependency is in an excluded location: ${name}`);
    if (buffers.has(name)) return;
    await noSymlinks(file, path.dirname(root));
    const before = await stat(file);
    if (!before.isFile()) throw new SnapshotError('unsafe_path', `Snapshot input is not a regular file: ${name}`);
    bytes += before.size;
    if (bytes > 256 * 1024 * 1024 || inputs.length >= 10000) throw new SnapshotError('capture_limit', 'Snapshot exceeds 10000 files or 256 MiB; use a bounded documentation project.');
    const content = await readFile(file);
    const after = await stat(file);
    if (before.ino !== after.ino || before.size !== after.size || before.mtimeMs !== after.mtimeMs || before.mode !== after.mode) throw new SnapshotError('stale_input', `Input changed while reading: ${name}`);
    buffers.set(name, content);
    inputs.push({ file: name, digest: sha256(content), mode: before.mode & 0o777 });
  };
  const walk = async (directory: string) => {
    await noSymlinks(directory, path.dirname(root));
    for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.join(directory, entry.name);
      if (excluded(entry.name)) { exclusions.push({ file: path.relative(root, file), reason: 'Generated, dependency, harness or credential files are excluded from source capture.' }); continue; }
      if (entry.isDirectory()) await walk(file);
      else await add(file);
    }
  };
  await walk(root);
  for (const file of externalFiles) await add(relativeInput(root, file));
  for (const directory of externalDirectories) await walk(relativeInput(root, directory));
  inputs.sort((a, b) => a.file.localeCompare(b.file));
  exclusions.sort((a, b) => a.file.localeCompare(b.file));
  return { inputs, buffers, excluded: exclusions };
}

/** Capture static, project-owned inputs without running compiler/plugins/checks. */
export async function captureSnapshotInputs(configFile: string, options: { profile?: string } = {}): Promise<SnapshotCapture> {
  const config = await realpath(path.resolve(configFile));
  const root = path.dirname(config);
  const externalFiles = new Set<string>(), externalDirectories = new Set<string>();
  const profileFile = options.profile ? await realpath(path.resolve(options.profile)) : undefined;
  let profile: ProfileCapture | undefined;
  const profileDependencies = new Set<string>();
  let configDigest: string | undefined;
  let loaded: Awaited<ReturnType<typeof loadConfig>> | undefined;
  try { loaded = await loadConfig(config, { profile: profileFile }); configDigest = loaded.digest; }
  catch { /* Invalid configuration must still be captured and diagnosed in isolation. */ }
  if (profileFile) {
    const directory = `../.shoalrun-profile-${sha256(profileFile).slice(0, 16)}`;
    profile = { file: `${directory}/${path.basename(profileFile)}`, sources: {} };
    for (const source of [profileFile, ...(loaded?.deployment?.assetFiles ?? [])]) {
      profileDependencies.add(source);
      profile.sources[`${directory}/${path.relative(path.dirname(profileFile), source)}`] = source;
    }
  }
  const addExternal = async (absolute: string) => {
    if (profileDependencies.has(absolute)) return;
    if (isWithin(root, absolute)) return;
    const name = path.relative(root, absolute);
    relativeInput(root, name);
    await noSymlinks(absolute, path.dirname(root));
    const info = await lstat(absolute).catch(error => { if (error.code === 'ENOENT') return undefined; throw error; });
    if (info?.isDirectory()) externalDirectories.add(name);
    else if (info?.isFile()) externalFiles.add(name);
  };
  for (const file of loaded?.dependencies ?? []) await addExternal(file);
  // Commands run from the configuration directory. Their declared local inputs
  // use that same base; never infer dependencies by interpreting command text.
  let checks: ReturnType<typeof parseAuditSettings> | undefined;
  try { checks = parseAuditSettings(loaded?.value.audit); } catch { /* Validation diagnoses malformed audit settings. */ }
  for (const check of checks?.tests ?? []) for (const input of check.inputs ?? []) {
    const absolute = relativeInput(root, input);
    if (path.relative(root, absolute).split(path.sep).some(excluded)) throw new SnapshotError('unsupported_dependency', `Check input is in an excluded location: ${input}`);
    await noSymlinks(absolute, path.dirname(root));
    if (!await stat(absolute).then(() => true, () => false)) throw new SnapshotError('unsupported_dependency', `Declared check input is missing: ${input}`);
    await addExternal(absolute);
  }
  if (loaded) {
    const visit = async (value: any, segments: string[]) => {
      if (value && typeof value === 'object') {
        for (const key of Object.keys(value)) await visit(value[key], [...segments, key]);
      } else if (typeof value === 'string' && (['file', 'path', 'module', 'manifest', 'customCss', 'customReaderModule', 'body', 'template', 'favicon', 'logo'].includes(segments.at(-1)!) || segments.at(-2) === 'files' || (segments[0] === 'outputs' && segments[1] === 'html' && segments[2] === 'highlighting' && segments.at(-1) === 'grammar')) && !/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(value)) {
        if (path.isAbsolute(value)) throw new SnapshotError('unsupported_dependency', `Absolute dependency at ${segments.join('.')} cannot be isolated; use a relative path.`);
        if (segments[0] === 'components' && segments.at(-1) === 'module' && !value.startsWith('.')) return;
        const owner = explainSegments(loaded!, segments).source.file;
        await addExternal(path.resolve(path.dirname(owner), value));
      }
    };
    for (const [key, value] of Object.entries(loaded.value)) if (!['authoring', 'audit', 'site', 'publications', 'navigation', 'relationships'].includes(key)) await visit(value, [key]);
    await visit(loaded.value.site, ['site']);
  }
  if (loaded) for (const file of await componentPluginFiles(loaded)) {
    relativeInput(root, path.relative(root, file));
    externalFiles.add(path.relative(root, file));
  }
  const captured = await collectSnapshotInputs(root, [...externalFiles], [...externalDirectories]);
  // Walkthrough source locations are relative to their authored file. Capture
  // referenced sibling sources while retaining the established parent boundary.
  for (const [file, content] of captured.buffers) if (/\.mdx?$/.test(file)) {
    if (isWithin(path.resolve(root, (loaded?.value.site as any)?.contentDir ?? 'content'), path.resolve(root, file))) {
      let image: unknown;
      try { image = (await readDocument(path.resolve(root, file), loaded?.value.frontmatter, undefined, content.toString('utf8'))).frontmatter.image; } catch { /* Compiler reports invalid metadata. */ }
      if (typeof image === 'string') {
        if (path.isAbsolute(image)) throw new SnapshotError('unsupported_dependency', `Absolute page image dependency in ${file}`);
        await addExternal(path.resolve(path.dirname(path.resolve(root, file)), image));
      }
    }
    const body = content.toString('utf8').replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
    let tree: any;
    try { tree = parse.parse(body); } catch { continue; }
    const visit = async (node: any) => {
      if (node.name === 'Step' || node.name === 'Walkthrough') for (const attribute of node.attributes ?? []) if (attribute.name === 'file' && typeof attribute.value === 'string') {
        if (path.isAbsolute(attribute.value)) throw new SnapshotError('unsupported_dependency', `Absolute walkthrough dependency in ${file}`);
        await addExternal(path.resolve(path.dirname(path.resolve(root, file)), attribute.value));
      }
      for (const child of node.children ?? []) await visit(child);
    };
    await visit(tree);
  }
  const complete = await collectSnapshotInputs(root, [...externalFiles], [...externalDirectories]);
  for (const input of captured.inputs) if (complete.inputs.find(item => item.file === input.file)?.digest !== input.digest) throw new SnapshotError('stale_input', `Input changed during dependency discovery: ${input.file}`);
  for (const [file, source] of Object.entries(profile?.sources ?? {})) {
    relativeInput(root, file);
    const input = await readProfileInput(source);
    complete.buffers.set(file, input.bytes);
    complete.inputs.push({ file, digest: input.digest, mode: input.mode });
  }
  complete.inputs.sort((a, b) => a.file.localeCompare(b.file));
  return { root, config: path.basename(config), ...complete, externalDirectories: [...externalDirectories].sort(), configDigest, ...(profile ? { profile } : {}) };
}

export async function confirmSnapshotInputs(capture: Pick<SnapshotCapture, 'root' | 'inputs' | 'externalDirectories' | 'profile'>) {
  const sources = capture.profile?.sources ?? {};
  const ordinary = capture.inputs.filter(input => !Object.hasOwn(sources, input.file));
  const external = ordinary.filter(input => (!isWithin(capture.root, path.resolve(capture.root, input.file)) || input.file.split(path.sep).some(excluded))).map(input => input.file);
  try {
    validateProfileCapture(capture.root, capture.profile);
    const now = await collectSnapshotInputs(capture.root, external, capture.externalDirectories);
    for (const [file, source] of Object.entries(sources)) {
      relativeInput(capture.root, file);
      const input = await readProfileInput(source);
      now.inputs.push({ file, digest: input.digest, mode: input.mode });
    }
    now.inputs.sort((a, b) => a.file.localeCompare(b.file));
    return JSON.stringify(now.inputs) === JSON.stringify(capture.inputs);
  } catch { return false; }
}

export async function captureAuthoringBaseline(configFile: string, options: { profile?: string } = {}): Promise<AuthoringBaseline> {
  const capture = await captureSnapshotInputs(configFile, options);
  if (!await confirmSnapshotInputs(capture)) throw new SnapshotError('stale_input', 'Working tree changed while capturing the task baseline; retry.');
  return { profile: capture.profile, schemaVersion: 1, kind: 'shoalrun-authoring-baseline', project: capture.root, config: capture.config, inputs: capture.inputs, externalDirectories: capture.externalDirectories, excluded: capture.excluded, digest: sha256(JSON.stringify(capture.inputs)) };
}

export function parseAuthoringBaseline(value: unknown, root: string, config: string): AuthoringBaseline {
  const baseline = value as AuthoringBaseline;
  if (!baseline || baseline.schemaVersion !== 1 || baseline.kind !== 'shoalrun-authoring-baseline' || baseline.project !== root || baseline.config !== config || !Array.isArray(baseline.inputs) || !Array.isArray(baseline.externalDirectories) || !Array.isArray(baseline.excluded)) throw new SnapshotError('invalid_input', 'Baseline must be a version-1 task baseline for this project/configuration.');
  validateProfileCapture(root, baseline.profile);
  const seen = new Set<string>();
  for (const directory of baseline.externalDirectories) relativeInput(root, directory);
  for (const input of baseline.inputs) {
    if (!input || typeof input !== 'object') throw new SnapshotError('invalid_input', 'Invalid baseline input');
    relativeInput(root, input.file);
    if (!/^[a-f0-9]{64}$/.test(input.digest) || !Number.isInteger(input.mode) || input.mode < 0 || input.mode > 0o777 || seen.has(input.file)) throw new SnapshotError('invalid_input', 'Invalid or duplicate baseline input');
    seen.add(input.file);
  }
  if (baseline.digest !== sha256(JSON.stringify(baseline.inputs))) throw new SnapshotError('invalid_input', 'Baseline integrity digest does not match its inputs');
  return baseline;
}

export async function validatorInputs() {
  const records: SnapshotInput[] = [];
  const walk = async (directory: string) => {
    for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(file);
      else if (!entry.name.endsWith('.test.js')) records.push({ file, digest: sha256(await readFile(file)), mode: (await stat(file)).mode & 0o777 });
    }
  };
  for (const directory of ['dist', 'assets', 'styles', 'templates']) await walk(path.join(framework, directory));
  for (const file of ['package.json', 'package-lock.json']) {
    const absolute = path.join(framework, file);
    try { records.push({ file: absolute, digest: sha256(await readFile(absolute)), mode: 0 }); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  }
  const renderer = process.env.PUPPETEER_EXECUTABLE_PATH;
  const rendererStat = renderer ? await stat(renderer).then(info => ({ size: info.size, mtime: info.mtimeMs }), () => null) : undefined;
  return { digest: sha256(JSON.stringify([process.version, { renderer, rendererStat, cache: process.env.PUPPETEER_CACHE_DIR }, records])), records };
}

/** Artifact destinations are exclusive and cannot collide with source inputs. */
export async function authoringArtifactPath(root: string, destination: string) {
  const canonical = async (file: string): Promise<string> => {
    try { return await realpath(file); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      const parent = path.dirname(file);
      if (parent === file) return file;
      return path.join(await canonical(parent), path.basename(file));
    }
  };
  const target = await canonical(path.resolve(destination));
  if (target === root || isWithin(root, target) && !isWithin(path.join(root, '.shoalrun'), target)) throw new SnapshotError('unsafe_path', 'Artifacts must be outside the project or inside .shoalrun');
  await noSymlinks(target, path.parse(target).root);
  return target;
}

export async function writeAuthoringBaseline(configFile: string, output: string, options: { profile?: string } = {}) {
  const baseline = await captureAuthoringBaseline(configFile, options);
  const target = await authoringArtifactPath(baseline.project, output);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, JSON.stringify(baseline, null, 2) + '\n', { flag: 'wx' });
  return { schemaVersion: 1, status: 'ok', baseline: target, digest: baseline.digest, files: baseline.inputs.length, excluded: baseline.excluded };
}
