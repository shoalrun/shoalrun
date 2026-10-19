import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parseYaml } from './yaml-value.js';
import { validateSearch } from './search-config.js';
import { resolveTaxonomy } from './taxonomy.js';
import { validateCookbooks } from './cookbook-chooser.js';

export type Source = { file: string; history: string[] };
type Tree = { source: Source; value: unknown };
type Directive = { kind: 'concat' | 'remove'; items: Tree[] | string[] };
const allowed = new Set(['schemaVersion', 'site', 'navigation', 'redirects', 'apis', 'relationships', 'variables', 'snippets', 'callouts', 'badges', 'publications', 'outputs', 'templates', 'theme', 'frontmatter', 'metadata', 'audit', 'readerFilters', 'retrieval', 'chat', 'authoring', 'search', 'cookbooks', 'analytics', 'mcp', 'components']);
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const treeObject = (v: unknown): v is Record<string, Tree> => object(v) && !('kind' in v && 'items' in v);
export class ConfigError extends Error {}

function valueOf(node: Tree): unknown {
  if (Array.isArray(node.value)) return node.value.map(x => valueOf(x as Tree));
  if (treeObject(node.value)) return Object.fromEntries(Object.entries(node.value).map(([key, child]) => [key, valueOf(child)]));
  return node.value;
}

function finalize(node: Tree): Tree {
  const directive = node.value as Directive;
  if (object(directive) && directive.kind === 'concat') return { source: node.source, value: (directive.items as Tree[]).map(finalize) };
  if (object(directive) && directive.kind === 'remove') throw new ConfigError(`${node.source.file}: $remove has no inherited value`);
  if (Array.isArray(node.value)) return { source: node.source, value: node.value.map(x => finalize(x as Tree)) };
  if (treeObject(node.value)) return { source: node.source, value: Object.fromEntries(Object.entries(node.value).map(([key, child]) => [key, finalize(child)])) };
  return node;
}

function merge(base: Tree | undefined, overlay: Tree): Tree {
  const directive = overlay.value as Directive;
  if (object(directive) && directive.kind === 'concat') {
    if (base && !Array.isArray(base.value)) throw new ConfigError(`${overlay.source.file}: $concat requires an array base`);
    return { value: [...(base?.value as Tree[] ?? []), ...(directive.items as Tree[])], source: { file: overlay.source.file, history: base ? [base.source.file] : [] } };
  }
  if (object(directive) && directive.kind === 'remove') {
    if (!base) throw new ConfigError(`${overlay.source.file}: $remove has no inherited value`);
    const names = directive.items as string[];
    if (Array.isArray(base.value)) return { value: base.value.filter(item => !names.includes(String((valueOf(item as Tree) as any)?.id))), source: { file: overlay.source.file, history: [base.source.file] } };
    if (!treeObject(base.value)) throw new ConfigError(`${overlay.source.file}: $remove requires a map or keyed list`);
    return { value: Object.fromEntries(Object.entries(base.value).filter(([key]) => !names.includes(key))), source: { file: overlay.source.file, history: [base.source.file] } };
  }
  if (base && treeObject(base.value) && treeObject(overlay.value)) {
    const combined: Record<string, Tree> = { ...base.value };
    for (const [key, child] of Object.entries(overlay.value)) combined[key] = merge(combined[key], child);
    return { value: combined, source: { file: overlay.source.file, history: [base.source.file, ...base.source.history] } };
  }
  if (!base) return overlay;
  return { value: overlay.value, source: { file: overlay.source.file, history: [base.source.file, ...base.source.history] } };
}

export async function loadConfig(file: string) {
  const dependencies = new Set<string>();
  const root = path.resolve(file);
  async function read(current: string, stack: string[], rootFile = false): Promise<Tree> {
    current = path.resolve(current);
    if (stack.includes(current)) throw new ConfigError(`Configuration cycle: ${[...stack, current].join(' -> ')}`);
    dependencies.add(current);
    const raw = await readFile(current, 'utf8');
    let parsed: any;
    try { parsed = parseYaml(raw, current); }
    catch (error) { throw new ConfigError((error as Error).message); }
    if (rootFile && !object(parsed)) throw new ConfigError(`${current}: root must be a mapping`);
    const next = [...stack, current];
    async function resolve(value: unknown): Promise<Tree> {
      const source = { file: current, history: [] };
      if (Array.isArray(value)) return { source, value: await Promise.all(value.map(resolve)) };
      if (!object(value)) return { source, value };
      const directives = Object.keys(value).filter(key => key.startsWith('$'));
      if (directives.length) {
        if (directives.length !== 1 || Object.keys(value).length !== 1) throw new ConfigError(`${current}: exactly one directive is required`);
        if (directives[0] === '$include' && typeof value.$include === 'string') return read(path.resolve(path.dirname(current), value.$include), next);
        if (directives[0] === '$concat' && Array.isArray(value.$concat)) {
          const parts = await Promise.all(value.$concat.map(resolve));
          const items = parts.flatMap(part => Array.isArray(part.value) ? part.value as Tree[] : [part]);
          return { source, value: { kind: 'concat', items } as Directive };
        }
        if (directives[0] === '$remove' && Array.isArray(value.$remove) && value.$remove.every(x => typeof x === 'string'))
          return { source, value: { kind: 'remove', items: value.$remove } as Directive };
        throw new ConfigError(`${current}: invalid ${directives[0]} directive`);
      }
      return { source, value: Object.fromEntries(await Promise.all(Object.entries(value).map(async ([key, child]) => [key, await resolve(child)]))) };
    }
    if (!object(parsed)) return resolve(parsed);
    const presets = parsed.extends;
    if (presets !== undefined && (!Array.isArray(presets) || !presets.every(x => typeof x === 'string')))
      throw new ConfigError(`${current}: extends must be a list of paths`);
    let result: Tree | undefined;
    for (const preset of presets ?? []) result = merge(result, await read(path.resolve(path.dirname(current), preset as string), next));
    const local = { ...parsed }; delete local.extends;
    return merge(result, await resolve(local));
  }
  const tree = finalize(await read(root, [], true));
  const value = valueOf(tree);
  if (!object(value) || value.schemaVersion !== 1) throw new ConfigError(`${root}: schemaVersion must be 1`);
  for (const key of Object.keys(value)) if (!allowed.has(key)) throw new ConfigError(`${root}: unknown setting ${key}`);
  validateCookbooks(value.cookbooks, root);
  validateSearch(value.search);
  resolveTaxonomy(object(value.frontmatter) ? value.frontmatter.taxonomy : undefined);
  if (object(value.publications) && ((object(value.publications.defaults) && Object.hasOwn(value.publications.defaults, 'locale')) || (Array.isArray(value.publications.enabled) && value.publications.enabled.some(item => object(item) && Object.hasOwn(item, 'locale'))))) throw new ConfigError(`${root}: publications.locale is now publications.language; page locale is reserved for formatting conventions`);
  return { value, tree, dependencies: [...dependencies].sort(), digest: createHash('sha256').update(JSON.stringify(value)).digest('hex') };
}

export function explain(config: Awaited<ReturnType<typeof loadConfig>>, key: string) {
  return explainSegments(config, key.split('.'));
}

export function explainSegments(config: Awaited<ReturnType<typeof loadConfig>>, segments: string[]) {
  const node = segments.reduce<Tree | undefined>((at, segment) => {
    if (!at) return undefined;
    if (Array.isArray(at.value)) return at.value[Number(segment)] as Tree;
    if (treeObject(at.value)) return at.value[segment];
    return undefined;
  }, config.tree);
  if (!node) throw new ConfigError(`Unknown config path: ${segments.join('.')}`);
  return { key: segments.join('.'), value: valueOf(node), source: node.source, dependencies: config.dependencies };
}
