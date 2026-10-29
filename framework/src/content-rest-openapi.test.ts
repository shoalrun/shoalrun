import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exportContent } from './content-export.js';
import { openManifestContentSource, openRestContentSource } from './content-delivery.js';
import { createContentRestHandler } from './content-rest-server.js';
import { contentResourceKey } from './content-rest-contract.js';

const framework = fileURLToPath(new URL('..', import.meta.url));
test('OpenAPI stays synchronized and validates real exported content over REST', async t => {
  execFileSync(process.execPath, [path.join(framework, 'scripts/build-content-rest-spec.mjs')]);
  const spec = JSON.parse(await readFile(path.join(framework, 'schemas/content-rest.openapi.json'), 'utf8'));
  assert.equal(spec.openapi, '3.1.0');
  assert.equal(Object.keys(spec.paths).length, 3);
  const ids = Object.values(spec.paths).flatMap((item: any) => Object.values(item).map((op: any) => op.operationId));
  assert.equal(new Set(ids).size, 6);
  const Ajv = (await import('ajv/dist/2020.js')).default as any;
  const ajv = new Ajv({ strict: false, formats: { uri: true } });
  const defs = JSON.parse(JSON.stringify(spec.components.schemas).replaceAll('#/components/schemas/', '#/$defs/'));
  const validate = (name: string, value: unknown) => {
    const check = ajv.compile({ $ref: `#/$defs/${name}`, $defs: defs });
    assert.ok(check(value), JSON.stringify(check.errors));
  };
  const sampleList = spec.paths['/resources'].get.responses['200'].content['application/json'].examples.illustrative.value;
  validate('ResourceList', sampleList);
  validate('ResourceMetadata', spec.paths['/resources/{key}'].get.responses['200'].content['application/json'].examples.illustrative.value);
  assert.equal(sampleList.resources[0].key, contentResourceKey(sampleList.resources[0].resource.ref));
  const { createHash } = await import('node:crypto');
  for (const [format, media] of [['html', 'text/html'], ['markdown', 'text/markdown']]) {
    const body = spec.paths['/resources/{key}/representations/{format}'].get.responses['200'].content[media].examples.illustrative.value;
    const descriptor = sampleList.resources[0].resource.representations[format];
    assert.equal(Buffer.byteLength(body), descriptor.bytes);
    assert.equal(createHash('sha256').update(body).digest('hex'), descriptor.digest);
  }
  for (const item of Object.values(spec.paths) as any[]) assert.equal(item.head.responses['200'].content, undefined);
  const dir = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-rest-contract-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await exportContent(path.join(framework, 'examples/content-delivery/docs.config.yaml'), dir, { target: 'app-help' });
  const source = await openManifestContentSource({ manifestUrl: 'https://app.example/help/releases/demo/manifest.json', fetch: (async (url: any) => {
    const filename = new URL(String(url)).pathname.slice('/help/releases/demo/'.length);
    const body = await readFile(path.join(dir, filename));
    return new Response(body, { headers: { 'Content-Type': filename.endsWith('.json') ? 'application/json' : filename.endsWith('.html') ? 'text/html' : 'text/markdown' } });
  }) as typeof fetch });
  t.after(() => source.dispose());
  const handler = createContentRestHandler({ sources: [source] });
  const query = new URLSearchParams(source.publication);
  const listUrl = `https://app.example/content/v1/resources?${query}`;
  const list = await (await handler(new Request(listUrl))).json();
  validate('ResourceList', list);
  const client = await openRestContentSource({ baseUrl: 'https://app.example/content/v1', publication: source.publication, fetch: ((url: any, init?: RequestInit) => handler(new Request(String(url), init))) as typeof fetch });
  t.after(() => client.dispose());
  assert.equal(client.revision, source.revision);
  assert.deepEqual(new Set(client.list().map(x => JSON.stringify(x.ref))), new Set(source.list().map(x => JSON.stringify(x.ref))));
  for (const resource of source.list()) {
    const url = `https://app.example/content/v1/resources/${contentResourceKey(resource.ref)}?${query}&revision=${source.revision}`;
    const metadata = await handler(new Request(url));
    validate('ResourceMetadata', await metadata.json());
    for (const format of ['html', 'markdown'] as const) {
      const [staticResult, restResult] = await Promise.all([source.get(resource.ref, { format }), client.get(resource.ref, { format })]);
      assert.deepEqual(restResult, staticResult);
    }
  }
  for (const url of [listUrl + '&unknown=value', listUrl + '&revision=' + '0'.repeat(64)]) {
    const response = await handler(new Request(url));
    assert.ok(response.status >= 400);
    validate('Error', await response.json());
  }
});

test('REST keys distinguish kinds and preserve Unicode reference identity', () => {
  const refs = [{ kind: 'page', documentId: 'guide.café' }, { kind: 'section', documentId: 'guide.café', sectionId: 'overview' }, { kind: 'snippet', id: 'guide.café' }] as const;
  assert.equal(new Set(refs.map(contentResourceKey)).size, 3);
  for (const ref of refs) assert.match(contentResourceKey(ref), /^k_[A-Za-z0-9_-]+$/);
  assert.equal(contentResourceKey({ documentId: 'guide.café', kind: 'page' }), contentResourceKey(refs[0]));
});

test('native link variants preserve the conditional export contract', async () => {
  const schema = JSON.parse(await readFile(path.join(framework, 'schemas/content-export.schema.json'), 'utf8'));
  const variants = schema.$defs.representation.properties.links.items.oneOf;
  const properties = Object.assign({}, ...variants.map((variant: any) => variant.properties));
  properties.kind = { enum: ['resource', 'canonical', 'external', 'asset'] };
  const original = { type: 'object', additionalProperties: false, required: ['key', 'kind', 'href'], properties, allOf: [
    { if: { properties: { kind: { const: 'resource' } } }, then: { required: ['ref'] }, else: { not: { required: ['ref'] } } },
    { if: { properties: { kind: { const: 'asset' } } }, then: { required: ['asset'] }, else: { not: { required: ['asset'] } } },
  ] };
  const Ajv = (await import('ajv/dist/2020.js')).default as any;
  const ajv = new Ajv({ strict: false, formats: { uri: true } });
  const before = ajv.compile({ ...original, $defs: schema.$defs });
  const after = ajv.compile({ oneOf: variants, $defs: schema.$defs });
  for (const kind of ['resource', 'canonical', 'external', 'asset', 'unknown', undefined]) {
    for (const ref of [undefined, { kind: 'page', documentId: 'billing' }, 'invalid', null]) {
      for (const asset of [undefined, 'assets/chart.svg', '../private', null]) {
        for (const extra of [false, true]) {
          const link = { key: 'link-1', href: '/help/content/page.html', ...(kind === undefined ? {} : { kind }), ...(ref === undefined ? {} : { ref }), ...(asset === undefined ? {} : { asset }), ...(extra ? { unknown: true } : {}) };
          assert.equal(after(link), before(link), JSON.stringify(link));
        }
      }
    }
  }
});
