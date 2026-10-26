import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { compile } from './compiler.js';
import { resolveMcp } from './mcp-config.js';
import { loadMcpRuntime, createMcpHttpHandler } from './mcp-http.js';
import { serveSite } from './server.js';

test('MCP configuration requires explicit public scope and safe paths', () => {
  assert.equal(resolveMcp(undefined), undefined);
  assert.equal(resolveMcp(false), undefined);
  assert.equal(resolveMcp({ enabled: false }), undefined);
  const valid = { enabled: true, access: 'public', publication: { channel: 'production', version: 'current', language: 'en' } };
  assert.equal(resolveMcp(valid)?.path, '/mcp');
  for (const consent of [{ header: 'Authorization', value: 'v1' }, { header: 'x-forwarded-for', value: 'v1' }, { header: 'x-consent', value: '' }, { header: 'x-consent', value: 'two words' }, { header: 'x-consent', value: 'v1', extra: true }]) assert.throws(() => resolveMcp({ ...valid, analytics: { module: './adapter.mjs', consent } }));
  for (const value of [true, {}, { ...valid, access: 'private' }, { ...valid, publication: {} }, { ...valid, path: '/../files' }, { ...valid, path: '/__shoalrun/runtime' }, { ...valid, allowedHosts: ['*.example.com'] }, { ...valid, allowedOrigins: ['https://docs.example/path'] }, { ...valid, unknown: true }]) assert.throws(() => resolveMcp(value));
});

async function fixture(t: { after: (callback: () => Promise<unknown>) => void }) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-http-mcp-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'content'));
  const config: any = {
    schemaVersion: 1, site: { title: 'MCP fixture', basePath: '/docs', origin: 'https://docs.example.test' },
    frontmatter: { defaults: { type: 'reference', channel: 'production', version: 'current', language: 'en', access: { policy: 'public' } } },
    publications: { defaults: { channel: 'production', version: 'current', language: 'en' }, channels: { production: {}, beta: { pathPrefix: '/beta' } }, versions: { current: {} }, enabled: [{ channel: 'production', version: 'current', language: 'en' }, { channel: 'beta', version: 'current', language: 'en' }] },
    outputs: { html: { search: { provider: 'none' }, shareImages: false } },
    mcp: { enabled: true, access: 'public', publication: { language: 'en', channel: 'production', version: 'current' } },
  };
  for (const [id, channel, policy, body] of [['intro', 'production', 'public', 'Welcome to the public guide.'], ['excluded', 'beta', 'public', 'BETA_SECRET_TITLE'], ['private', 'production', 'internal', 'PRIVATE_SECRET_TEXT']]) await writeFile(path.join(root, 'content', `${id}.mdx`), `---\n${JSON.stringify({ id, title: id === 'excluded' ? body : id, slug: `/${id}`, summary: `${id} summary`, channel, access: { policy } })}\n---\n${body}\n\n## Details\n\nRead this complete section. ${id === 'intro' ? ('A useful explanation of the public documentation. '.repeat(110) + '\n\n## More detail\n\n' + 'Additional material for readers. '.repeat(220) + '\n\n## Final detail\n\n' + 'Further context and instructions. '.repeat(220)) : ''}\n`);
  const file = path.join(root, 'docs.config.yaml'), output = path.join(root, 'site');
  const build = async () => { await writeFile(file, JSON.stringify(config)); return compile(file, output); };
  return { root, config, output, file, build };
}

test('MCP builds a scoped corpus independently of browser search, validates identity, and removes disabled output', async t => {
  const f = await fixture(t);
  await f.build();
  const loaded = (await loadMcpRuntime(f.output))!;
  assert.equal(loaded.runtime.path, '/docs/mcp');
  await assert.rejects(readFile(path.join(f.output, 'search-index.json')), /ENOENT/);
  const manifest = await readFile(path.join(loaded.directory, 'documents.json'), 'utf8');
  const search = await readFile(path.join(loaded.directory, 'search-index.json'), 'utf8');
  assert.ok(!`${manifest}${search}`.includes('BETA_SECRET_TITLE'));
  assert.ok(!`${manifest}${search}`.includes('PRIVATE_SECRET_TEXT'));
  assert.deepEqual(JSON.parse(manifest).documents.map((doc: any) => doc.id), ['intro']);
  assert.equal(await readFile(path.join(loaded.directory, 'docs/intro.md'), 'utf8'), await readFile(path.join(f.output, 'docs/intro.md'), 'utf8'));
  await writeFile(path.join(loaded.directory, 'docs/intro.md'), 'tampered');
  await assert.rejects(loadMcpRuntime(f.output), /mismatch/);
  await f.build();
  const infoFile = path.join(f.output, 'build-info.json');
  const info = await readFile(infoFile, 'utf8');
  await writeFile(infoFile, JSON.stringify({ ...JSON.parse(info), buildId: '0'.repeat(64) }));
  await assert.rejects(loadMcpRuntime(f.output), /identities differ/);
  await writeFile(infoFile, info);
  f.config.outputs.html.search = { provider: 'custom', module: './search.js', index: false };
  await writeFile(path.join(f.root, 'search.js'), 'export async function search() { return []; }');
  await f.build();
  assert.ok(await loadMcpRuntime(f.output), 'MCP indexes do not depend on custom browser search');
  f.config.mcp.path = '/intro';
  await assert.rejects(f.build(), /collision/);
  await loadMcpRuntime(f.output); // a failed build preserved the prior corpus
  f.config.mcp = false;
  await f.build();
  assert.equal(await loadMcpRuntime(f.output), undefined);
  await assert.rejects(readFile(path.join(f.output, '__shoalrun/mcp-data/documents.json')), /ENOENT/);
});

for (const mode of ['legacy', 'auto'] as const) test(`HTTP MCP ${mode} clients discover tools, search, and read only their publication`, async t => {
  const f = await fixture(t); await f.build();
  const server = await serveSite(f.output, '127.0.0.1', 0);
  t.after(() => new Promise<void>(resolve => { server.closeAllConnections(); server.close(() => resolve()); }));
  const url = new URL(`http://127.0.0.1:${(server.address() as any).port}/docs/mcp`);
  const client = new Client({ name: 'shoalrun-http-test', version: '1' }, { versionNegotiation: { mode } });
  t.after(() => client.close());
  await client.connect(new StreamableHTTPClientTransport(url));
  assert.equal((await client.listTools()).tools.length, 4);
  const result = await client.callTool({ name: 'search_docs', arguments: { query: 'public guide' } });
  assert.ok(!result.isError, JSON.stringify(result));
  const data = result.structuredContent as any;
  assert.equal(data.publication.channel, 'production');
  assert.equal(data.results[0].id, 'intro');
  const page = await client.callTool({ name: data.results[0].read.tool, arguments: data.results[0].read.arguments });
  assert.match((page.structuredContent as any).content, /Welcome/);
  const outline = await client.callTool({ name: 'get_outline', arguments: { id: 'intro' } });
  const section = await client.callTool({ name: 'get_section', arguments: { id: 'intro', section: (outline.structuredContent as any).sections[0].id } });
  assert.match((section.structuredContent as any).content, /complete section/);
  for (const [name, args] of [['search_docs', { query: 'secret', channel: 'beta' }], ['get_page', { id: 'excluded' }], ['get_page', { id: 'private' }], ['get_outline', { id: 'intro', language: 'fr' }]] as const) assert.equal((await client.callTool({ name, arguments: args })).isError, true);
  assert.ok((await Promise.all(Array.from({ length: 4 }, () => client.callTool({ name: 'get_page', arguments: { id: 'intro' } })))).every(r => !r.isError));
  const oversized = await client.callTool({ name: 'get_page', arguments: { id: 'intro', extra: Array(1025).fill(0) } });
  assert.equal(oversized.isError, true);
  assert.match(JSON.stringify(oversized.content), /maximum of 1024 elements/);
  assert.ok(!(await client.callTool({ name: 'get_page', arguments: { id: 'intro' } })).isError, 'rejected inputs do not break later requests');
  assert.equal((await fetch(url, { method: 'POST', body: 'x'.repeat(65_537) })).status, 413);
  assert.equal((await fetch(url)).status, 405);
  assert.equal((await fetch(url, { method: 'DELETE' })).status, 405);
  assert.equal((await fetch(new URL('/mcp-runtime.json', url))).status, 404);
  assert.equal((await fetch(new URL('/MCP-runtime.json/', url))).status, 404);
  assert.equal((await fetch(new URL('/__shoalrun/mcp-data/documents.json', url))).status, 404);
  assert.equal((await fetch(url, { method: 'POST', headers: { Origin: 'https://evil.example' }, body: '{}' })).status, 403);
  assert.equal((await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' }, body: '{broken' })).status, 400);
});

test('HTTP MCP validates host and CORS without trusting forwarded headers', async t => {
  const f = await fixture(t); await f.build();
  const handler = createMcpHttpHandler((await loadMcpRuntime(f.output))!);
  assert.equal((await handler(new Request('https://evil.example/docs/mcp', { headers: { 'x-forwarded-host': 'docs.example.test' } }))).status, 403);
  assert.equal((await handler(new Request('https://docs.example.test/docs/mcp', { method: 'OPTIONS', headers: { origin: 'https://docs.example.test' } }))).headers.get('Access-Control-Allow-Origin'), 'https://docs.example.test');
  assert.match((await handler(new Request('https://docs.example.test/docs/mcp', { method: 'OPTIONS', headers: { origin: 'https://docs.example.test' } }))).headers.get('Access-Control-Expose-Headers') ?? '', /(?:^|,\s*)Mcp-Session-Id(?:,|$)/i);
  assert.equal((await handler(new Request('https://docs.example.test/docs/mcp', { method: 'OPTIONS', headers: { origin: 'https://evil.example' } }))).status, 403);
});


test('HTTP MCP bounds concurrent work and releases capacity on cancellation', async t => {
  const f = await fixture(t); await f.build();
  const handler = createMcpHttpHandler((await loadMcpRuntime(f.output))!);
  const cancellations: AbortController[] = [];
  const bodies: ReadableStreamDefaultController<Uint8Array>[] = [];
  const pending = Array.from({ length: 8 }, () => {
    const abort = new AbortController(); cancellations.push(abort);
    const body = new ReadableStream<Uint8Array>({ start(stream) { bodies.push(stream); } });
    return handler(new Request('https://docs.example.test/docs/mcp', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' }, body, signal: abort.signal, duplex: 'half' } as RequestInit));
  });
  const rejected = await handler(new Request('https://docs.example.test/docs/mcp', { method: 'POST', body: '{}' }));
  assert.equal(rejected.status, 429);
  assert.equal(rejected.headers.get('Retry-After'), '1');
  for (const abort of cancellations) abort.abort(new Error('Client cancelled'));
  for (const body of bodies) body.error(new Error('Client cancelled'));
  assert.ok((await Promise.all(pending)).every(response => response.status === 503));
  const next = await handler(new Request('https://docs.example.test/docs/mcp', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' }, body: '{broken' }));
  assert.notEqual(next.status, 429);
  await next.text();
});


test('watching Node servers follow endpoint changes and disablement after successful builds', async t => {
  const f = await fixture(t); await f.build();
  const server = await serveSite(f.output, '127.0.0.1', 0, new Set());
  t.after(() => new Promise<void>(resolve => { server.closeAllConnections(); server.close(() => resolve()); }));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  assert.equal((await fetch(`${base}/docs/mcp`)).status, 405);
  f.config.mcp.path = '/agent'; await f.build();
  assert.equal((await fetch(`${base}/docs/mcp`)).status, 404);
  assert.equal((await fetch(`${base}/docs/agent`)).status, 405);
  f.config.mcp.path = '/intro'; await assert.rejects(f.build(), /collision/);
  assert.equal((await fetch(`${base}/docs/agent`)).status, 405, 'failed builds preserve the prior endpoint');
  f.config.mcp = false; await f.build();
  assert.equal((await fetch(`${base}/docs/agent`)).status, 404);
});

test('MCP analytics requires caller consent and withdrawal preserves read-only access', async t => {
  const f = await fixture(t);
  const events = path.join(f.root, 'events.jsonl');
  await writeFile(path.join(f.root, 'adapter.mjs'), `import { appendFile } from 'node:fs/promises';\nawait appendFile(${JSON.stringify(events)}, 'loaded\\n');\nexport async function capture(event) { await appendFile(${JSON.stringify(events)}, event.tool + '\\n'); }`);
  f.config.mcp.analytics = { module: './adapter.mjs', consent: { header: 'x-analytics-consent', value: 'v1' } };
  await f.build();
  const handler = createMcpHttpHandler((await loadMcpRuntime(f.output))!);
  const call = async (consent?: string, extra = {}) => {
    const response = await handler(new Request('https://docs.example.test/docs/mcp', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', 'MCP-Protocol-Version': '2025-11-25', ...(consent ? { 'x-analytics-consent': consent } : {}) }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'get_page', arguments: { id: 'intro', maxTokens: 9000, ...extra } } }) }));
    assert.equal(response.status, 200);
    return JSON.parse(await response.text());
  };
  assert.equal((await call()).result.isError, undefined);
  assert.equal((await call('wrong')).result.isError, undefined);
  await assert.rejects(readFile(events), /ENOENT/, 'adapter must not even load before consent');
  assert.equal((await call('v1')).result.isError, undefined);
  assert.equal(await readFile(events, 'utf8'), 'loaded\nget_page\n');
  assert.equal((await call(undefined, { context: 'private goal', llm_model: 'some-model', conversation_id: 'old-session' })).result.isError, undefined);
  assert.equal(await readFile(events, 'utf8'), 'loaded\nget_page\n', 'withdrawal stops events even after adapter is cached');
  const rejected = await call(undefined, { unrecognized: 'reject' });
  assert.ok(rejected.result?.isError || rejected.error);
});
