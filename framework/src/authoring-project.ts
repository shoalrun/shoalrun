import { authoringHints } from './authoring-hints.js';
import { createHash } from 'node:crypto';
import { readFile, readdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateAuthoringGuidance } from './authoring-guidance.js';
import { explainSegments, loadConfig } from './config.js';
import { readDocument } from './content-source.js';
import { defaultLanguage } from './frontmatter.js';
import { documentationTokens } from './documentation-core.js';
import { builtinAuthoringTemplates } from './scaffold.js';
import { phraseMatches, queryUnits, validateSearchSynonyms } from './search-synonyms.js';

export const projectToolSchemaVersion = 1;
export const projectSections = ['pages', 'guidance', 'configuration', 'navigation', 'relationships', 'templates', 'findings'] as const;
export type ProjectSection = typeof projectSections[number];
export type ProjectOptions = { section?: ProjectSection; id?: string; file?: string; query?: string; offset?: number; limit?: number; maxTokens?: number };
export type ProjectFinding = { code: string; severity: 'error' | 'warning' | 'review-needed'; file?: string; location?: string; explanation: string; nextAction: string; reference?: string };
export class ProjectToolError extends Error {
  constructor(public readonly code: 'invalid_input' | 'unknown_source' | 'unsafe_path' | 'invalid_project' | 'internal_error', message: string) { super(message); }
}
export const projectToolFailure = (error: unknown) => ({ schemaVersion: projectToolSchemaVersion, status: 'error' as const, error: { code: error instanceof ProjectToolError ? error.code : 'internal_error', message: error instanceof Error ? error.message : 'Project inspection failed' } });
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const inside = (root: string, file: string) => file.startsWith(root + path.sep);
const templatesRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../templates');

function integer(value: number | undefined, fallback: number, min: number, max: number, name: string) {
  const result = value ?? fallback;
  if (!Number.isSafeInteger(result) || result < min || result > max) throw new ProjectToolError('invalid_input', `${name} must be an integer from ${min} to ${max}`);
  return result;
}
function text(value: string | undefined, name: string) {
  if (value !== undefined && (typeof value !== 'string' || !value.trim() || value.length > 512)) throw new ProjectToolError('invalid_input', `${name} must be nonempty text of at most 512 characters`);
}
function budget<T extends object>(data: T, maxTokens: number, truncated: boolean) {
  const result = { ...data, budget: { maxTokens, encoding: 'cl100k_base', tokens: maxTokens, truncated } };
  // Count the serialized envelope too, conservatively reserving count digits.
  result.budget.tokens = documentationTokens(JSON.stringify(result));
  for (let i = 0; i < 8; i++) {
    const actual = documentationTokens(JSON.stringify(result));
    if (actual <= result.budget.tokens) break;
    result.budget.tokens = actual;
  }
  return result;
}
async function safeFile(root: string, file: string) {
  if (!file || path.isAbsolute(file) || /[\\\0\r\n]/.test(file) || file.split('/').includes('..')) throw new ProjectToolError('unsafe_path', 'Source paths must stay project-relative');
  let actual: string;
  try { actual = await realpath(path.resolve(root, file)); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new ProjectToolError('unknown_source', `Source not found: ${file}`); throw error; }
  if (!inside(root, actual)) throw new ProjectToolError('unsafe_path', `Source escapes project: ${file}`);
  return actual;
}
async function openProject(configFile: string) {
  try {
    const config = await realpath(path.resolve(configFile));
    const root = path.dirname(config);
    const loaded = await loadConfig(config);
    const guidance = validateAuthoringGuidance(loaded.value.authoring);
    return { config, root, loaded, guidance };
  } catch (error) {
    throw new ProjectToolError('invalid_project', `Cannot load project configuration: ${(error as Error).message}`);
  }
}

/** Read-only discovery of the current working tree, including unpublished pages.
 * Digests describe inspected inputs; this is not a validated snapshot. */
export async function inspectAuthoringProject(configFile: string, options: ProjectOptions = {}) {
  const section = options.section ?? 'pages';
  if (!projectSections.includes(section)) throw new ProjectToolError('invalid_input', `Unknown project section ${section}`);
  for (const key of ['id', 'file', 'query'] as const) text(options[key], key);
  if ([options.id, options.file, options.query].filter(value => value !== undefined).length > 1) throw new ProjectToolError('invalid_input', 'Select at most one of id, file or query');
  if ((options.id || options.file || options.query) && !['pages', 'navigation', 'relationships'].includes(section)) throw new ProjectToolError('invalid_input', 'Selectors apply to pages, navigation or relationships');
  const offset = integer(options.offset, 0, 0, Number.MAX_SAFE_INTEGER, 'offset');
  const limit = integer(options.limit, 20, 1, 100, 'limit');
  const maxTokens = integer(options.maxTokens, 8192, 1024, 100000, 'maxTokens');
  const { root, config, loaded, guidance } = await openProject(configFile);
  const value: any = loaded.value;
  const relative = (file: string) => path.relative(root, file);
  const digests = new Map<string, string>();
  const source = async (segments: string[]) => {
    const owner = explainSegments(loaded, segments).source;
    if (!digests.has(owner.file)) digests.set(owner.file, digest(await readFile(owner.file, 'utf8')));
    return { file: relative(owner.file), location: segments.join('.'), digest: digests.get(owner.file), role: 'configuration', applicability: 'configured-value' };
  };
  const findings: ProjectFinding[] = [];
  const pages: Array<Record<string, any>> = [];
  const bodies = new Map<string, string>();
  const instructions: string[] = [];
  const walk = async (directory: string) => {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        findings.push({ code: 'project.symlink-skipped', severity: 'warning', file: relative(file), explanation: 'Discovery does not follow content symlinks.', nextAction: 'Inspect this source with the harness and use regular authored files for project discovery.' });
      } else if (entry.isDirectory()) await walk(file);
      else if (entry.isFile() && entry.name === 'AGENTS.md') instructions.push(relative(file));
      else if (entry.isFile() && /\.mdx?$/.test(entry.name)) {
        const raw = await readFile(file, 'utf8');
        try {
          const doc = await readDocument(file, value.frontmatter, undefined, raw);
          const fm = doc.frontmatter;
          pages.push({ id: fm.id, file: relative(file), digest: digest(raw), title: fm.title, summary: fm.summary, type: fm.type, slug: fm.slug,
            publication: { channel: fm.channel ?? value.publications?.defaults?.channel, version: fm.version ?? value.publications?.defaults?.version, language: fm.language ?? defaultLanguage(value), ...(fm.publications ? { publications: fm.publications } : {}) },
            access: fm.access ?? null, aliases: [] });
          bodies.set(relative(file), doc.body);
          findings.push(...authoringHints(doc.body, relative(file)).map(({ location, ...hint }) => hint));
        } catch (error) {
          findings.push({ code: 'project.invalid-page', severity: 'error', file: relative(file), explanation: (error as Error).message, nextAction: 'Repair the page metadata and inspect again.', reference: 'guide.frontmatter' });
        }
      }
    }
  };
  const content = path.resolve(root, value.site?.contentDir ?? 'content');
  if (!inside(root, content)) throw new ProjectToolError('unsafe_path', 'Content directory must be inside the project');
  try {
    if (await realpath(content) !== content) throw new ProjectToolError('unsafe_path', 'Content directory must not use symlinks');
    await walk(content);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    findings.push({ code: 'project.missing-content', severity: 'warning', file: relative(content), explanation: 'No content directory exists yet.', nextAction: 'Create authored pages when the task requires them.' });
  }
  const byId = new Map<string, Array<Record<string, any>>>();
  for (const page of pages) byId.set(page.id, [...(byId.get(page.id) ?? []), page]);
  // Link-label aliases are leads, not identities or policy. Keep the experiment's
  // useful heuristic without its workflow dependency or prompt representation.
  for (const body of bodies.values()) for (const match of body.matchAll(/\[([^\]\n]+)\]\(doc:([^\s)#]+)(?:#[^)]*)?\)/g)) {
    for (const page of byId.get(match[2]) ?? []) if (match[1].length <= 100 && match[1] !== page.title && !page.aliases.includes(match[1]) && page.aliases.length < 5) page.aliases.push(match[1]);
  }
  const units = options.query ? queryUnits(options.query, validateSearchSynonyms(value.search?.synonyms)) : [];
  const selected = pages.map((page): Record<string, any> => {
    const labels = `${page.id} ${page.file} ${page.title} ${page.summary} ${page.aliases.join(' ')}`;
    const matched = units.filter(unit => [unit.term, ...unit.alternatives].some(term => phraseMatches(`${labels}\n${bodies.get(page.file)}`, term)));
    const score = matched.reduce((sum, unit) => sum + ([unit.term, ...unit.alternatives].some(term => phraseMatches(labels, term)) ? 2 : 1), 0);
    return { ...page, ...(options.query ? { matchedTerms: matched.map(unit => unit.term), score } : {}) };
  }).filter(page => (!options.id || page.id === options.id) && (!options.file || page.file === options.file) && (!options.query || page.score > 0))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.file.localeCompare(b.file));
  const selectedIds = new Set(selected.map(page => page.id));
  const guidanceEntries: Array<Record<string, any>> = [];
  // Policy for included configuration files can live outside content. Inspect
  // their ancestor directories too, without traversing dependencies/build output.
  const policyDirectories = new Set([root]);
  for (const file of loaded.dependencies) {
    let directory = path.dirname(file);
    while (inside(root, directory)) {
      policyDirectories.add(directory);
      directory = path.dirname(directory);
    }
  }
  for (const directory of policyDirectories) {
    const file = relative(path.join(directory, 'AGENTS.md'));
    try { await safeFile(root, file); instructions.unshift(file); }
    catch (error) { if (!(error instanceof ProjectToolError && error.code === 'unknown_source')) throw error; }
  }
  if (guidance?.directives) guidanceEntries.push({ kind: 'directives', text: guidance.directives, ...await source(['authoring', 'directives']), role: 'policy', applicability: 'project; interpretation requires author review' });
  for (const [role, files] of [['policy', instructions], ['style', guidance?.guideFiles ?? []], ['example', guidance?.exemplarFiles ?? []]] as const) {
    for (const file of [...new Set(files)]) {
      try {
        const actual = await safeFile(root, file);
        guidanceEntries.push({ kind: 'file', file, digest: digest(await readFile(actual, 'utf8')), role, applicability: role === 'policy' ? `directory scope: ${path.dirname(file)}` : 'project authoring guidance', read: { command: 'docs source', file } });
      } catch (error) {
        if (!(error instanceof ProjectToolError)) throw error;
        findings.push({ code: 'project.guidance-unavailable', severity: 'review-needed', file, explanation: error.message, nextAction: 'Locate or repair the declared guidance; ask the author about missing policy.' });
      }
    }
  }
  const policyStatus = guidanceEntries.some(entry => entry.role === 'policy') ? 'requires-interpretation' : 'missing';
  if (policyStatus === 'missing') findings.push({ code: 'project.policy-missing', severity: 'review-needed', explanation: 'No project AGENTS.md or authoring.directives was found. Guide files may contain additional policy.', nextAction: 'Read configured guides and ask the author about task-specific companion obligations; do not infer permission.' });
  const configuration: Array<Record<string, any>> = [];
  const leaves = async (at: any, segments: string[]) => {
    if (at && typeof at === 'object' && Object.keys(at).length) {
      for (const key of Object.keys(at)) await leaves(at[key], [...segments, key]);
    } else configuration.push({ value: at, ...await source(segments) });
  };
  for (const key of ['site', 'frontmatter', 'publications', 'authoring', 'audit', 'templates', 'search']) if (value[key] !== undefined) await leaves(value[key], [key]);
  const navigation: Array<Record<string, any>> = [];
  const nav = async (nodes: any[], segments: string[]) => {
    for (let index = 0; index < nodes.length; index++) {
      const node = nodes[index], at = [...segments, String(index)];
      const { items, ...fields } = node;
      if (!options.id && !options.file && !options.query || selectedIds.has(node.doc)) navigation.push({ ...fields, ...await source(at) });
      if (Array.isArray(items)) await nav(items, [...at, 'items']);
    }
  };
  if (Array.isArray(value.navigation)) await nav(value.navigation, ['navigation']);
  const relationships = [];
  for (let index = 0; index < (value.relationships ?? []).length; index++) {
    const edge = value.relationships[index];
    if (!options.id && !options.file && !options.query || selectedIds.has(edge.from) || selectedIds.has(edge.to)) relationships.push({ ...edge, ...await source(['relationships', String(index)]) });
  }
  const templates = [];
  for (const id of [...new Set([...Object.keys(builtinAuthoringTemplates), ...Object.keys(value.templates ?? {})])].sort()) {
    const local = value.templates?.[id], template = local ?? builtinAuthoringTemplates[id];
    templates.push({ id, ...template, source: local ? await source(['templates', id]) : { file: `templates/${template.body}`, role: 'syntax-reference', applicability: 'bundled scaffold template' },
      bodyFile: local ? relative(path.resolve(path.dirname(explainSegments(loaded, ['templates', id, 'body']).source.file), template.body)) : path.join(templatesRoot, template.body), reference: 'guide.templates' });
  }
  const collections = { pages: selected, guidance: guidanceEntries, configuration, navigation, relationships, templates, findings };
  const records = collections[section];
  const counts = Object.fromEntries(Object.entries(collections).map(([key, items]) => [key, items.length]));
  const summary = { project: root, config: relative(config), configDigest: loaded.digest, contentDir: relative(content), policyStatus,
    policyInterpretation: 'Read all applicable sources; conflicting prose requires author review. No companion obligation is inferred.',
    counts, capabilities: ['project-discovery', 'project-source-read', 'documentation-search-read'], references: ['guide.frontmatter', 'guide.frontmatter-reference', 'guide.add-page', 'guide.component.steps', 'guide.templates'],
    checks: { execution: 'not-run', configured: value.audit !== undefined, guidance: 'Inspect configuration section and project instructions; no shell commands are executed.' } };
  let entries = records.slice(offset, offset + limit);
  while (true) {
    const nextOffset = offset + entries.length < records.length ? offset + entries.length : null;
    const result = budget({ schemaVersion: projectToolSchemaVersion, kind: 'shoalrun-authoring-project', status: 'ok', summary, section, entries,
      pagination: { offset, limit, total: records.length, nextOffset }, coverage: { mode: 'working-tree-inspection', validation: 'not-run', findings: findings.length } }, maxTokens, nextOffset !== null);
    if (result.budget.tokens <= maxTokens) return result;
    if (!entries.length || entries.length === 1) throw new ProjectToolError('invalid_input', 'maxTokens is too small for this entry; increase the budget or use docs source for a bounded passage.');
    entries = entries.slice(0, -1);
  }
}

/** Exact project-relative passage; role is context, not evidence approval. */
export async function readAuthoringSource(configFile: string, file: string, options: { offset?: number; maxTokens?: number } = {}) {
  const offset = integer(options.offset, 0, 0, Number.MAX_SAFE_INTEGER, 'offset');
  const maxTokens = integer(options.maxTokens, 4096, 1024, 100000, 'maxTokens');
  const { root, loaded, guidance } = await openProject(configFile);
  const actual = await safeFile(root, file);
  const raw = await readFile(actual, 'utf8');
  const chars = [...raw];
  if (offset > chars.length) throw new ProjectToolError('invalid_input', 'offset exceeds source length');
  const role = loaded.dependencies.includes(actual) ? 'configuration' : path.basename(file) === 'AGENTS.md' ? 'policy' : guidance?.guideFiles?.includes(file) ? 'style' : guidance?.exemplarFiles?.includes(file) ? 'example' : Object.values(guidance?.pageSources ?? {}).flat().includes(file) ? 'technical-evidence' : 'unclassified';
  const metadata = { schemaVersion: projectToolSchemaVersion, kind: 'shoalrun-authoring-source', status: 'ok', file, digest: digest(raw), role,
    location: { offset, startLine: chars.slice(0, offset).filter(char => char === '\n').length + 1 }, applicability: 'Read source in context; editorial guidance and target pages cannot establish new technical claims.' };
  const candidate = (length: number) => budget({ ...metadata, content: chars.slice(offset, offset + length).join(''), nextOffset: offset + length < chars.length ? offset + length : null }, maxTokens, offset + length < chars.length);
  let low = 0, high = chars.length - offset;
  if (candidate(0).budget.tokens > maxTokens) throw new ProjectToolError('invalid_input', 'maxTokens is too small for source metadata');
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (candidate(middle).budget.tokens <= maxTokens) low = middle; else high = middle - 1;
  }
  if (!low && offset < chars.length) throw new ProjectToolError('invalid_input', 'maxTokens is too small for a source passage');
  return candidate(low);
}
