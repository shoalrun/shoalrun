import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import Ajv from 'ajv/dist/2020.js';
import { resolveTaxonomy } from './taxonomy.js';
import { frontmatterSchema, resolveFrontmatter, validateFrontmatter } from './frontmatter.js';
import { compile } from './compiler.js';

const taxonomy = { required: ['area', 'subarea'], areas: { discovery: { label: 'Search & discovery', subareas: { mcp: 'MCP', search: 'Search' } }, publishing: { label: 'Publishing', subareas: { hosting: 'Hosting' } } } };
const page = { id: 'test', title: 'Test', summary: 'A real test page.', type: 'guide', slug: '/test', area: 'discovery', subarea: 'mcp' };

test('taxonomy is opt-in, validates vocabularies and pairs, and allows non-prefixed subarea IDs', () => {
  validateFrontmatter({ ...page, area: 'anything', subarea: 'other' }, {}, 'page');
  validateFrontmatter(page, { taxonomy: false }, 'page');
  validateFrontmatter(page, { taxonomy }, 'page');
  for (const [overrides, message] of [[{ area: undefined }, /requires area/], [{ subarea: undefined }, /requires subarea/], [{ area: 'unknown' }, /unknown taxonomy area/], [{ subarea: 'hosting' }, /does not belong/]] as const) assert.throws(() => validateFrontmatter({ ...page, ...overrides } as any, { taxonomy }, 'page'), message);
  validateFrontmatter({ ...page, subarea: undefined }, { taxonomy: { ...taxonomy, required: [] } }, 'page');
  assert.throws(() => validateFrontmatter({ ...page, area: undefined }, { taxonomy: { ...taxonomy, required: [] } }, 'page'), /subarea requires area/);
});

test('required categories can inherit defaults while explicit authored categories cannot', () => {
  const config = { taxonomy, defaults: { area: 'discovery', subarea: 'mcp' } };
  const raw = { ...page }; delete (raw as any).area; delete (raw as any).subarea;
  const resolved = resolveFrontmatter(raw, config);
  validateFrontmatter(resolved, config, 'page', raw);
  assert.throws(() => validateFrontmatter(resolved, { ...config, taxonomy: { ...taxonomy, requireExplicit: ['area', 'subarea'] } }, 'page', raw), /requires explicit area/);
  validateFrontmatter(resolved, { ...config, taxonomy: { ...taxonomy, requireExplicit: ['area', 'subarea'] } }, 'generated');
});

test('taxonomy configuration rejects malformed and ambiguous declarations', () => {
  for (const value of [null, true, {}, { ...taxonomy, required: ['other'] }, { ...taxonomy, requireExplicit: ['area', 'area'] }, { ...taxonomy, unknown: true }, { areas: { a: { label: '' } } }, { areas: { a: { label: 'A', subareas: { same: 'Same' } }, b: { label: 'B', subareas: { same: 'Same' } } } }]) assert.throws(() => resolveTaxonomy(value));
});

test('generated page schemas expose required taxonomy and enforce pairs', () => {
  const schema = frontmatterSchema({ taxonomy });
  const ajv = new Ajv.default({ strict: false, validateFormats: false });
  const valid = ajv.compile(schema);
  assert(valid(page)); assert(!valid({ ...page, subarea: 'hosting' })); assert(!valid({ ...page, area: undefined }));
  const explicit = frontmatterSchema({ taxonomy: { ...taxonomy, requireExplicit: ['area'] }, defaults: { area: 'discovery', subarea: 'mcp' } });
  assert(explicit.required.includes('area'));
  const inherited = ajv.compile(frontmatterSchema({ taxonomy, defaults: { area: 'discovery', subarea: 'mcp' } }));
  const { area, subarea, ...untagged } = page;
  assert(inherited(untagged));
  assert(!inherited({ ...untagged, subarea: 'hosting' }));
  assert(!inherited({ ...untagged, area: 'publishing' }));
});

test('direct builds enforce taxonomy on drafts and generated API pages and publish definitions', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-taxonomy-native-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await cp(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../example-configs/minimal'), directory, { recursive: true });
  const configFile = path.join(directory, 'docs.config.yaml');
  const config = YAML.parse(await readFile(configFile, 'utf8'));
  config.frontmatter.taxonomy = { ...taxonomy, requireExplicit: ['area', 'subarea'] };
  config.frontmatter.defaults.area = 'discovery'; config.frontmatter.defaults.subarea = 'mcp';
  for (const name of ['welcome', 'install']) {
    const file = path.join(directory, 'content', name + '.mdx');
    await writeFile(file, (await readFile(file, 'utf8')).replace('---\n', '---\narea: discovery\nsubarea: mcp\n'));
  }
  config.apis = { demo: { source: { kind: 'file', path: './openapi.yaml' }, generateReferences: true } };
  await writeFile(path.join(directory, 'openapi.yaml'), 'openapi: 3.1.0\ninfo: {title: Demo, version: 1.0.0}\npaths:\n  /items:\n    get:\n      operationId: getItems\n      responses:\n        "200": {description: OK}\n');
  await writeFile(configFile, YAML.stringify(config));
  const out = path.join(directory, 'dist');
  await compile(configFile, out, undefined, { apiReview: 'report' });
  const manifest = JSON.parse(await readFile(path.join(out, 'documents.json'), 'utf8'));
  assert.equal(manifest.taxonomy.areas.discovery.subareas.mcp, 'MCP');
  assert(manifest.documents.some((doc: any) => doc.type === 'api-reference' && doc.area === 'discovery' && doc.subarea === 'mcp'));
  config.frontmatter.taxonomy.multiple = ['area', 'subarea'];
  config.frontmatter.defaults.area = ['discovery', 'publishing'];
  config.frontmatter.defaults.subarea = ['mcp', 'hosting'];
  await writeFile(configFile, YAML.stringify(config));
  await compile(configFile, out, undefined, { apiReview: 'report' });
  const multiManifest = JSON.parse(await readFile(path.join(out, 'documents.json'), 'utf8'));
  assert.deepEqual(multiManifest.documents.find((doc: any) => doc.type === 'api-reference').area, ['discovery', 'publishing']);
  const draft = path.join(directory, 'content/draft.mdx');
  await writeFile(draft, '---\nid: draft\ntitle: Draft\nsummary: A pending guide.\ntype: guide\nslug: /draft\naccess: {policy: draft}\n---\n\nDraft.\n');
  await assert.rejects(compile(configFile, out), /requires explicit area/);
  await rm(draft);
  config.frontmatter.defaults.area = 'discovery'; config.frontmatter.defaults.subarea = 'hosting';
  await writeFile(configFile, YAML.stringify(config));
  await assert.rejects(compile(configFile, out), /does not belong to area discovery/);
});

test('site configuration controls multiple areas and subareas, including reader facets and schemas', async () => {
  const { pageReaderFilters, validateReaderFilters } = await import('./reader-filters.js');
  const multi = { ...taxonomy, multiple: ['area', 'subarea'] };
  const shared = { ...page, area: ['discovery', 'publishing'], subarea: ['mcp', 'hosting'] };
  assert.throws(() => validateFrontmatter(shared, { taxonomy }, 'page'), /only one area/);
  validateFrontmatter(shared, { taxonomy: multi }, 'page');
  validateFrontmatter({ ...shared, subarea: 'mcp' }, { taxonomy: multi }, 'page');
  for (const area of [[], ['discovery', 'discovery'], ['discovery', 'unknown']]) assert.throws(() => validateFrontmatter({ ...shared, area }, { taxonomy: multi }, 'page'));
  assert.throws(() => validateFrontmatter({ ...shared, area: ['discovery'] }, { taxonomy: multi }, 'page'), /does not belong/);
  const ajv = new Ajv.default({ strict: false, validateFormats: false });
  const valid = ajv.compile(frontmatterSchema({ taxonomy: multi }));
  assert(valid(shared));assert(!valid({ ...shared, area: ['discovery'] }));assert(!valid({ ...shared, area: [] }));
  const facets = validateReaderFilters({ facets: { area: { label: 'Area', options: { discovery: 'Discovery', publishing: 'Publishing' } }, subarea: { label: 'Subarea', options: { mcp: 'MCP', hosting: 'Hosting' } } } });
  assert.deepEqual(pageReaderFilters(shared, facets, 'page'), { area: ['discovery', 'publishing'], subarea: ['mcp', 'hosting'] });
});
