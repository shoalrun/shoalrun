import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { scaffold, scaffoldFromPath } from './scaffold.js';
import { apiCandidates } from './api-selection.js';
import { materializeApiPages } from './api-materialize.js';
import { compile } from './compiler.js';
import { requirePublicationsSection, resolvePublication } from './compiler-config.js';
import { documentKey, publicationKey } from './publication-identity.js';

const products = {
  analytics: { pathPrefix: '/analytics', defaultVersion: 'v3', versions: { v1: { pathPrefix: '/v1' }, v3: { pathPrefix: '/v3' } } },
  billing: { pathPrefix: '/billing', defaultVersion: 'v1', versions: { v1: { pathPrefix: '/v1' } } }
};
const variants = [
  { product: 'analytics', channel: 'production', version: 'v1', language: 'en' },
  { product: 'analytics', channel: 'production', version: 'v3', language: 'en' },
  { product: 'billing', channel: 'production', version: 'v1', language: 'en' }
];

test('product catalogs resolve their own releases and reject cross-product version fallback', () => {
  const publications = requirePublicationsSection({ schemaVersion: 1, publications: { channels: { production: {} }, products, defaults: { channel: 'production', version: 'legacy' } } });
  assert.equal(resolvePublication(publications, { product: 'analytics' }).version, 'v3');
  assert.equal(resolvePublication(publications, { product: 'billing' }).version, 'v1');
  assert.equal(resolvePublication({ ...publications, defaults: { product: 'analytics', channel: 'production', version: 'v1' } }, { product: 'analytics' }).version, 'v1');
  assert.throws(() => resolvePublication(publications, { product: 'billing', version: 'v3' }), /Unknown publication/);
  assert.throws(() => resolvePublication(publications, { product: 'missing', version: 'v1' }), /Unknown publication product/);
  assert.throws(() => requirePublicationsSection({ schemaVersion: 1, publications: { channels: {}, products: { broken: { pathPrefix: '/broken', defaultVersion: 'v1', versions: { v1: {}, v2: {} } } } } }), /duplicate version pathPrefix/);
  assert.equal(publicationKey(variants[0]), 'production|v1|en|analytics');
  assert.notEqual(documentKey('guide.start', variants[0]), documentKey('guide.start', variants[2]));
  assert.throws(() => requirePublicationsSection({ schemaVersion: 1, publications: { channels: {}, products: { broken: { ...products.analytics, defaultVersion: 'v99' } } } }), /defaultVersion/);
});

test('independent product versions isolate repeated page IDs, API sources, links and customer editions', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-products-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'content'));
  const page = async (name: string, metadata: Record<string, unknown>, body: string) => writeFile(path.join(root, 'content', `${name}.mdx`), `---\n${JSON.stringify({ id: 'guide.start', title: 'Product start', summary: 'Product instructions.', type: 'guide', slug: '/start', channel: 'production', language: 'en', access: { policy: 'public' }, ...metadata })}\n---\n${body}\n`);
  for (const variant of variants) {
    const marker = `${variant.product}-${variant.version}`;
    await page(marker, variant, `${marker} instructions. [Endpoint](doc:reference.catalog.listItems)`);
    await writeFile(path.join(root, `${marker}.yaml`), `openapi: 3.1.0\ninfo: { title: '${marker}', version: '1' }\npaths:\n  /items:\n    get:\n      operationId: listItems\n      summary: ${marker} endpoint\n      responses:\n        '200': { description: ${marker} response }\n`);
  }
  await page('default', { id: 'guide.default', slug: '/default', product: 'analytics' }, 'Product-local default release.');
  await writeFile(path.join(root, 'content', 'shared.mdx'), `---\n${JSON.stringify({ id: 'guide.shared', title: 'Shared instructions', summary: 'Selected product memberships.', type: 'guide', slug: '/shared', language: 'en', access: { policy: 'public' }, shared: true, publications: [variants[1], variants[2]].map(({ language, ...v }) => v) })}\n---\nShared prose. [Start](doc:guide.start)\n\n<ForFeature allOf="advanced">\n\nAdvancedOnlyText\n\n</ForFeature>\n`);
  await writeFile(path.join(root, 'skus.yaml'), JSON.stringify({ schemaVersion: 1, features: { advanced: {} }, skus: {} }));
  const config = path.join(root, 'docs.config.yaml');
  await writeFile(config, JSON.stringify({
    schemaVersion: 1, site: { title: 'Independent products' },
    publications: { channels: { production: {} }, products, defaults: { channel: 'production', language: 'en' }, enabled: variants },
    profiles: { manifest: './skus.yaml', pruneNavigation: true },
    frontmatter: { defaults: { version: 'legacy' } },
    outputs: { html: { highlighting: { provider: 'none' } } },
    apis: { catalog: { generateReferences: true, publications: variants.map(({ product, channel, version }) => ({ product, channel, version, source: { kind: 'file', path: `./${product}-${version}.yaml`, focused: true, publish: false } })) } }
  }));
  const fullProfile = path.join(root, 'full.yaml');
  await writeFile(fullProfile, JSON.stringify({ schemaVersion: 1, features: ['advanced'] }));
  const output = path.join(root, 'dist');
  const all = await compile(config, output, {}, { profile: fullProfile, apiReview: 'report' });
  assert.equal(all.documents.filter(doc => doc.id === 'guide.start').length, 3);
  assert.deepEqual(all.documents.filter(doc => doc.id === 'guide.shared').map(doc => doc.url).sort(), ['/analytics/v3/shared', '/billing/v1/shared']);
  assert.equal(all.documents.find(doc => doc.id === 'guide.default')?.url, '/analytics/v3/default');
  for (const variant of variants) {
    const route = `/${variant.product}/${variant.version}`;
    const markdown = await readFile(path.join(output, route, 'start.md'), 'utf8');
    assert.match(markdown, new RegExp(`${variant.product}-${variant.version} instructions`));
    const endpoint = all.documents.find(doc => doc.variant.product === variant.product && doc.variant.version === variant.version && doc.id === 'reference.catalog.listItems');
    assert.ok(endpoint, `Missing API reference for ${publicationKey(variant)}`);
    assert.ok(markdown.includes(endpoint.markdownUrl), markdown);
    const endpointText = await readFile(path.join(output, endpoint.markdownUrl), 'utf8');
    assert.match(endpointText, new RegExp(`${variant.product}-${variant.version} endpoint`));
  }
  const profile = path.join(root, 'customer.yaml');
  await writeFile(profile, JSON.stringify({ schemaVersion: 1, features: [], publications: { enabled: [variants[1], variants[2]] } }));
  const selected = await compile(config, output, {}, { profile, apiReview: 'report' });
  assert.ok(selected.documents.every(doc => !(doc.variant.product === 'analytics' && doc.variant.version === 'v1')));
  assert.ok(selected.documents.some(doc => doc.variant.product === 'billing' && doc.variant.version === 'v1'));
  assert.doesNotMatch(await readFile(path.join(output, 'analytics/v3/shared.md'), 'utf8'), /AdvancedOnlyText/);
  await assert.rejects(readFile(path.join(output, 'analytics/v1/start.md')), /ENOENT/);
  await page('billing-v1', { ...variants[2], type: 'reference' }, 'Inconsistent stable document type.');
  await assert.rejects(compile(config, output, {}, { profile, apiReview: 'report' }), /stable document ID guide.start has inconsistent types/);
});


test('authoring tools preserve product release selection and reject ambiguous defaults', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-product-authoring-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'content'));
  const config = path.join(root, 'docs.config.yaml');
  for (const product of ['analytics', 'billing']) await writeFile(path.join(root, `${product}.yaml`), JSON.stringify({ openapi: '3.1.0', info: { title: product, version: '1' }, paths: { '/items': { get: { operationId: 'listItems', summary: `${product} endpoint`, responses: { '200': { description: 'ok' } } } } } }));
  await writeFile(config, JSON.stringify({ schemaVersion: 1, site: { title: 'Products' }, publications: { channels: { production: {} }, products, defaults: { channel: 'production' }, enabled: variants }, apis: { catalog: { publications: [variants[1], variants[2]].map(v => ({ product: v.product, channel: v.channel, version: v.version, source: { kind: 'file', path: `./${v.product}.yaml` } })) } } }));
  await assert.rejects(apiCandidates(config, 'catalog'), /Unknown publication/);
  const candidates = await apiCandidates(config, 'catalog', { product: 'billing' });
  assert.equal(candidates.publication.product, 'billing');
  assert.equal(candidates.publication.version, 'v1');
  assert.equal(candidates.candidates[0].title, 'billing endpoint');
  const result = await materializeApiPages(config, 'catalog', { product: 'analytics', all: true });
  assert.equal(result.written.length, 1);
  assert.match(await readFile(result.written[0], 'utf8'), /product: analytics/);
  assert.match(await readFile(result.written[0], 'utf8'), /version: v3/);
  assert.match(result.written[0], /analytics[\\/]v3[\\/]catalog/);
  const billingDraft = await materializeApiPages(config, 'catalog', { product: 'billing', all: true });
  assert.equal(billingDraft.written.length, 1);
  assert.match(billingDraft.written[0], /billing[\\/]v1[\\/]catalog/);
  await writeFile(result.written[0], (await readFile(result.written[0], 'utf8')).replace(/^version: v3\n/m, ''));
  const settings = JSON.parse(await readFile(config, 'utf8'));
  settings.apis.catalog.publications.push({ product: 'analytics', channel: 'production', version: 'v1', source: { kind: 'file', path: './analytics.yaml' } });
  await writeFile(config, JSON.stringify(settings));
  const oldRelease = await materializeApiPages(config, 'catalog', { product: 'analytics', version: 'v1', all: true });
  assert.equal(oldRelease.written.length, 1, 'An implicit default-v3 page must not stand in for v1');
  assert.match(await readFile(oldRelease.written[0], 'utf8'), /version: v1/);
  const target = path.join(root, 'content', 'billing-start.mdx');
  const draft = await scaffold(config, 'guide', target, { id: 'guide.start', title: 'Start billing', summary: 'Billing setup.', slug: '/start', product: 'billing' });
  assert.equal(draft.publication.product, 'billing');
  assert.equal(draft.publication.version, 'v1');
  assert.match(await readFile(target, 'utf8'), /product: billing/);
});


test('legacy product categories remain metadata when scaffolding without a product catalog', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-legacy-product-scaffold-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'content'));
  const config = path.join(root, 'docs.config.yaml');
  await writeFile(config, JSON.stringify({ schemaVersion: 1, site: { title: 'Legacy category' }, publications: { channels: { production: {} }, versions: { current: {} }, defaults: { channel: 'production', version: 'current' }, enabled: [{ channel: 'production', version: 'current' }] }, frontmatter: { defaults: { product: 'LegacyCategory' } } }));
  const target = path.join(root, 'content', 'start.mdx');
  const draft = await scaffold(config, 'guide', target, { id: 'guide.start', title: 'Start', summary: 'Legacy product category.', slug: '/start' });
  assert.equal(draft.publication.product, undefined);
  assert.match(await readFile(target, 'utf8'), /product: LegacyCategory/);
  const fromPath = path.join(root, 'content', 'next.mdx');
  const inferred = await scaffoldFromPath(config, 'guide', fromPath);
  assert.equal(inferred.publication.product, undefined);
  assert.match(await readFile(fromPath, 'utf8'), /product: LegacyCategory/);
});
