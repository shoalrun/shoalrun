import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createContentRestHandler } from './content-rest-server.js';
import { contentResourceKey } from './content-rest-contract.js';
import { ContentDeliveryError } from './content-delivery-contract.js';
import type { ContentSnapshot, ContentResource } from './content-delivery-contract.js';
const sha = (value: string) => createHash('sha256').update(value).digest('hex');
const revision = sha('revision');
const publication = { channel: 'production', version: 'current', language: 'en' };
const body = '<p>Refunds café.</p>\n';
function fixture() {
  const resource: ContentResource = { ref: { kind: 'section', documentId: 'billing', sectionId: 'refunds' }, publication,
    title: 'Refunds', summary: 'Refund help.', type: 'section', assets: [], externalDependencies: [],
    representations: { html: { path: 'content/refunds.html', bytes: Buffer.byteLength(body), digest: sha(body), mediaType: 'text/html', anchors: [], links: [] } } };
  let disposed = false;
  let receivedSignal: AbortSignal | undefined;
  let gets = 0;
  const source: ContentSnapshot = { revision, publication, list: () => [resource], async get(ref, options) {
    gets++; receivedSignal = options.signal;
    return { resource, representation: resource.representations.html!, format: options.format, revision, content: body };
  }, dispose() { disposed = true; } };
  const handler = createContentRestHandler({ sources: [source] });
  const query = new URLSearchParams(publication);
  const key = contentResourceKey(resource.ref);
  const request = (suffix = '', pinned = true, init?: RequestInit) => handler(new Request(`https://help.example/content/v1/resources${suffix}?${query}${pinned ? `&revision=${revision}` : ''}`, init));
  return { source, resource, handler, request, key, state: () => ({ disposed, receivedSignal, gets }) };
}

test('REST discovery, pinned metadata and exact representation bytes', async () => {
  const f = fixture();
  const list = await f.request('', false);
  assert.equal(list.status, 200);
  assert.equal(list.headers.get('cache-control'), 'no-cache');
  assert.deepEqual(await list.json(), { schemaVersion: 1, revision, publication, resources: [{ key: f.key, resource: f.resource }] });
  const metadata = await f.request(`/${f.key}`);
  assert.deepEqual(await metadata.json(), { schemaVersion: 1, revision, publication, key: f.key, resource: f.resource });
  const result = await f.request(`/${f.key}/representations/html`);
  assert.equal(result.headers.get('content-type'), 'text/html; charset=utf-8');
  assert.equal(result.headers.get('content-length'), String(Buffer.byteLength(body)));
  assert.equal(result.headers.get('etag'), `"sha256-${sha(body)}"`);
  assert.match(result.headers.get('cache-control')!, /immutable/);
  assert.equal(await result.text(), body);
  assert.equal(f.state().disposed, false);
});

test('HEAD matches GET headers and conditional requests honor weak comparison', async () => {
  const f = fixture();
  for (const suffix of ['', `/${f.key}`, `/${f.key}/representations/html`]) {
    const get = await f.request(suffix);
    const head = await f.request(suffix, true, { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.deepEqual([...head.headers], [...get.headers]);
    assert.equal(await head.text(), '');
    for (const condition of ['*', `"other", W/${get.headers.get('etag')}`]) {
      const conditional = await f.request(suffix, true, { headers: { 'If-None-Match': condition } });
      assert.equal(conditional.status, 304);
      assert.equal(await conditional.text(), '');
      assert.equal(conditional.headers.get('etag'), get.headers.get('etag'));
    }
    assert.equal((await f.request(suffix, true, { headers: { 'If-None-Match': '"other"' } })).status, 200);
  }
});

test('REST rejects ambiguous queries and unpinned reads without fallback', async () => {
  const f = fixture();
  assert.equal((await f.request(`/${f.key}`, false)).status, 400);
  const cases: Array<[string, number, string]> = [
    ['channel=production&version=current', 400, 'invalid_request'],
    ['channel=production&channel=production&version=current&language=en', 400, 'invalid_request'],
    ['channel=production&version=current&language=en&extra=1', 400, 'invalid_request'],
    ['channel=other&version=current&language=en', 404, 'not_found'],
    [`channel=production&version=current&language=en&revision=${sha('old')}`, 409, 'stale_revision'],
    ['channel=production&version=current&language=en&revision=bad', 400, 'invalid_request']
  ];
  for (const [query, status, code] of cases) {
    const response = await f.handler(new Request(`https://help.example/content/v1/resources?${query}`, { headers: { 'If-None-Match': '*' } }));
    assert.equal(response.status, status);
    assert.equal((await response.json()).error.code, code);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
  assert.equal((await f.request('/missing')).status, 404);
  assert.equal((await f.request(`/${f.key}/representations/markdown`)).status, 406);
  assert.equal((await f.request(`/${f.key}/representations/pdf`)).status, 406);
  assert.equal((await f.request(`/${f.key}/extra`)).status, 404);
  const post = await f.request('', true, { method: 'POST' });
  assert.equal(post.status, 405);
  assert.equal(post.headers.get('allow'), 'GET, HEAD');
  assert.equal(f.state().gets, 0);
});

test('REST rejects duplicate publication snapshots and mismatched resource publications', () => {
  const f = fixture();
  assert.throws(() => createContentRestHandler({ sources: [f.source, f.source] }), /distinct publications/);
  f.resource.publication = { ...publication, language: 'fr' };
  assert.throws(() => createContentRestHandler({ sources: [f.source] }), /inconsistent publication/);
  assert.throws(() => createContentRestHandler({ sources: [], basePath: '/content/' }), /basePath/);
});

test('REST forwards abort and never disposes caller sources', async () => {
  const f = fixture();
  const controller = new AbortController();
  await f.request(`/${f.key}/representations/html`, true, { signal: controller.signal });
  assert.ok(f.state().receivedSignal);
  const failure = new DOMException('Cancelled', 'AbortError');
  f.source.get = async (_ref, options) => { controller.abort(failure); options.signal!.throwIfAborted(); throw new Error('unreachable'); };
  await assert.rejects(f.request(`/${f.key}/representations/html`, true, { signal: controller.signal }), { name: 'AbortError' });
  assert.equal(f.state().disposed, false);
});

test('REST hides source errors and refuses changed bytes or metadata', async () => {
  const f = fixture();
  const original = f.source.get;
  for (const mode of ['bytes', 'revision', 'throw']) {
    f.source.get = async (ref, options) => {
      if (mode === 'throw') throw new Error('private filesystem /secret/source');
      const result = await original(ref, options);
      return mode === 'bytes' ? { ...result, content: 'wrong' } : { ...result, revision: sha('new') };
    };
    const response = await f.request(`/${f.key}/representations/html`);
    assert.equal(response.status, mode === 'throw' ? 500 : 409);
    const text = await response.text();
    assert.match(text, mode === 'throw' ? /internal_error/ : /stale_revision/);
    assert.doesNotMatch(text, /secret/);
  }
});

test('REST selects exact publication and supports a custom mount', async () => {
  const f = fixture();
  const frenchPublication = { ...publication, language: 'fr' };
  const frenchResource = { ...f.resource, publication: frenchPublication, title: 'Remboursements' };
  const frenchSource = { ...f.source, publication: frenchPublication, revision: sha('French revision'), list: () => [frenchResource] };
  const handler = createContentRestHandler({ sources: [f.source, frenchSource], basePath: '/api/help/v1' });
  const response = await handler(new Request(`https://help.example/api/help/v1/resources?${new URLSearchParams(frenchPublication)}`));
  const result = await response.json();
  assert.equal(result.publication.language, 'fr');
  assert.equal(result.resources[0].resource.title, 'Remboursements');
  assert.equal(result.resources[0].key, f.key);
  assert.equal(result.revision, frenchSource.revision);
  assert.equal((await handler(new Request(`https://help.example/content/v1/resources?${new URLSearchParams(publication)}`))).status, 404);
});


test('source revision loss returns 409 before conditional requests, including HEAD', async () => {
  const f = fixture();
  for (const code of ['stale_revision', 'not_found'] as const) {
    f.source.get = async () => { throw new ContentDeliveryError(code, 'private source details'); };
    for (const method of ['GET', 'HEAD']) {
      const response = await f.request(`/${f.key}/representations/html`, true, { method, headers: { 'If-None-Match': '*' } });
      assert.equal(response.status, 409);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      const text = await response.text();
      if (method === 'HEAD') assert.equal(text, '');
      else assert.equal(JSON.parse(text).error.code, 'stale_revision');
      assert.doesNotMatch(text, /private/);
    }
  }
});

test('malformed source metadata stays internal_error and extra publication fields are rejected', async () => {
  const f = fixture();
  const original = f.source.get;
  f.source.get = async (ref, options) => ({ ...await original(ref, options), format: 'markdown' });
  const response = await f.request(`/${f.key}/representations/html`);
  assert.equal(response.status, 500);
  assert.equal((await response.json()).error.code, 'internal_error');
  assert.throws(() => createContentRestHandler({ sources: [{ ...f.source, publication: { ...publication, extra: 'field' } as any }] }), /valid revision and publication/);
  assert.throws(() => createContentRestHandler({ sources: [{ ...f.source, publication: { ...publication, channel: 'a'.repeat(2049) } }] }), /valid revision and publication/);
  f.resource.publication = { ...publication, extra: 'field' } as any;
  assert.throws(() => createContentRestHandler({ sources: [f.source] }), /inconsistent publication/);
});
