import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { ApiReader } from './api.js';
import { focusedOpenApi } from './focused-openapi.js';
import { root, renderMarkdown } from './content.js';
import { renderHtml } from './html-renderer.js';

async function fixture(t: any, response: any, openapi = '3.1.0') {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-response-headers-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'api.json');
  await writeFile(file, JSON.stringify({ openapi, info: { title: 'Header API', version: '1' }, paths: { '/items': { get: { operationId: 'listItems', responses: { '200': response } } } } }));
  return { directory, file, reader: new ApiReader(directory) };
}

test('native response headers retain descriptions, presence, deprecation, constraints and examples in HTML and Markdown', async t => {
  const f = await fixture(t, { description: 'Items returned.', headers: {
    ETag: { description: 'A **strong validator**.', required: true, schema: { type: 'string', pattern: '^".+"$', minLength: 3 }, example: '"abc"' },
    'X-Remaining': { description: 'Requests left.', deprecated: true, schema: { type: 'integer', minimum: 0, maximum: 100 }, examples: { limited: { summary: 'Almost exhausted', description: 'Before reset.', value: 2 } } },
    'X-Tags': { schema: { type: 'array', items: { type: 'string' } }, style: 'simple', explode: true }
  } });
  const generated = await f.reader.operation(f.file, 'listItems');
  for (const output of [renderHtml(root(generated.blocks)), renderMarkdown(root(generated.blocks))]) {
    for (const expected of ['Response headers', 'ETag', 'strong validator', 'Required', 'Optional', 'Deprecated response header.', 'minLength: 3', 'minimum: 0', 'maximum: 100', 'Almost exhausted', 'Before reset.', 'Serialization: simple; explode: true.']) assert.ok(output.includes(expected), expected);
  }
  assert.match(renderHtml(root(generated.blocks)), /class="api-parameter api-response-header-field"/);
  assert.deepEqual(generated.examples.map(example => [example.location, example.status, example.value]), [['response-header:ETag', '200', '"abc"'], ['response-header:X-Remaining', '200', 2]]);
});

test('external response/header/schema/example references remain complete in focused contracts', async t => {
  const f = await fixture(t, { $ref: './definitions.json#/response' });
  await writeFile(path.join(f.directory, 'definitions.json'), JSON.stringify({ response: { description: 'Referenced response.', headers: { ETag: { $ref: '#/header', description: 'Local validator description.' } } }, header: { description: 'Original description.', required: true, schema: { $ref: './schemas.json#/validator' }, examples: { normal: { $ref: '#/sample' } } }, sample: { value: '"abc"' } }));
  await writeFile(path.join(f.directory, 'schemas.json'), JSON.stringify({ validator: { type: 'string', minLength: 3 } }));
  const rendered = renderMarkdown(root((await f.reader.operation(f.file, 'listItems')).blocks));
  assert.match(rendered, /Local validator description/);
  assert.doesNotMatch(rendered, /Original description/);
  assert.match(rendered, /minLength: 3/);
  const contract = await focusedOpenApi(f.reader, f.file, 'listItems');
  const focusedFile = path.join(f.directory, 'focused.json');
  await writeFile(focusedFile, JSON.stringify(contract));
  const focusedReader = new ApiReader(f.directory);
  const focused = await focusedReader.operation(focusedFile, 'listItems');
  const output = renderMarkdown(root(focused.blocks));
  assert.match(output, /Local validator description/);
  assert.match(output, /minLength: 3/);
  assert.equal(focused.examples[0].value, '"abc"');
  assert.equal((await focusedReader.collectReferences(focusedFile)).length, 1);
});

test('response Content-Type headers are ignored as required by OpenAPI, while other duplicates fail', async t => {
  const f = await fixture(t, { description: 'Response.', headers: { 'content-type': { content: { 'text/plain': {} } }, 'Content-Type': { $ref: './missing.json#/ignored' }, ETag: { schema: { type: 'string' } } } });
  const output = renderMarkdown(root((await f.reader.operation(f.file, 'listItems')).blocks));
  assert.match(output, /ETag/);
  assert.doesNotMatch(output, /content-type/i);
  const duplicate = await fixture(t, { description: 'Response.', headers: { ETag: { schema: { type: 'string' } }, etag: { schema: { type: 'string' } } } });
  await assert.rejects(duplicate.reader.operation(duplicate.file, 'listItems'), /Duplicate response header name/);
});

test('unsupported header semantics and response links fail explicitly', async t => {
  const cases = [
    [{ content: { 'text/plain': { schema: { type: 'string' } } } }, /header content needs an adapter/],
    [{ schema: { type: 'string' }, style: 'form' }, /style must be simple/],
    [{ schema: { type: 'string' }, required: 'true' }, /required must be boolean/],
    [{ schema: { type: 'string' }, allowReserved: true }, /Unsupported response header field/],
    [{ description: 'No schema.' }, /requires a schema/],
    [{ schema: { type: 'string', unsupported: true } }, /Unsupported schema keyword/],
    [{ schema: { type: 'string' }, example: 'x', examples: { named: { value: 'y' } } }, /cannot define both example and examples/]
  ] as const;
  for (const [header, expected] of cases) {
    const f = await fixture(t, { description: 'Response.', headers: { 'X-Header': header } });
    await assert.rejects(f.reader.operation(f.file, 'listItems'), expected);
  }
  const f = await fixture(t, { description: 'Response.', links: { next: { operationId: 'next' } } });
  await assert.rejects(f.reader.operation(f.file, 'listItems'), /Response links need an adapter/);
});

test('OpenAPI 3.0 schema-backed headers render without relaxing schema version rules', async t => {
  const f = await fixture(t, { description: 'Response.', headers: { 'X-Rate': { schema: { type: 'integer', minimum: 0, exclusiveMinimum: true } } } }, '3.0.3');
  assert.match(renderMarkdown(root((await f.reader.operation(f.file, 'listItems')).blocks)), /exclusiveMinimum: true/);
});


test('all REST contract operations render native cache and validator response headers', async () => {
  const file = fileURLToPath(new URL('../schemas/content-rest.openapi.json', import.meta.url));
  const schema = JSON.parse(await readFile(file, 'utf8'));
  const reader = new ApiReader();
  let count = 0;
  for (const item of Object.values<any>(schema.paths)) for (const operation of Object.values<any>(item)) {
    const output = renderMarkdown(root((await reader.operation(file, operation.operationId)).blocks));
    assert.match(output, /Response headers/);
    assert.match(output, /ETag/);
    assert.match(output, /Cache-Control/);
    count++;
  }
  assert.equal(count, 6);
});
