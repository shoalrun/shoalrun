import { resolvePublication } from './compiler-config.js';
import type { Variant } from './content.js';
import { samePublication } from './publication-identity.js';
import { mkdir, readFile, readdir, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
import { apiCandidates, type ApiCandidate } from './api-selection.js';
import { loadConfig } from './config.js';
import { defaultLanguage } from './frontmatter.js';

export type MaterializeOptions = Partial<Variant> & { all?: boolean; operations?: string[]; routes?: string[]; output?: string };

async function canonical(file: string): Promise<string> {
  const resolved = path.resolve(file);
  try { return await realpath(resolved); }
  catch {
    const parent = path.dirname(resolved);
    return parent === resolved ? resolved : path.join(await canonical(parent), path.basename(resolved));
  }
}

async function pageFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true }).catch(error => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  const nested = await Promise.all(entries.map(async entry => entry.isDirectory() ? pageFiles(path.join(directory, entry.name)) : entry.isFile() && /\.mdx?$/.test(entry.name) ? [path.join(directory, entry.name)] : []));
  return nested.flat();
}

function pageIdentity(source: string, file: string): { id?: string; operation?: string; product?: string; channel?: string; version?: string; language?: string; publications?: Array<{ product?: string; channel: string; version: string }> } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(source);
  if (!match) return {};
  const data = YAML.parse(match[1]);
  if (!data || typeof data !== 'object') throw new Error(`${file}: invalid page frontmatter`);
  return { id: data.id, operation: Array.isArray(data.operations) && data.operations.length === 1 ? data.operations[0] : undefined, product: data.product, channel: data.channel, version: data.version, language: data.language, publications: data.publications };
}

function select(candidates: ApiCandidate[], options: MaterializeOptions): ApiCandidate[] {
  const ids = options.operations ?? [];
  const routes = options.routes ?? [];
  if (!!options.all === !!(ids.length || routes.length)) throw new Error('Choose --all or at least one --operation/--route selector');
  const known = new Map(candidates.map(item => [item.operationId, item]));
  const chosen = new Set<ApiCandidate>();
  if (options.all) return candidates;
  for (const id of ids) {
    const item = known.get(id);
    if (!item) throw new Error(`Unknown source operationId ${id}`);
    chosen.add(item);
  }
  for (const route of routes) {
    const match = /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|TRACE|WEBHOOK)\s+(\/\S+)$/.exec(route);
    if (!match) throw new Error(`Route selector ${JSON.stringify(route)} needs METHOD /path`);
    const item = candidates.find(candidate => candidate.method === match[1] && candidate.route === match[2]);
    if (!item) throw new Error(`Unknown API route ${route}`);
    chosen.add(item);
  }
  return candidates.filter(item => chosen.has(item));
}

export async function materializeApiPages(configFile: string, apiId: string, options: MaterializeOptions) {
  const loaded = await loadConfig(configFile);
  const config: any = loaded.value;
  const root = path.dirname(path.resolve(configFile));
  const contentDir = await canonical(path.resolve(root, config.site?.contentDir ?? 'content'));
  const { candidates, publication } = await apiCandidates(configFile, apiId, options);
  const defaultDirectory = publication.product ? path.join(contentDir, 'api', publication.product, publication.version, apiId) : path.join(contentDir, 'api', apiId);
  const directory = await canonical(options.output ? path.resolve(options.output) : defaultDirectory);
  const relative = path.relative(contentDir, directory);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error(`MDX output must stay inside the content directory ${contentDir}`);
  const selected = select(candidates, options);
  const language = publication.language;
  const existing = new Map<string, Array<{ file: string; operation?: string; product?: string; channel?: string; version?: string; language?: string; publications?: Array<{ product?: string; channel: string; version: string }> }>>();
  for (const file of await pageFiles(contentDir)) {
    const identity = pageIdentity(await readFile(file, 'utf8'), file);
    if (!identity.id) continue;
    const pages = existing.get(identity.id) ?? [];
    pages.push({ file, ...identity });
    existing.set(identity.id, pages);
  }
  const pending: Array<{ item: ApiCandidate; file: string; content: string }> = [];
  const skipped: string[] = [];
  const targets = new Set<string>();
  for (const item of selected) {
    const matches = (existing.get(item.reference) ?? []).filter(page => {
      const sourceLanguage = config.frontmatter?.enforced?.language ?? page.language ?? config.frontmatter?.defaults?.language ?? defaultLanguage(config);
      if (page.publications) return page.publications.some(member => member.product === publication.product && member.channel === publication.channel && member.version === publication.version) && sourceLanguage === language;
      const product = config.publications.products ? config.frontmatter?.enforced?.product ?? page.product ?? config.frontmatter?.defaults?.product : undefined;
      const coordinate = resolvePublication(config.publications, {
        ...(product ? { product } : {}),
        channel: config.frontmatter?.enforced?.channel ?? page.channel ?? config.frontmatter?.defaults?.channel ?? config.publications?.defaults?.channel,
        version: config.frontmatter?.enforced?.version ?? page.version ?? (product ? undefined : config.frontmatter?.defaults?.version ?? config.publications?.defaults?.version),
        language: sourceLanguage
      }, defaultLanguage(config));
      return samePublication(coordinate, publication);
    });
    if (matches.length > 1) throw new Error(`Duplicate page ID ${item.reference} in the default publication: ${matches.map(page => page.file).join(', ')}`);
    const prior = matches[0];
    if (prior) {
      if (prior.operation !== item.id) throw new Error(`${prior.file}: page ${item.reference} is not bound to ${item.id}`);
      skipped.push(prior.file);
      continue;
    }
    const file = path.join(directory, item.filename);
    if (targets.has(file)) throw new Error(`Two selected operations map to ${file}; no files written`);
    targets.add(file);
    const atFile = await readFile(file, 'utf8').catch(error => {
      if (error.code === 'ENOENT') return undefined;
      throw error;
    });
    if (atFile !== undefined) throw new Error(`${file}: target exists with another page ID; no files written`);
    const summary = item.method === 'WEBHOOK' ? `Webhook event: ${item.route}` : `${item.method} ${item.route}`;
    const header = YAML.stringify({ id: item.reference, title: item.title, summary, type: 'api-reference', slug: item.slug, ...publication, operations: [item.id], access: { policy: 'draft' } });
    const body = 'This draft reference is based on its linked OpenAPI operation.\n\n[[TODO: Explain when to use this endpoint, its prerequisites, and any behavior the OpenAPI contract cannot express. Verify every claim before publishing.]]\n';
    pending.push({ item, file, content: `---\n${header}---\n\n${body}` });
  }
  for (const page of pending) {
    await mkdir(path.dirname(page.file), { recursive: true });
    await writeFile(page.file, page.content, { flag: 'wx' });
  }
  return { api: apiId, selected: selected.length, written: pending.map(page => page.file), skipped };
}
