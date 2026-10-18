import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { auditReference } from './reference-audit.js';

test('API audit rejects malformed or unsupported entry documents before treating them as empty APIs', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-invalid-api-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'api.yaml');
  for (const [content, message] of [
    ['- not\n- an API\n', /root must be a mapping/],
    ['openapi: 2.0\ninfo: { title: Test, version: "1" }\n', /3\.0\.x or 3\.1\.x required/],
    ['openapi: 3.1.0\ninfo: { title: Test, version: 1 }\n', /info.title and info.version/],
    ['openapi: 3.1.0\ninfo: { title: Test, version: "1" }\npaths: []\n', /paths must be a mapping/],
    ['openapi: 3.0.3\ninfo: { title: Test, version: "1" }\nwebhooks: {}\n', /webhooks require OpenAPI 3\.1/],
    ['openapi: 3.1.0\nopenapi: 3.0.3\n', /Map keys must be unique/],
  ] as const) {
    await writeFile(file, content);
    await assert.rejects(auditReference(file), message);
  }
  await writeFile(file, 'openapi: 3.1.0\ninfo: { title: Test, version: "1" }\npaths: { /bad: [] }\n');
  const result = await auditReference(file);
  assert.equal(result.status, 'error');
  assert.match(result.failures[0].message, /Path item must be a mapping/);
});

test('API audit reports each unsupported schema keyword with a source pointer', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-schema-audit-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'api.json');
  await writeFile(file, JSON.stringify({
    openapi: '3.1.0', info: { title: 'Test', version: '1' },
    components: { schemas: { Item: { type: 'object', properties: { name: { type: 'string', contentEncoding: 'base64' } }, propertyNames: { pattern: '^[a-z]+$' } } } },
    paths: { '/items': { get: { operationId: 'listItems', responses: { '200': { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Item' }, unevaluatedItems: false } } } } } } } }
  }));
  const result = await auditReference(file);
  assert.equal(result.status, 'error');
  assert.equal(result.rendered, 0);
  assert.deepEqual(result.failures.map(failure => failure.keyword), ['unevaluatedItems', 'propertyNames', 'contentEncoding']);
  assert.deepEqual(result.failures.map(failure => failure.location), [
    '#/paths/~1items/get/responses/200/content/application~1json/schema/unevaluatedItems',
    '#/components/schemas/Item/propertyNames',
    '#/components/schemas/Item/properties/name/contentEncoding'
  ]);
  assert.ok(result.failures.every(failure => failure.source === file && failure.operationId === 'listItems'));
});

test('API audit leaves example payload keywords alone', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-schema-audit-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'api.json');
  await writeFile(file, JSON.stringify({
    openapi: '3.1.0', info: { title: 'Test', version: '1' },
    paths: { '/items': { get: { operationId: 'listItems', responses: { '200': { description: 'OK', content: { 'application/json': { schema: { type: 'object', example: { propertyNames: 1, contentEncoding: 'value' } } } } } } } } }
  }));
  const result = await auditReference(file);
  assert.equal(result.status, 'ok', JSON.stringify(result.failures));
});

test('API audit locates unsupported keywords in a referenced file', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-schema-audit-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'api.json');
  const schemas = path.join(directory, 'schemas.json');
  await writeFile(schemas, JSON.stringify({ Item: { type: 'object', properties: { code: { type: 'string', contentEncoding: 'base64' } } } }));
  await writeFile(file, JSON.stringify({
    openapi: '3.1.0', info: { title: 'Test', version: '1' },
    paths: { '/items': { get: { operationId: 'listItems', responses: { '200': { description: 'OK', content: { 'application/json': { schema: { $ref: './schemas.json#/Item' } } } } } } } }
  }));
  const result = await auditReference(file);
  assert.equal(result.status, 'error');
  assert.deepEqual(result.failures.map(failure => [failure.source, failure.location, failure.keyword]), [[schemas, '#/Item/properties/code/contentEncoding', 'contentEncoding']]);
});

test('API audit checks only the effective parameter schema', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-schema-audit-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'api.json');
  await writeFile(file, JSON.stringify({
    openapi: '3.1.0', info: { title: 'Test', version: '1' },
    paths: { '/items': {
      parameters: [{ in: 'query', name: 'code', schema: { type: 'string', contentEncoding: 'base64' } }],
      get: { operationId: 'listItems', parameters: [{ in: 'query', name: 'code', schema: { type: 'string' } }], responses: { '200': { description: 'OK' } } }
    } }
  }));
  const result = await auditReference(file);
  assert.equal(result.status, 'ok', JSON.stringify(result.failures));
});
