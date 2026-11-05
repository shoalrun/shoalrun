import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { exportContent } from './content-export.js';
import { validateContentManifest } from './content-delivery-validation.js';
import { openManifestContentSource, openRestContentSource } from './content-delivery.js';
import { compareContentManifests } from './content-export-comparison.js';
import { createContentRestHandler } from './content-rest-server.js';
import type { ContentManifest, ContentSnapshot } from './content-delivery-contract.js';

const sha = (value: string) => createHash('sha256').update(value).digest('hex');
const publication = { channel: 'production', version: 'v1', language: 'en' };
function snapshot(product: string): ContentSnapshot {
  const selected = { ...publication, product };
  const content = `<p>${product} instructions.</p>`;
  const representation = { path: 'content/start.html', mediaType: 'text/html', bytes: Buffer.byteLength(content), digest: sha(content), anchors: [], links: [] };
  const resource = { publication: selected, ref: { kind: 'page' as const, documentId: 'guide.start' }, title: 'Start', summary: 'Instructions.', type: 'guide', representations: { html: representation }, assets: [], externalDependencies: [] };
  const revision = sha(product);
  return { publication: selected, revision, list: () => [resource], get: async () => ({ resource, representation, content, revision, format: 'html' }), dispose() {} };
}

test('REST separates identical publications and resource IDs by product and pins the selection', async () => {
  const handler = createContentRestHandler({ sources: [snapshot('alpha'), snapshot('beta')] });
  const calls: URL[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url = new URL(String(input)); calls.push(url);
    return handler(new Request(url, init));
  };
  const omitted = await handler(new Request('https://docs.example/content/v1/resources?' + new URLSearchParams(publication)));
  assert.equal(omitted.status, 400);
  assert.match((await omitted.json()).error.message, /product is required/);
  for (const product of ['alpha', 'beta']) {
    const source = await openRestContentSource({ baseUrl: 'https://docs.example/content/v1', publication: { ...publication, product }, fetch: fetcher });
    assert.equal(source.publication.product, product);
    assert.equal((await source.get({ kind: 'page', documentId: 'guide.start' }, { format: 'html' })).content, `<p>${product} instructions.</p>`);
    assert.equal(calls.at(-1)!.searchParams.get('product'), product);
    assert.equal(calls.at(-1)!.searchParams.get('revision'), sha(product));
    source.dispose();
  }
  const wrong = await handler(new Request('https://docs.example/content/v1/resources?' + new URLSearchParams({ ...publication, product: 'missing' })));
  assert.equal(wrong.status, 404);
});

test('REST client rejects a different product or legacy envelope before fetching representation bytes', async () => {
  const handler = createContentRestHandler({ sources: [snapshot('beta')] });
  for (const legacy of [false, true]) {
    let calls = 0;
    await assert.rejects(openRestContentSource({ baseUrl: 'https://docs.example/content/v1', publication: { ...publication, product: 'alpha' }, fetch: async () => {
      calls++;
      const response = await handler(new Request('https://docs.example/content/v1/resources?' + new URLSearchParams({ ...publication, product: 'beta' })));
      const body = await response.json();
      if (legacy) { body.schemaVersion = 1; body.publication.product = 'alpha'; }
      return new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });
    } }), { code: 'invalid_manifest' });
    assert.equal(calls, 1);
  }
});

test('product exports retain their coordinate in v2 manifests, delivery, schema validation and reference comparisons', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-product-export-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(path.join(directory, 'content'));
  const config = path.join(directory, 'docs.config.yaml');
  await writeFile(config, `schemaVersion: 1
publications:
  defaults: { channel: production, language: en }
  channels: { production: {} }
  products:
    alpha: { pathPrefix: /alpha, defaultVersion: v3, versions: { v3: {} } }
    beta: { pathPrefix: /beta, defaultVersion: v1, versions: { v1: {} } }
  enabled:
    - { product: alpha, channel: production, version: v3 }
    - { product: beta, channel: production, version: v1 }
frontmatter:
  defaults: { type: guide, channel: production, access: { policy: public } }
`);
  for (const [product, version] of [['alpha', 'v3'], ['beta', 'v1']]) {
    await writeFile(path.join(directory, 'content', product + '.md'), `---\nid: guide.start\ntitle: Start\nsummary: Instructions.\nslug: /start\nproduct: ${product}\nversion: ${version}\n---\n${product} instructions.\n`);
  }
  await assert.rejects(exportContent(config, path.join(directory, 'ambiguous')), /multiple enabled publications/);
  await assert.rejects(exportContent(config, path.join(directory, 'unscoped'), { publication: { ...publication, version: 'v3' } }), /not enabled/);
  const manifests: ContentManifest[] = [];
  const schema = JSON.parse(await readFile(fileURLToPath(new URL('../schemas/content-export.schema.json', import.meta.url)), 'utf8'));
  const Ajv = (await import('ajv/dist/2020.js')).default as any;
  const validate = new Ajv({ strict: false, formats: { uri: true } }).compile(schema);
  for (const [product, version] of [['alpha', 'v3'], ['beta', 'v1']]) {
    const output = path.join(directory, product);
    await exportContent(config, output, { publication: { ...publication, product, version } });
    const manifest = JSON.parse(await readFile(path.join(output, 'manifest.json'), 'utf8')) as ContentManifest;
    assert.equal(manifest.schemaVersion, 2);
    assert.equal(manifest.publication.product, product);
    assert.equal(validate(manifest), true, JSON.stringify(validate.errors));
    validateContentManifest(manifest);
    assert.equal(manifest.resources.length, 1);
    const resource = manifest.resources[0];
    assert.equal(resource.publication.product, product);
    const source = await openManifestContentSource({ manifestUrl: 'https://docs.example/manifest.json', fetch: async input => {
      const pathname = new URL(String(input)).pathname.slice(1);
      return new Response(await readFile(path.join(output, pathname)), { headers: { 'content-type': pathname === 'manifest.json' ? 'application/json' : 'text/html' } });
    } });
    assert.match((await source.get(resource.ref, { format: 'html' })).content, new RegExp(product + ' instructions'));
    source.dispose();
    const legacy = { ...manifest, schemaVersion: 1 };
    assert.equal(validate(legacy), false);
    assert.throws(() => validateContentManifest(legacy), /Invalid publication/);
    manifests.push(manifest);
  }
  const changed = compareContentManifests(manifests[0], manifests[1]);
  assert.equal(changed.removed[0].publication.product, 'alpha');
  assert.equal(changed.added[0].publication.product, 'beta');
  assert.notEqual(manifests[0].resources[0].representations.html!.path, manifests[1].resources[0].representations.html!.path);
});
