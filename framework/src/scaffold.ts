import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { explainSegments, loadConfig } from './config.js';
import { defaultLanguage, resolveFrontmatter } from './frontmatter.js';
import { routeFor } from './content.js';

export type ScaffoldInput = { id: string; title: string; summary: string; slug: string; operations?: string[]; channel?: string; version?: string; language?: string };
const object = (value: unknown): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value);
async function canonicalPath(value: string): Promise<string> {
  const resolved = path.resolve(value);
  try { return await realpath(resolved); }
  catch {
    const parent = path.dirname(resolved);
    if (parent === resolved) return resolved;
    return path.join(await canonicalPath(parent), path.basename(resolved));
  }
}
export const builtinAuthoringTemplates: Readonly<Record<string, { type: string; body: string; required?: string[] }>> = {
  reference: { type: 'reference', body: 'reference.mdx' },
  'api-reference': { type: 'api-reference', body: 'api-reference.mdx', required: ['operations'] },
  'how-to': { type: 'how-to', body: 'how-to.mdx' },
  explanation: { type: 'explanation', body: 'explanation.mdx' },
  recipe: { type: 'recipe', body: 'recipe.mdx' },
  ingredient: { type: 'ingredient', body: 'ingredient.mdx' },
  cookbook: { type: 'cookbook', body: 'cookbook.mdx' },
  guide: { type: 'guide', body: 'guide.mdx' },
  tutorial: { type: 'tutorial', body: 'tutorial.mdx' },
  troubleshooting: { type: 'troubleshooting', body: 'troubleshooting.mdx' }
};

// A template may open with commented frontmatter. Scaffold keeps its comments and extra fields, and sets the fields it owns.
function splitTemplate(source: string, bodyFile: string): { header?: YAML.Document.Parsed; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(source);
  if (!match) {
    if (/^---/.test(source)) throw new Error(`${bodyFile}: template frontmatter is not closed by a --- line`);
    return { body: source };
  }
  const header = YAML.parseDocument(match[1], { uniqueKeys: true });
  if (header.errors.length) throw new Error(`${bodyFile}: template frontmatter ${header.errors.map(error => error.message).join('; ')}`);
  if (!YAML.isMap(header.contents)) throw new Error(`${bodyFile}: template frontmatter must be a mapping`);
  return { header, body: source.slice(match[0].length) };
}

function fillTemplateHeader(header: YAML.Document.Parsed, owned: Record<string, unknown>): string {
  const map = header.contents as YAML.YAMLMap;
  for (const [key, value] of Object.entries(owned)) {
    const existing = map.items.find(pair => YAML.isScalar(pair.key) && pair.key.value === key);
    const node = header.createNode(value);
    if (existing) {
      if (YAML.isNode(existing.value)) {
        node.comment = existing.value.comment;
        node.commentBefore = existing.value.commentBefore;
        if (YAML.isCollection(node) && YAML.isCollection(existing.value)) node.flow = existing.value.flow;
      }
      existing.value = node;
    } else map.add(header.createPair(key, node));
  }
  if (!('operations' in owned)) map.delete('operations');
  return header.toString({ lineWidth: 0 });
}

export async function scaffold(configFile: string, templateId: string, targetFile: string, input: ScaffoldInput) {
  const loaded = await loadConfig(configFile);
  const config: any = loaded.value;
  if (config.templates !== undefined && !object(config.templates)) throw new Error('templates must be a mapping');
  const localTemplate = config.templates?.[templateId];
  const template = localTemplate ?? builtinAuthoringTemplates[templateId];
  if (!object(template)) throw new Error(`Unknown template ${templateId}`);
  for (const key of Object.keys(template)) if (!['type', 'body', 'required'].includes(key)) throw new Error(`Unknown template setting ${templateId}.${key}`);
  if (typeof template.type !== 'string' || !template.type) throw new Error(`Template ${templateId} needs a document type`);
  if (typeof template.body !== 'string' || !/\.mdx?$/.test(template.body)) throw new Error(`Template ${templateId} needs a .md or .mdx body`);
  if (template.required !== undefined && (!Array.isArray(template.required) || template.required.some((field: unknown) => field !== 'operations'))) throw new Error(`Template ${templateId}.required only supports operations in this slice`);
  for (const field of ['id', 'title', 'summary', 'slug'] as const) if (typeof input[field] !== 'string' || !input[field].trim()) throw new Error(`Scaffold needs ${field}`);
  if (!input.slug.startsWith('/') || input.slug.includes('..')) throw new Error('Scaffold slug must be an absolute path without traversal');
  if (input.operations !== undefined && (!Array.isArray(input.operations) || input.operations.some(item => typeof item !== 'string' || !item))) throw new Error('Scaffold operations must be stable IDs');
  if (template.required?.includes('operations') && !input.operations?.length) throw new Error(`Template ${templateId} requires operations`);
  if (template.type === 'api-reference' && input.operations?.length !== 1) throw new Error(`Template ${templateId} needs exactly one operation for an api-reference page`);
  const knownOperations = new Set(Object.values<any>(config.apis ?? {}).flatMap(api => (api.operations ?? []).map((item: any) => item.id)));
  for (const operation of input.operations ?? []) if (!knownOperations.has(operation)) throw new Error(`Unknown scaffold operation ${operation}`);
  const defaults = config.publications?.defaults;
  const applicability = resolveFrontmatter(Object.fromEntries(Object.entries({ channel: input.channel, version: input.version, language: input.language }).filter(([, value]) => value !== undefined)), config.frontmatter);
  const channel = applicability.channel ?? defaults?.channel;
  const version = applicability.version ?? defaults?.version;
  const language = applicability.language ?? defaultLanguage(config);
  if (!channel || !version || !language) throw new Error('Scaffold needs channel, version, and language');
  if (!config.publications?.enabled?.some((item: any) => item.channel === channel && item.version === version && (item.language ?? defaultLanguage(config)) === language)) throw new Error(`Scaffold publication ${channel}/${version}/${language} is not enabled`);
  const root = path.dirname(path.resolve(configFile));
  const contentDir = await canonicalPath(path.resolve(root, config.site?.contentDir ?? 'content'));
  const target = await canonicalPath(targetFile);
  const relative = path.relative(contentDir, target);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative) || !/\.mdx?$/.test(target)) throw new Error(`Scaffold target must be a .md or .mdx file inside ${contentDir}`);
  const bodyFile = localTemplate
    ? path.resolve(path.dirname(explainSegments(loaded, ['templates', templateId, 'body']).source.file), template.body)
    : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../templates', template.body);
  const { header, body } = splitTemplate(await readFile(bodyFile, 'utf8'), bodyFile);
  const frontmatter = { id: input.id, title: input.title, summary: input.summary, type: template.type, slug: input.slug, channel, version, language, ...(input.operations?.length ? { operations: input.operations } : {}), access: { policy: 'draft' } };
  routeFor(frontmatter, { channel, version, language }, config);
  const written = header ? fillTemplateHeader(header, frontmatter) : YAML.stringify(frontmatter);
  const content = `---\n${written.replace(/\s*$/, '\n')}---\n\n${body.trimStart().replace(/\s*$/, '\n')}`;
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content, { flag: 'wx' });
  return { status: 'ok', template: templateId, id: input.id, file: target, publication: { channel, version, language }, access: 'draft' };
}

export async function scaffoldFromPath(configFile: string, templateId: string, targetFile: string, overrides: Partial<ScaffoldInput> = {}) {
  const loaded = await loadConfig(configFile);
  const config: any = loaded.value;
  const contentDir = await canonicalPath(path.resolve(path.dirname(path.resolve(configFile)), config.site?.contentDir ?? 'content'));
  const relative = path.relative(contentDir, await canonicalPath(targetFile));
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative) || !/\.mdx?$/.test(relative)) throw new Error(`Scaffold target must be a .md or .mdx file inside ${contentDir}`);
  const parts = relative.replace(/\.mdx?$/, '').split(path.sep).map(part => part.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
  if (parts.some(part => !part)) throw new Error('Scaffold target needs a usable filename');
  const title = parts.at(-1)!.split('-').map(word => word[0].toUpperCase() + word.slice(1)).join(' ');
  const selected = resolveFrontmatter(Object.fromEntries(Object.entries({ channel: overrides.channel, version: overrides.version, language: overrides.language }).filter(([, value]) => value !== undefined)), config.frontmatter);
  const channel = selected.channel ?? config.publications?.defaults?.channel;
  const version = selected.version ?? config.publications?.defaults?.version;
  const language = selected.language ?? defaultLanguage(config);
  const prefixGroups = [
    language === defaultLanguage(config) ? '' : language,
    config.publications?.channels?.[channel]?.pathPrefix ?? '',
    config.publications?.versions?.[version]?.pathPrefix ?? ''
  ].map(value => value.split('/').filter(Boolean));
  const prefixCandidates: string[][] = [];
  for (let start = 0; start < prefixGroups.length; start++) {
    for (let end = start + 1; end <= prefixGroups.length; end++) {
      const candidate = prefixGroups.slice(start, end).flat();
      if (candidate.length) prefixCandidates.push(candidate);
    }
  }
  prefixCandidates.sort((a, b) => b.length - a.length);
  const matchingPrefix = prefixCandidates.find(candidate => parts.length > candidate.length && candidate.every((part, index) => parts[index] === part));
  const slugParts = matchingPrefix ? parts.slice(matchingPrefix.length) : parts;
  return scaffold(configFile, templateId, targetFile, {
    id: `${templateId}.${parts.join('.')}`,
    title,
    summary: `Draft guide for ${title.toLowerCase()}. Replace this summary before publication.`,
    slug: `/${slugParts.join('/')}`,
    ...overrides
  });
}
