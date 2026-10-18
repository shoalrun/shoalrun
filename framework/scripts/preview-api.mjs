#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
import { compile } from '../dist/compiler.js';
import { querySyntaxRules } from '../dist/api.js';

const [sourceArg, directoryArg, ...args] = process.argv.slice(2);
const navIndex = args.indexOf('--nav');
const navFile = navIndex >= 0 ? args.splice(navIndex, 2)[1] : undefined;
const syntaxIndex = args.indexOf('--query-syntax');
const syntaxFile = syntaxIndex >= 0 ? args.splice(syntaxIndex, 2)[1] : undefined;
if (!sourceArg || !directoryArg || !args.length || (navIndex >= 0 && !navFile) || (syntaxIndex >= 0 && !syntaxFile)) {
  process.stderr.write('Usage: node scripts/preview-api.mjs <local-openapi-file> <preview-directory> (--all | <operation-id> [operation-id ...]) [--nav <layout.yaml>] [--query-syntax <rules.yaml>]\n');
  process.exit(1);
}
const selected = args;
const layout = navFile ? YAML.parse(await readFile(path.resolve(navFile), 'utf8')) : {};
const querySyntax = syntaxFile ? querySyntaxRules(YAML.parse(await readFile(path.resolve(syntaxFile), 'utf8'))) : undefined;
if (!layout || typeof layout !== 'object' || Array.isArray(layout)) throw new Error('Navigation layout must be a mapping');
for (const key of Object.keys(layout)) if (!['navigation', 'subjectLifecycle', 'mappings'].includes(key)) throw new Error(`Unknown navigation layout setting ${key}`);
if (layout.subjectLifecycle && (typeof layout.subjectLifecycle !== 'object' || Array.isArray(layout.subjectLifecycle))) throw new Error('subjectLifecycle must map operation IDs to statuses');
const source = path.resolve(sourceArg);
const directory = path.resolve(directoryArg);
// The script replaces content/ and docs.config.yaml, so it writes only to a new, empty, or earlier preview directory.
const marker = '.shoalrun-api-preview';
const existing = await readdir(directory).catch(error => { if (error.code === 'ENOENT') return []; throw error; });
if (existing.length && !existing.includes(marker)) throw new Error(`${directory} is not empty and is not an earlier API preview; pass a new or empty directory`);
const description = YAML.parse(await readFile(source, 'utf8'));
const operations = new Map();
for (const [collection, webhook] of [[description.paths ?? {}, false], [description.webhooks ?? {}, true]]) for (const [route, pathItem] of Object.entries(collection)) {
  for (const [method, operation] of Object.entries(pathItem ?? {})) {
    if (!['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'].includes(method) || !operation?.operationId) continue;
    if (operations.has(operation.operationId)) throw new Error(`Duplicate operationId ${operation.operationId}`);
    operations.set(operation.operationId, { ...operation, route, method, webhook });
  }
}
const slugs = new Set();
const all = selected.length === 1 && selected[0] === '--all';
const chosen = (all ? [...operations.keys()] : selected).map(id => {
  const operation = operations.get(id);
  if (!operation) throw new Error(`Missing operationId ${id}`);
  const normalized = id.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'operation';
  const slug = `${normalized}-${createHash('sha256').update(id).digest('hex').slice(0, 6)}`;
  if (slugs.has(slug)) throw new Error(`Duplicate preview slug ${slug}`);
  slugs.add(slug);
  const override = layout.subjectLifecycle?.[id];
  if (override && !['beta', 'in-development', 'deprecated'].includes(override)) throw new Error(`Invalid subjectLifecycle for ${id}: ${override}`);
  if (operation.deprecated && override && override !== 'deprecated') throw new Error(`OpenAPI-deprecated operation ${id} cannot be labeled ${override}`);
  const subjectLifecycle = operation.deprecated ? 'deprecated' : override;
  return { id, slug, operation, stableId: `api.${id}`, documentId: `reference.${id}`, title: String(operation.summary ?? `${operation.webhook ? 'Webhook' : operation.method.toUpperCase()} ${operation.route}`), subjectLifecycle };
});
for (const id of Object.keys(layout.subjectLifecycle ?? {})) if (!operations.has(id)) throw new Error(`Unknown subjectLifecycle operation ${id}`);
const content = path.join(directory, 'content');
await rm(content, { recursive: true, force: true });
await mkdir(content, { recursive: true });
await writeFile(path.join(directory, marker), 'Created by scripts/preview-api.mjs. The script may replace this directory\'s content/, docs.config.yaml, and site/.\n');
const publication = { channel: 'preview', version: 'snapshot', language: 'en' };
const frontmatter = value => `---\n${YAML.stringify(value)}---\n\n`;
const title = String(description.info?.title ?? 'API reference');
await writeFile(path.join(content, 'overview.mdx'), frontmatter({ id: 'guide.api-overview', title, summary: 'Operations from a local OpenAPI snapshot.', type: 'guide', slug: '/reference', ...publication, access: { policy: 'public' } }) + `This preview is generated from a local API description. Examples are illustrative and have not been executed. Use the grouped navigation to find an operation.\n${all ? '' : `\n${chosen.map(item => `- [${item.title}](doc:${item.documentId})`).join('\n')}\n`}`);
for (const item of chosen) {
  await writeFile(path.join(content, `${item.slug}.mdx`), frontmatter({ id: item.documentId, title: item.title, summary: item.operation.webhook ? `Webhook event: ${item.operation.route}` : `${item.operation.method.toUpperCase()} ${item.operation.route}`, type: 'api-reference', slug: `/reference/${item.slug}`, ...publication, operations: [item.stableId], ...(item.subjectLifecycle ? { subjectLifecycle: item.subjectLifecycle } : {}), access: { policy: 'public' } }));
}
const previewLayout = layout.navigation ?? [{ generated: 'tags' }];
const explicit = new Set();
const filledTags = new Set();
let fillAll = false;
const collectCoverage = (nodes, tag) => {
  if (!Array.isArray(nodes)) throw new Error('Preview navigation must be a list');
  for (const node of nodes) {
    if (node.operation) explicit.add(node.operation);
    if (node.generated === 'tags') fillAll = true;
    if (node.generated === 'remaining' && tag) filledTags.add(tag);
    if (node.items) collectCoverage(node.items, node.tag ?? tag);
  }
};
collectCoverage(previewLayout);
const omitted = chosen.filter(item => !explicit.has(item.id) && !fillAll && !filledTags.has(item.operation.tags?.[0] ?? 'Other'));
if (omitted.length) throw new Error(`Preview navigation omits ${omitted.length} operations; add generated: tags or place them explicitly`);
const convertLayout = (nodes, parent = 'api') => nodes.map(node => {
  if (node.operation) {
    const id = String(node.operation);
    return { id: node.id ?? `operation-${createHash('sha256').update(id).digest('hex').slice(0, 10)}`, operation: `api.${id}`, ...(node.label ? { label: node.label } : {}) };
  }
  if (node.generated) return { id: node.id ?? `${parent}-${node.generated}`, api: 'preview', generated: node.generated };
  if (node.items) return { id: node.id, label: node.label, ...(node.tag ? { api: 'preview', tag: node.tag } : {}), items: convertLayout(node.items, node.id) };
  throw new Error('Preview navigation nodes need operation, generated, or items');
});
const navigation = [
  { id: 'overview', doc: 'guide.api-overview', label: 'API overview' },
  ...convertLayout(previewLayout)
];
const config = {
  schemaVersion: 1,
  site: { title: `${title} · local preview`, contentDir: 'content' },
  navigation,
  publications: { defaults: publication, channels: { preview: { pathPrefix: '' } }, versions: { snapshot: { pathPrefix: '' } }, enabled: [publication] },
  apis: { preview: { source: { kind: 'file', path: source, publish: false, focused: true }, ...(querySyntax ? { querySyntax } : {}), ...(layout.mappings ? { mappings: layout.mappings } : {}), operations: chosen.map(item => ({ id: item.stableId, sourceOperationId: item.id, reference: item.documentId })) } }
};
const configFile = path.join(directory, 'docs.config.yaml');
await writeFile(configFile, YAML.stringify(config));
const destination = path.join(directory, 'site');
const manifest = await compile(configFile, destination, {}, { apiReview: 'report' });
process.stdout.write(JSON.stringify({ status: 'ok', directory: destination, documents: manifest.documents.length, operations: chosen.length, sample: chosen.slice(0, 5).map(item => ({ id: item.id, url: `/reference/${item.slug}/` })) }, null, 2) + '\n');
