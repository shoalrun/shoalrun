import { validateAuthoringGuidance } from './authoring-guidance.js';
import { createHash, randomUUID } from 'node:crypto';
import { chmod, cp, link, lstat, mkdir, mkdtemp, readFile, readdir, realpath, rename, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from './compiler.js';
import { explainSegments, loadConfig } from './config.js';
import { readDocument } from './content.js';

type Edit = { file: string; content: string; baseDigest: string; operation?: undefined; expectedAbsent?: undefined } | { file: string; content: string; operation: 'create'; expectedAbsent: true; baseDigest?: undefined };
type Plan = { schemaVersion: 1 | 2; kind: 'shoalrun-docs-edit'; config: string; edits: Edit[] };
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const inside = (root: string, file: string) => {
  const relative = path.relative(root, file);
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
};
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

async function project(configFile: string) {
  const config = await realpath(path.resolve(configFile));
  const root = path.dirname(config);
  const loaded = await loadConfig(config);
  const content = path.resolve(root, String((loaded.value.site as any)?.contentDir ?? 'content'));
  if (!inside(root, content)) throw new Error('Agent authoring needs a content directory inside the config directory');
  return { config, root, loaded, content };
}

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async entry => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(file);
    return entry.isFile() && /\.mdx?$/.test(entry.name) ? [file] : [];
  }));
  return nested.flat();
}

export async function docsContext(id: string, configFile: string) {
  if (!id) throw new Error('docs context needs a document ID');
  const { root, loaded, content } = await project(configFile);
  const files = await sourceFiles(content);
  const matches = [];
  for (const file of files) {
    const doc = await readDocument(file, loaded.value.frontmatter);
    if (doc.frontmatter.id === id) matches.push({ file: path.relative(root, file), baseDigest: digest(await readFile(file, 'utf8')), title: doc.frontmatter.title, slug: doc.frontmatter.slug, channel: doc.frontmatter.channel, version: doc.frontmatter.version, language: doc.frontmatter.language, access: doc.frontmatter.access });
  }
  if (!matches.length) throw new Error(`No authored document with ID ${id}`);
  const owner = (key: string) => {
    try { return path.relative(root, explainSegments(loaded, [key]).source.file); }
    catch { return undefined; }
  };
  const relationships = Array.isArray(loaded.value.relationships) ? loaded.value.relationships.flatMap((edge: any, index: number) => edge.from === id || edge.to === id ? [{ ...edge, source: (() => {
    try { return path.relative(root, explainSegments(loaded, ['relationships', String(index)]).source.file); }
    catch { return owner('relationships'); }
  })() }] : []) : [];
  const navigation: Array<{ id: string; source: string }> = [];
  const walk = (nodes: any[], segments: string[]): void => {
    for (let index = 0; index < nodes.length; index++) {
      const node = nodes[index];
      const at = [...segments, String(index)];
      if (node.doc === id) navigation.push({ id: node.id, source: path.relative(root, explainSegments(loaded, at).source.file) });
      if (Array.isArray(node.items)) walk(node.items, [...at, 'items']);
    }
  };
  if (Array.isArray(loaded.value.navigation)) walk(loaded.value.navigation, ['navigation']);
  return { status: 'ok', id, project: root, sources: matches, navigation, relationships, authoring: validateAuthoringGuidance(loaded.value.authoring), configOwners: { authoring: owner('authoring'), navigation: owner('navigation'), relationships: owner('relationships') }, configDependencies: loaded.dependencies.map(file => path.relative(root, file)) };
}

async function allowedFile(file: string, context: Awaited<ReturnType<typeof project>>, create = false) {
  if (path.isAbsolute(file) || !file || file.split(/[\\/]/).includes('..')) throw new Error(`Edit path must be project-relative: ${file}`);
  const target = path.resolve(context.root, file);
  if (!inside(context.root, target)) throw new Error(`Edit path escapes project: ${file}`);
  if (create) {
    if (!inside(context.content, target) || !/\.mdx?$/.test(target)) throw new Error(`Creation target must be an authored page: ${file}`);
    // Check every existing ancestor, including dangling symlinks. Never resolve an
    // absent path via realpath or create placeholder files in the live project.
    let current = context.root;
    for (const part of path.relative(context.root, target).split(path.sep)) {
      current = path.join(current, part);
      const info = await lstat(current).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
      if (!info) continue;
      if (info.isSymbolicLink()) throw new Error(`Creation through symlinks is not supported: ${file}`);
      if (current === target) throw new Error(`Creation collision: ${file} already exists`);
      if (!info.isDirectory()) throw new Error(`Creation ancestor must be a directory: ${file}`);
    }
    return { target, file: path.relative(context.root, target) };
  }
  const actual = await realpath(target);
  if (actual !== target) throw new Error(`Edits through symlinks are not supported: ${file}`);
  const info = await lstat(target);
  if (!info.isFile()) throw new Error(`Edit target must be an existing regular file: ${file}`);
  const inContent = inside(context.content, target) && /\.mdx?$/.test(target);
  const inConfig = context.loaded.dependencies.includes(target) && /\.ya?ml$/.test(target);
  if (!inContent && !inConfig) throw new Error(`Edit target must be an authored page or loaded YAML config: ${file}`);
  return { target, file: path.relative(context.root, target) };
}

function parseEdits(value: unknown): Array<{ file: string; content: string; baseDigest?: string; operation?: 'create'; expectedAbsent?: true }> {
  if (!object(value) || !Array.isArray(value.edits) || !value.edits.length) throw new Error('Edit request needs a nonempty edits list');
  if (Object.keys(value).some(key => key !== 'edits')) throw new Error('Edit request accepts only edits');
  return value.edits.map((item: unknown) => {
    if (!object(item) || Object.keys(item).some(key => !['file', 'content', 'baseDigest', 'operation', 'expectedAbsent'].includes(key)) || typeof item.file !== 'string' || typeof item.content !== 'string') throw new Error('Each edit needs file and full replacement content');
    if (item.operation !== undefined && item.operation !== 'create' || item.operation === 'create' && (item.expectedAbsent !== true || item.baseDigest !== undefined) || item.operation === undefined && item.expectedAbsent !== undefined) throw new Error('Creation requires operation=create, expectedAbsent=true and no baseDigest');
    if (item.baseDigest !== undefined && (typeof item.baseDigest !== 'string' || !/^[a-f0-9]{64}$/.test(item.baseDigest))) throw new Error('Edit baseDigest must be a SHA-256 digest');
    return { file: item.file, content: item.content, baseDigest: item.baseDigest as string | undefined, ...(item.operation === 'create' ? { operation: 'create' as const, expectedAbsent: true as const } : {}) };
  });
}

export async function docsPlan(requestFile: string, configFile: string, outputFile: string) {
  const context = await project(configFile);
  const requested = parseEdits(JSON.parse(await readFile(requestFile, 'utf8')));
  const seen = new Set<string>();
  const edits: Edit[] = [];
  for (const item of requested) {
    const { target, file } = await allowedFile(item.file, context, item.operation === 'create');
    if (seen.has(file)) throw new Error(`Duplicate edit target ${file}`);
    seen.add(file);
    if (item.operation === 'create') { edits.push({ file, content: item.content, operation: 'create', expectedAbsent: true }); continue; }
    const original = await readFile(target, 'utf8');
    if (item.baseDigest !== undefined && digest(original) !== item.baseDigest) throw new Error(`Stale draft for ${file}: source changed since drafting began`);
    if (original === item.content) throw new Error(`Edit does not change ${file}`);
    edits.push({ file, content: item.content, baseDigest: digest(original) });
  }
  const plan: Plan = { schemaVersion: edits.some(edit => edit.operation === 'create') ? 2 : 1, kind: 'shoalrun-docs-edit', config: path.basename(context.config), edits };
  await writeFile(outputFile, JSON.stringify(plan, null, 2) + '\n', { flag: 'wx' });
  return { status: 'ok', plan: path.resolve(outputFile), files: edits.map(edit => ({ file: edit.file, baseDigest: edit.baseDigest, nextDigest: digest(edit.content) })) };
}

function parsePlan(value: unknown): Plan {
  if (!object(value) || ![1, 2].includes(value.schemaVersion as number) || value.kind !== 'shoalrun-docs-edit' || typeof value.config !== 'string' || !Array.isArray(value.edits) || !value.edits.length || Object.keys(value).some(key => !['schemaVersion', 'kind', 'config', 'edits'].includes(key))) throw new Error('Invalid Shoalrun docs edit plan');
  parseEdits({ edits: value.edits });
  for (const edit of value.edits) {
    if (edit.operation === 'create') { if (value.schemaVersion !== 2) throw new Error('Creation requires plan schema version 2'); }
    else if (typeof edit.baseDigest !== 'string' || !/^[a-f0-9]{64}$/.test(edit.baseDigest)) throw new Error('Invalid plan edit');
  }
  return value as Plan;
}

async function validatePlan(plan: Plan, context: Awaited<ReturnType<typeof project>>) {
  const seen = new Set<string>();
  const targets = [];
  for (const edit of plan.edits) {
    const { target, file } = await allowedFile(edit.file, context, edit.operation === 'create');
    if (seen.has(file)) throw new Error(`Duplicate edit target ${file}`);
    seen.add(file);
    if (edit.operation === 'create') { targets.push({ target, ...edit }); continue; }
    const actual = digest(await readFile(target, 'utf8'));
    if (actual !== edit.baseDigest) throw new Error(`Stale plan for ${file}: source changed since the plan was created`);
    targets.push({ target, file, content: edit.content, baseDigest: edit.baseDigest, operation: undefined });
  }
  return targets;
}

type TransactionTarget = { target: string; file: string; content: string; operation?: 'create'; baseDigest?: string };

// Internal transaction primitive; tests inject a filesystem failure at the commit
// boundary. The public docsApply path supplies its sandbox/path validator.
export async function commitAuthoringFiles(targets: TransactionTarget[], validateCreate: (target: TransactionTarget) => Promise<unknown>, io = { link, rename }) {
  const transaction = randomUUID();
  const retainedBackups = new Set<string>();
  const prepared: Array<{ target: string; next: string; backup: string; applied: boolean; create: boolean }> = [];
  try {
    for (const item of targets) {
      const next = `${item.target}.shoalrun-next-${transaction}`;
      const backup = `${item.target}.shoalrun-backup-${transaction}`;
      if (item.operation === 'create') {
        await validateCreate(item);
        await mkdir(path.dirname(item.target), { recursive: true });
        await validateCreate(item);
      }
      await writeFile(next, item.content, { flag: 'wx' });
      prepared.push({ target: item.target, next, backup, applied: false, create: item.operation === 'create' });
      if (item.operation === 'create') continue;
      await chmod(next, (await lstat(item.target)).mode);
      await cp(item.target, backup, { errorOnExist: true, force: false });
    }
    for (const item of prepared) {
      if (item.create) {
        await validateCreate(targets.find(target => target.target === item.target)!);
        // link is exclusive: a concurrent creation must never be overwritten.
        await io.link(item.next, item.target);
        item.applied = true;
        continue;
      }
      const expected = targets.find(target => target.target === item.target)!.baseDigest;
      if (digest(await readFile(item.target, 'utf8')) !== expected) throw new Error(`Source changed during apply: ${item.target}`);
      await io.rename(item.next, item.target);
      item.applied = true;
    }
  } catch (error) {
    const rollbackErrors: unknown[] = [];
    for (const item of [...prepared].reverse()) {
      if (!item.applied) continue;
      try {
        if (item.create) await rm(item.target);
        else await io.rename(item.backup, item.target);
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
        if (!item.create) retainedBackups.add(item.backup);
      }
    }
    if (rollbackErrors.length) throw new AggregateError([error, ...rollbackErrors], `Application failed and rollback needs recovery. Retained backups: ${[...retainedBackups].join(', ') || 'none; inspect created targets'}`);
    throw error;
  } finally {
    for (const item of prepared) {
      await rm(item.next, { force: true });
      if (!retainedBackups.has(item.backup)) await rm(item.backup, { force: true });
    }
  }
}

export type DocsCheckOptions = { previewDirectory?: string; excludeDirectories?: string[] };

export async function docsApply(planFile: string, configFile: string, checkOnly: boolean, options: DocsCheckOptions = {}) {
  if (!checkOnly && options.previewDirectory) throw new Error('A retained preview is only available when checking a plan');
  const context = await project(configFile);
  const plan = parsePlan(JSON.parse(await readFile(planFile, 'utf8')));
  if (plan.config !== path.basename(context.config)) throw new Error(`Plan is for ${plan.config}, not ${path.basename(context.config)}`);
  const targets = await validatePlan(plan, context);
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-docs-edit-'));
  try {
    let before: Awaited<ReturnType<typeof compile>> | undefined;
    let baselineError: string | undefined;
    let dependencySource: Awaited<ReturnType<typeof compile>>;
    try {
      before = await compile(context.config);
      dependencySource = before;
    } catch (error) {
      // A broken original page must not prevent checking its proposed repair.
      // Compile authored replacements in memory to discover the same bounded
      // dependency layout, then still validate the actual staged site below.
      baselineError = (error instanceof Error ? error.message : String(error)).slice(0, 500);
      const overrides = new Map(targets.filter(target => /\.mdx?$/.test(target.file)).map(target => [target.target, target.content]));
      if (!overrides.size) throw error;
      dependencySource = await compile(context.config, undefined, {}, { sourceOverrides: overrides });
    }
    // Discover dependencies introduced by new pages without materializing them
    // in the source project. Changed configuration is validated in the shadow.
    const candidateSources = new Map(targets.filter(target => /\.mdx?$/.test(target.file)).map(target => [target.target, target.content]));
    if (candidateSources.size) {
      try {
        const candidateDependencies = await compile(context.config, undefined, {}, { sourceOverrides: candidateSources });
        dependencySource = { ...dependencySource, dependencies: [...new Set([...dependencySource.dependencies, ...candidateDependencies.dependencies])] };
      } catch {
        // The proposed YAML may be needed for the replacements to compile.
        // Preserve known dependencies and let the exact staged build report errors.
      }
    }
    const shadow = path.join(temporary, 'project');
    const ignored = new Set(['.git', 'node_modules', 'dist', 'site-dist', '.vercel', '.shoalrun', '.private-archives', '.private-evals']);
    await cp(context.root, shadow, { recursive: true, filter: source => {
      const relative = path.relative(context.root, source);
      const excluded = options.excludeDirectories?.some(directory => source === path.resolve(directory) || inside(path.resolve(directory), source));
      return !excluded && (!relative || !ignored.has(relative.split(path.sep)[0]));
    } });
    // Configured sources can live beside the project (for example a shared OpenAPI file).
    // Preserve that relative layout while keeping the temporary copy bounded to one parent.
    const parent = path.dirname(context.root);
    const frameworkRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    const packageRoot = await realpath(path.join(frameworkRoot, 'node_modules')).catch(() => undefined);
    for (const dependency of dependencySource.dependencies) {
      if (inside(context.root, dependency) || dependency === context.root) continue;
      if (!inside(parent, dependency)) {
        if (inside(frameworkRoot, dependency) || (packageRoot && inside(packageRoot, dependency))) continue;
        throw new Error(`Cannot stage dependency outside the project parent: ${dependency}`);
      }
      const destination = path.join(temporary, path.relative(parent, dependency));
      await mkdir(path.dirname(destination), { recursive: true });
      await cp(dependency, destination, { errorOnExist: true, force: false });
    }
    // Walkthrough file references use the repository boundary; the staging parent
    // holds only compiler-declared files from that boundary.
    if (await lstat(path.join(parent, '.git')).then(() => true, () => false)) await mkdir(path.join(temporary, '.git'));
    for (const target of targets) {
      const staged = path.join(shadow, target.file);
      await mkdir(path.dirname(staged), { recursive: true });
      await writeFile(staged, target.content);
    }
    const stagedConfig = path.join(shadow, path.basename(context.config));
    const result = await compile(stagedConfig, path.join(temporary, 'site'));
    // Draft access can exclude an authored candidate from the ordinary build.
    // Render all proposed pages in an isolated override, while keeping the exact
    // plan's publication/access fields for application.
    const { parse, stringify } = await import('yaml');
    const overrides = new Map<string, string>();
    const candidateIds: string[] = [];
    for (const target of targets.filter(item => /\.mdx?$/.test(item.file))) {
      const match = target.content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
      if (!match) throw new Error(`Candidate requires frontmatter: ${target.file}`);
      const metadata = parse(match[1]);
      candidateIds.push(metadata.id);
      metadata.access = { policy: 'public' };
      overrides.set(path.join(shadow, target.file), `---\n${stringify(metadata)}---\n${target.content.slice(match[0].length)}`);
    }
    if (overrides.size) {
      const rendered = await compile(stagedConfig, path.join(temporary, 'site'), {}, { sourceOverrides: overrides });
      for (const id of candidateIds) if (!rendered.documents.some(doc => doc.id === id)) throw new Error(`Candidate excluded from rendering: ${id}`);
    }

    const key = (doc: (typeof result.documents)[number]) => `${doc.id}|${doc.variant.channel}|${doc.variant.version}|${doc.variant.language}`;
    const oldDocs = new Map(before?.documents.map(doc => [key(doc), doc]) ?? []);
    const newDocs = new Map(result.documents.map(doc => [key(doc), doc]));
    const affected = [...new Set([...oldDocs.keys(), ...newDocs.keys()])].filter(id => {
      const oldDoc = oldDocs.get(id);
      const newDoc = newDocs.get(id);
      return !oldDoc || !newDoc || JSON.stringify(oldDoc) !== JSON.stringify(newDoc);
    }).map(id => ({ id, before: oldDocs.get(id)?.url, after: newDocs.get(id)?.url, markdown: newDocs.get(id)?.markdownUrl }));
    const summary = { files: targets.map(target => target.file), documents: result.documents.length, affected, ...(baselineError ? { baselineValid: false, baselineError, affectedScope: 'all candidate documents; original build unavailable' } : {}) };
    if (checkOnly) {
      await validatePlan(plan, context);
      if (options.previewDirectory) {
        // The caller owns the destination; never overwrite an earlier preview.
        await mkdir(options.previewDirectory);
        for (const entry of await readdir(path.join(temporary, 'site'))) {
          await cp(path.join(temporary, 'site', entry), path.join(options.previewDirectory, entry), { recursive: true, force: false, errorOnExist: true });
        }
      }
      return { status: 'ok', checked: true, ...summary, ...(options.previewDirectory ? { preview: path.resolve(options.previewDirectory) } : {}) };
    }
    await validatePlan(plan, context);
    await commitAuthoringFiles(targets, item => allowedFile(item.file, context, true));
    return { status: 'ok', checked: true, applied: true, ...summary };
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}
