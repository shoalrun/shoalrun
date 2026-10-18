import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import YAML from 'yaml';
import { ApiReader } from './api.js';
import { compile } from './compiler.js';
import { focusedOpenApi } from './focused-openapi.js';
import { importRemoteOpenApi, isPublicImportAddress, refreshRemoteOpenApi } from './remote-import.js';

const entryUrl = 'https://spec.example.test/api/openapi.yaml';
const schemaUrl = 'https://spec.example.test/api/schemas/thing.yaml';
const schemaFile = (directory: string) => path.join(directory, 'refs', `${createHash('sha256').update(schemaUrl).digest('hex')}.yaml`);

test('import address filter accepts public addresses and rejects private and mapped addresses', () => {
  assert.equal(isPublicImportAddress('185.199.111.133', 4), true);
  assert.equal(isPublicImportAddress('2606:50c0:8003::154', 6), true);
  assert.equal(isPublicImportAddress('127.0.0.1', 4), false);
  assert.equal(isPublicImportAddress('::ffff:127.0.0.1', 6), false);
  assert.equal(isPublicImportAddress('fe80::1', 6), false);
});

function entry() {
  return `openapi: 3.1.0
info: { title: Things, version: '1' }
paths:
  /things:
    get:
      operationId: listThings
      responses:
        '200':
          description: Listed.
          content:
            application/json:
              schema: { $ref: './schemas/thing.yaml#/Thing' }
              examples:
                sample:
                  value:
                    $ref: https://untrusted.example.test/not-a-reference.yaml
`;
}

test('remote import snapshots same-origin refs and leaves example payloads literal', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-remote-import-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const directory = path.join(root, 'snapshot');
  const requested: string[] = [];
  const source = new Map([
    [entryUrl, entry()],
    [schemaUrl, `Thing:\n  type: object\n  properties:\n    label: { type: string }\n`]
  ]);
  const download = async (url: URL): Promise<Buffer> => {
    requested.push(url.href);
    const content = source.get(url.href);
    assert.ok(content, `unexpected download ${url.href}`);
    return Buffer.from(content);
  };

  const imported = await importRemoteOpenApi(entryUrl, directory, { download });
  assert.equal(imported.status, 'imported');
  assert.deepEqual(requested, [entryUrl, schemaUrl]);
  assert.equal(imported.files.length, 2);

  const savedEntry = path.join(directory, 'openapi.yaml');
  const saved = YAML.parse(await readFile(savedEntry, 'utf8'));
  const rewritten = saved.paths['/things'].get.responses['200'].content['application/json'].schema.$ref;
  assert.equal(rewritten, `./refs/${path.basename(schemaFile(directory))}#/Thing`);
  assert.equal(saved.paths['/things'].get.responses['200'].content['application/json'].examples.sample.value.$ref,
    'https://untrusted.example.test/not-a-reference.yaml');
  assert.match(await readFile(schemaFile(directory), 'utf8'), /label/);

  const reader = new ApiReader();
  assert.deepEqual(await reader.collectReferences(savedEntry), [savedEntry, schemaFile(directory)].sort());
  const operation = await reader.operation(savedEntry, 'listThings');
  assert.equal(operation.examples.length, 1);
  assert.deepEqual(operation.examples[0].value, { $ref: 'https://untrusted.example.test/not-a-reference.yaml' });
});

test('user-named schema keys that resemble extensions still resolve references', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-remote-schema-key-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const directory = path.join(root, 'snapshot');
  const source = new Map([
    [entryUrl, `openapi: 3.1.0\ninfo: { title: Things, version: '1' }\npaths:\n  /things:\n    get:\n      operationId: listThings\n      responses:\n        '200':\n          description: Listed.\n          content:\n            application/json:\n              schema:\n                type: object\n                properties:\n                  x-detail: { $ref: ./schemas/thing.yaml }\n                  '$ref': { $ref: ./schemas/thing.yaml }\n                  example: { $ref: ./schemas/thing.yaml }\n`],
    [schemaUrl, `type: string\n`]
  ]);
  const download = async (url: URL) => {
    const value = source.get(url.href);
    assert.ok(value, `unexpected download ${url.href}`);
    return Buffer.from(value);
  };
  const imported = await importRemoteOpenApi(entryUrl, directory, { download });
  assert.equal(imported.files.length, 2);
  assert.equal((await new ApiReader().operation(path.join(directory, 'openapi.yaml'), 'listThings')).method, 'get');
});

test('external OpenAPI 3.1 boolean schemas remain valid snapshot files', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-remote-boolean-schema-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const directory = path.join(root, 'snapshot');
  const schema = 'https://spec.example.test/api/allow.yaml';
  const download = async (url: URL) => Buffer.from(url.href === entryUrl
    ? `openapi: 3.1.0\ninfo: { title: Things, version: '1' }\npaths:\n  /things:\n    get:\n      operationId: listThings\n      responses:\n        '200':\n          description: Listed.\n          content:\n            application/json:\n              schema: { $ref: ./allow.yaml }\n`
    : url.href === schema ? 'true\n' : (() => { throw new Error(`unexpected download ${url.href}`); })());
  const imported = await importRemoteOpenApi(entryUrl, directory, { download });
  assert.equal(imported.files.length, 2);
  assert.equal((await new ApiReader().operation(path.join(directory, 'openapi.yaml'), 'listThings')).method, 'get');
});

test('encoded fragment separators remain part of JSON Pointer property names', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-remote-pointer-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const directory = path.join(root, 'snapshot');
  const schema = 'https://spec.example.test/api/schema.yaml';
  const download = async (url: URL) => Buffer.from(url.href === entryUrl
    ? `openapi: 3.1.0\ninfo: { title: Things, version: '1' }\npaths:\n  /things:\n    get:\n      operationId: listThings\n      responses:\n        '200':\n          description: Listed.\n          content:\n            application/json:\n              schema: { $ref: './schema.yaml#/properties/a%23b' }\n`
    : url.href === schema ? `type: object\nproperties:\n  'a#b': { type: string }\n` : (() => { throw new Error(`unexpected download ${url.href}`); })());
  await importRemoteOpenApi(entryUrl, directory, { download });
  const source = path.join(directory, 'openapi.yaml');
  assert.equal((await new ApiReader().operation(source, 'listThings')).method, 'get');
  assert.equal((await focusedOpenApi(new ApiReader(), source, 'listThings')).paths['/things'].get.operationId, 'listThings');
});

test('remote refresh reports unchanged bytes and updates a changed referenced document', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-remote-refresh-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const directory = path.join(root, 'snapshot');
  const source = new Map([
    [entryUrl, entry()],
    [schemaUrl, `Thing:\n  type: object\n  properties:\n    label: { type: string }\n`]
  ]);
  const download = async (url: URL): Promise<Buffer> => {
    const content = source.get(url.href);
    assert.ok(content, `unexpected download ${url.href}`);
    return Buffer.from(content);
  };

  await importRemoteOpenApi(entryUrl, directory, { download });
  assert.equal((await refreshRemoteOpenApi(directory, { download })).status, 'unchanged');
  source.set(schemaUrl, `Thing:\n  type: object\n  properties:\n    label: { type: string }\n    count: { type: integer }\n`);
  const refreshed = await refreshRemoteOpenApi(directory, { download });
  assert.equal(refreshed.status, 'updated');
  assert.equal(refreshed.files.length, 2);
  assert.doesNotMatch(await readFile(schemaFile(directory), 'utf8'), /count/);
  assert.match(await readFile(schemaFile(refreshed.directory), 'utf8'), /count/);
  assert.equal((await refreshRemoteOpenApi(directory, { download })).directory, refreshed.directory);
  assert.equal((await refreshRemoteOpenApi(refreshed.directory, { download })).status, 'unchanged');
  await writeFile(schemaFile(refreshed.directory), 'Thing: { type: string }\n');
  await assert.rejects(refreshRemoteOpenApi(refreshed.directory, { download }), /Local OpenAPI snapshot changed since import/);
});

test('remote import rejects non-HTTPS entries and cross-origin references', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-remote-unsafe-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const directory = path.join(root, 'snapshot');
  const download = async (url: URL): Promise<Buffer> => {
    assert.equal(url.href, entryUrl, 'unsafe referenced URL must not be downloaded');
    return Buffer.from(entry().replace('./schemas/thing.yaml#/Thing', 'https://other.example.test/thing.yaml#/Thing'));
  };
  await assert.rejects(importRemoteOpenApi('http://spec.example.test/api/openapi.yaml', directory, { download }), /HTTPS|https|Unsafe|unsafe/);
  await assert.rejects(importRemoteOpenApi(entryUrl, directory, { download }), /origin|remote|HTTPS|https|Unsafe|unsafe/);
});

test('remote import resolves parent-directory refs within the same origin', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-remote-parent-ref-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const directory = path.join(root, 'snapshot');
  const parentEntry = 'https://spec.example.test/api/v1/openapi.yaml';
  const parentSchema = 'https://spec.example.test/api/schema.yaml';
  const download = async (url: URL): Promise<Buffer> => {
    if (url.href === parentEntry) return Buffer.from(entry().replace('./schemas/thing.yaml#/Thing', '../schema.yaml#/Thing'));
    assert.equal(url.href, parentSchema);
    return Buffer.from(`Thing:\n  type: string\n`);
  };

  const result = await importRemoteOpenApi(parentEntry, directory, { download });
  assert.deepEqual(result.files.map(file => file.url).sort(), [parentEntry, parentSchema].sort());
  const savedEntry = path.join(directory, 'openapi.yaml');
  const saved = YAML.parse(await readFile(savedEntry, 'utf8'));
  assert.equal(saved.paths['/things'].get.responses['200'].content['application/json'].schema.$ref,
    `./refs/${createHash('sha256').update(parentSchema).digest('hex')}.yaml#/Thing`);
  assert.equal((await new ApiReader().collectReferences(savedEntry)).length, 2);
});

test('external path items retain their reference base through rendering and focused export', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-remote-path-item-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const directory = path.join(root, 'snapshot');
  const base = 'https://spec.example.test/api/';
  const sources = new Map([
    [`${base}openapi.yaml`, `openapi: 3.1.0\ninfo: { title: Things, version: '1' }\npaths:\n  /things: { $ref: ./paths/things.yaml }\n`],
    [`${base}paths/things.yaml`, `get:\n  operationId: listThings\n  responses:\n    '200':\n      description: Listed.\n      content:\n        application/json:\n          schema: { $ref: ../schemas/Thing.yaml }\n`],
    [`${base}schemas/Thing.yaml`, `oneOf:\n  - { $ref: ./A.yaml }\n  - { $ref: ./B.yaml }\ndiscriminator:\n  propertyName: kind\n  mapping: { a: ./A.yaml, b: ./B.yaml }\n`],
    [`${base}schemas/A.yaml`, `type: object\nproperties: { kind: { type: string, const: a } }\n`],
    [`${base}schemas/B.yaml`, `type: object\nproperties: { kind: { type: string, const: b } }\n`]
  ]);
  const download = async (url: URL) => {
    const value = sources.get(url.href);
    assert.ok(value, `unexpected download ${url.href}`);
    return Buffer.from(value);
  };
  const imported = await importRemoteOpenApi(`${base}openapi.yaml`, directory, { download });
  assert.equal(imported.files.length, 5);
  const source = path.join(directory, 'openapi.yaml');
  assert.equal((await new ApiReader().operation(source, 'listThings')).method, 'get');
  assert.ok((await new ApiReader().operationSchema(source, 'listThings', { kind: 'response', mediaType: 'application/json', status: '200' })).length > 1);
  const focused = await focusedOpenApi(new ApiReader(), source, 'listThings');
  assert.equal(focused.paths['/things'].get.operationId, 'listThings');
  assert.ok(Object.keys(focused.components.schemas).length >= 3);
});

test('missing or invalid remote reference leaves no snapshot', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-remote-missing-ref-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const directory = path.join(root, 'snapshot');
  const missing = async (url: URL): Promise<Buffer> => {
    if (url.href === entryUrl) return Buffer.from(entry());
    throw new Error(`Not found: ${url.href}`);
  };
  await assert.rejects(importRemoteOpenApi(entryUrl, directory, { download: missing }), /Not found/);
  await assert.rejects(readFile(path.join(directory, 'openapi.yaml')), /ENOENT/);

  const invalid = async (url: URL): Promise<Buffer> => {
    if (url.href === entryUrl) return Buffer.from(entry());
    return Buffer.from('Thing: { type: [broken');
  };
  await assert.rejects(importRemoteOpenApi(entryUrl, directory, { download: invalid }), /schema|yaml|flow|document|line|end|Thing|unexpected|Nested|Expected/i);
  await assert.rejects(readFile(path.join(directory, 'openapi.yaml')), /ENOENT/);
});

test('imported snapshot builds offline, publishes resolving refs, and requires review after refresh', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-remote-publication-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'content'));
  const directory = path.join(root, 'snapshot');
  const source = new Map([
    [entryUrl, entry()],
    [schemaUrl, `Thing:\n  type: object\n  properties:\n    label: { type: string }\n`]
  ]);
  let downloads = 0;
  const download = async (url: URL): Promise<Buffer> => {
    downloads++;
    const content = source.get(url.href);
    assert.ok(content, `unexpected download ${url.href}`);
    return Buffer.from(content);
  };
  await importRemoteOpenApi(entryUrl, directory, { download });
  assert.equal(downloads, 2);

  const configFile = path.join(root, 'docs.config.yaml');
  const output = path.join(root, 'site');
  const config = {
    schemaVersion: 1,
    site: { title: 'Imported API' },
    publications: {
      defaults: { channel: 'production', version: 'current', language: 'en' },
      channels: { production: {} }, versions: { current: {} },
      enabled: [{ channel: 'production', version: 'current', language: 'en' }]
    },
    apis: { things: { source: { kind: 'file', path: './snapshot/openapi.yaml', publish: true }, generateReferences: true } }
  };
  await writeFile(configFile, JSON.stringify(config));
  const candidate = await compile(configFile, output, {}, { apiReview: 'report' });
  const review = candidate.apiPublicationReview.find(item => item.apiId === 'things');
  assert.ok(review);
  assert.equal(review.inputs[0].files.length, 2);
  assert.equal(downloads, 2, 'review build must use local snapshot only');

  const pinned = { ...config, apis: { things: { ...config.apis.things, publicReview: { digest: review.digest } } } };
  await writeFile(configFile, JSON.stringify(pinned));
  const built = await compile(configFile, output);
  assert.equal(downloads, 2, 'normal build must use local snapshot only');
  const published = built.apiSources[0];
  assert.ok(published);
  const publishedEntry = path.join(output, published.sourceUrl);
  const publicSpec = YAML.parse(await readFile(publishedEntry, 'utf8'));
  const publicRef = publicSpec.paths['/things'].get.responses['200'].content['application/json'].schema.$ref;
  assert.equal(publicRef, `./refs/${path.basename(schemaFile(directory))}#/Thing`);
  assert.match(await readFile(path.join(path.dirname(publishedEntry), 'refs', path.basename(schemaFile(directory))), 'utf8'), /label/);
  assert.equal((await new ApiReader().collectReferences(publishedEntry)).length, 2);

  source.set(schemaUrl, `Thing:\n  type: object\n  properties:\n    label: { type: string }\n    count: { type: integer }\n`);
  const refreshed = await refreshRemoteOpenApi(directory, { download });
  assert.equal(refreshed.status, 'updated');
  await compile(configFile, output);
  pinned.apis.things.source.path = `./${path.relative(root, path.join(refreshed.directory, 'openapi.yaml'))}`;
  await writeFile(configFile, JSON.stringify(pinned));
  await assert.rejects(compile(configFile, output), /publicReview\.digest is stale/);
});
