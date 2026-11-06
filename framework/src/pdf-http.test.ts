import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createPdfHttpHandler, hydratePreparedPdf, loadPdfRuntime } from './pdf-http.js';
import { canonicalSitePath, privateSitePath } from './server.js';

async function fixture(t: { after: (fn: () => Promise<void>) => void }) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-pdf-http-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const key = 'a'.repeat(64);
  const prepared = JSON.stringify({ html: '<!doctype html><h1>Included</h1>', assets: [], styleDigest: 'b'.repeat(64) });
  const hash = createHash('sha256').update(prepared).digest('hex');
  const data = path.join(directory, '__shoalrun/pdf-data');
  await mkdir(data, { recursive: true });
  await writeFile(path.join(data, `${key}.json`), prepared);
  const runtime = { schemaVersion: 1, endpoint: '/__shoalrun/pdf', config: {}, inventory: { [`${key}.json`]: hash }, pages: { [key]: { documentId: 'guide.start', publication: { channel: 'production', version: 'v1', language: 'en' }, title: 'Start', file: `${key}.json`, digest: hash } } };
  await writeFile(path.join(directory, 'pdf-runtime.json'), JSON.stringify(runtime));
  const input = (await loadPdfRuntime(directory))!;
  return { directory, data, key, input, url: `https://docs.example/__shoalrun/pdf?key=${key}` };
}

test('PDF handler serves only inventoried pages and authorizes before rendering', async t => {
  const f = await fixture(t);
  let renders = 0;
  const handler = createPdfHttpHandler(f.input, { render: async prepared => { renders++; assert.match(prepared.html, /Included/); return { bytes: Buffer.from('%PDF-test') }; } });
  for (const request of [new Request(f.url + '&profile=internal'), new Request(f.url.replace(f.key, 'c'.repeat(64)))]) assert.equal((await handler(request)).status, 404);
  assert.equal((await handler(new Request(f.url, { headers: { Origin: 'https://evil.example' } }))).status, 403);
  assert.equal((await handler(new Request(f.url, { headers: { 'Sec-Fetch-Site': 'cross-site' } }))).status, 403);
  assert.equal((await handler(new Request(f.url, { method: 'POST' }))).status, 405);
  assert.equal((await handler(new Request(f.url, { method: 'HEAD' }))).status, 200);
  assert.equal(renders, 0);
  const denied = createPdfHttpHandler(f.input, { authorize: () => false, render: async () => { throw new Error('must not run'); } });
  assert.equal((await denied(new Request(f.url))).status, 403);
  const response = await handler(new Request(f.url));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.match(response.headers.get('content-disposition')!, /guide.start.pdf/);
  assert.equal(await response.text(), '%PDF-test');
  assert.equal(renders, 1);
});

test('PDF handler bounds work before rendering and releases concurrency after failure', async t => {
  const f = await fixture(t);
  let resolve!: () => void;
  const pending = new Promise<void>(done => { resolve = done; });
  const handler = createPdfHttpHandler(f.input, { render: async () => { await pending; throw new Error('synthetic failure'); } });
  const first = handler(new Request(f.url));
  assert.equal((await handler(new Request(f.url))).status, 429);
  resolve();
  assert.equal((await first).status, 503);
  assert.equal((await handler(new Request(f.url))).status, 503);
  let renders = 0;
  const limited = createPdfHttpHandler(f.input, { now: () => 100_000, render: async () => { renders++; return { bytes: Buffer.from('%PDF') }; } });
  for (let i = 0; i < 10; i++) assert.equal((await limited(new Request(f.url))).status, 200);
  assert.equal((await limited(new Request(f.url))).status, 429);
  assert.equal(renders, 10);
});

test('PDF resources reject changed bytes and symlink escapes', async t => {
  const f = await fixture(t);
  await writeFile(path.join(f.data, `${f.key}.json`), '{}');
  await assert.rejects(loadPdfRuntime(f.directory), /integrity/);
  const handler = createPdfHttpHandler(f.input, { render: async () => { throw new Error('must not render'); } });
  assert.equal((await handler(new Request(f.url))).status, 503);
  await rm(path.join(f.data, `${f.key}.json`));
  await symlink(path.join(f.directory, 'pdf-runtime.json'), path.join(f.data, `${f.key}.json`));
  await assert.rejects(loadPdfRuntime(f.directory), /integrity/);
});

test('private site resources use canonical URL separators before access checks', () => {
  for (const url of ['/mcp-runtime.json', '/%2fmcp-runtime.json', '/%2F%2fmcp-runtime.json', '/__shoalrun//mcp-data/documents.json', '/__shoalrun/%2fmcp-data/documents.json', '/__shoalrun%2f%2fmcp-data/documents.json', '/%2fpdf-runtime.json', '/__shoalrun/%2fpdf-data/page.json', '/__shoalrun/%5cpdf-data/page.json']) assert.equal(privateSitePath(canonicalSitePath(url)), true, url);
  assert.equal(privateSitePath(canonicalSitePath('/__shoalrun/pdf/page.pdf')), false);
  assert.equal(privateSitePath(canonicalSitePath('/guide/start')), false);
  assert.throws(() => canonicalSitePath('/%2e%2e%2fprivate'), /Invalid path/);
});

test('prepared PDF hydration rejects ambiguous and unexpected asset records', () => {
  const base = { html: '<h1>Page</h1>', assets: [], styleDigest: 'a'.repeat(64) };
  assert.equal(hydratePreparedPdf(base).assets.size, 0);
  const font = Buffer.alloc(1024 * 1024, 42);
  const hydrated = hydratePreparedPdf({ ...base, assets: [{ path: '/fonts/large.woff2', mediaType: 'font/woff2', base64: font.toString('base64') }] });
  assert.deepEqual(hydrated.assets.get('/fonts/large.woff2')!.bytes, font);
  for (const asset of [{ path: '/../../secret', mediaType: 'image/png', base64: '' }, { path: '/asset.js', mediaType: 'text/javascript', base64: '' }, { path: '/asset.png', mediaType: 'image/png', base64: '!!!!' }]) assert.throws(() => hydratePreparedPdf({ ...base, assets: [asset] }), /Invalid/);
});
