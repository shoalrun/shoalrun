import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, cp, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import http from 'node:http';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { buildVercel } from './vercel.js';
import { createVercelMcpHandler, vercelMcpNodeAdapter } from './mcp-vercel-runtime.js';
import { loadMcpRuntime } from './mcp-http.js';
import { compile } from './compiler.js';
import { resolveMcp } from './mcp-config.js';
import { attemptAnalytics } from './mcp-analytics.js';

async function fixture(t: { after: (callback: () => Promise<unknown>) => void }) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-vercel-mcp-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'content'));
  const config: any = {
    schemaVersion: 1, site: { title: 'MCP test', basePath: '/docs', origin: 'https://docs.example.test' },
    frontmatter: { defaults: { type: 'reference', channel: 'production', version: 'current', language: 'en', access: { policy: 'public' } } },
    publications: { defaults: { channel: 'production', version: 'current', language: 'en' }, channels: { production: {} }, versions: { current: {} }, enabled: [{ channel: 'production', version: 'current', language: 'en' }] },
    outputs: { html: { search: { provider: 'none' }, shareImages: false } },
    mcp: { enabled: true, access: 'public', allowedHosts: ['127.0.0.1'], publication: { channel: 'production', version: 'current', language: 'en' } },
  };
  await writeFile(path.join(root, 'content/intro.mdx'), '---\nid: intro\ntitle: Introduction\nslug: /intro\nsummary: Public documentation.\n---\nWelcome to the public guide.\n\n## Details\n\nSome documentation to read.\n' + 'Public instructions and background. '.repeat(400) + '\n\n## More\n\n' + 'Additional documentation and context. '.repeat(1000));
  await writeFile(path.join(root, 'content/private.mdx'), '---\nid: private\ntitle: Private\nslug: /private\nsummary: Private documentation.\naccess: { policy: internal }\n---\nPRIVATE_CONTENT_MARKER\n');
  const file = path.join(root, 'config.json'), output = path.join(root, 'output');
  const save = () => writeFile(file, JSON.stringify(config));
  const build = async () => { await save(); return buildVercel(file, output); };
  return { root, config, file, output, save, build };
}
async function connection(t: { after: (callback: () => Promise<unknown>) => void }, handler: (req: http.IncomingMessage, res: http.ServerResponse) => unknown, mode: 'legacy' | 'auto' = 'auto') {
  const server = http.createServer((req, res) => { void handler(req, res); });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise<void>(resolve => { server.closeAllConnections(); server.close(() => resolve()); }));
  const client = new Client({ name: 'mcp-vercel-test', version: '1' }, { versionNegotiation: { mode } });
  t.after(() => client.close());
  await client.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${(server.address() as any).port}/docs/mcp`), { requestInit: { headers: { 'User-Agent': 'codex/1.2.3 (PRIVATE_DEVICE)', Authorization: 'Bearer PRIVATE_AUTH' } } }));
  return client;
}
const walk = async (folder: string): Promise<string[]> => (await Promise.all((await readdir(folder, { withFileTypes: true })).map(entry => entry.isDirectory() ? walk(path.join(folder, entry.name)) : [path.join(folder, entry.name)]))).flat();

test('Vercel MCP runs from an isolated function with scoped data, routes, and no Ask dependencies', async t => {
  const f = await fixture(t); const result = await f.build();
  assert.equal(result.mcp?.added, true);
  const func = path.join(f.output, 'functions/docs/mcp.func');
  const isolated = path.join(f.root, 'isolated.func');
  await cp(func, isolated, { recursive: true });
  await rm(f.output, { recursive: true });
  await rm(path.join(f.root, 'content'), { recursive: true });
  const files = await walk(isolated);
  assert.ok(!files.some(file => /ask-function|embeddings|\/ai\//.test(file)));
  const loaded = (await loadMcpRuntime(path.join(isolated, 'site')))!;
  assert.ok(!(await readFile(path.join(loaded.directory, 'documents.json'), 'utf8')).includes('PRIVATE_CONTENT_MARKER'));
  const entry = await import(pathToFileURL(path.join(isolated, 'index.js')).href);
  const client = await connection(t, entry.default);
  assert.equal((await client.listTools()).tools.length, 4);
  const search = await client.callTool({ name: 'search_docs', arguments: { query: 'public guide' } });
  assert.equal((search.structuredContent as any).results[0].id, 'intro');
  assert.ok(!(await client.callTool({ name: 'get_page', arguments: { id: 'intro' } })).isError);
  const outline = await client.callTool({ name: 'get_outline', arguments: { id: 'intro' } });
  assert.ok(!outline.isError);
  assert.ok(!(await client.callTool({ name: 'get_section', arguments: { id: 'intro', section: (outline.structuredContent as any).sections[0].id } })).isError);
  assert.equal((await client.callTool({ name: 'get_page', arguments: { id: 'private' } })).isError, true);
  assert.equal((await client.callTool({ name: 'get_page', arguments: { id: 'intro', channel: 'beta' } })).isError, true);
});

test('Vercel trusts only explicit deployment hosts, protects internal files, and cleans owned functions', async t => {
  const f = await fixture(t); await f.build();
  const func = path.join(f.output, 'functions/docs/mcp.func');
  const handler = await createVercelMcpHandler(path.join(func, 'site'), { VERCEL_URL: 'exact-preview.vercel.app', VERCEL_BRANCH_URL: 'branch.vercel.app', VERCEL_PROJECT_PRODUCTION_URL: 'production.vercel.app' });
  for (const host of ['exact-preview.vercel.app', 'branch.vercel.app', 'production.vercel.app', 'docs.example.test']) assert.equal((await handler(new Request(`https://${host}/docs/mcp`))).status, 405);
  assert.equal((await handler(new Request('http://localhost/docs/mcp'))).status, 403);
  assert.equal((await handler(new Request('https://other.vercel.app/docs/mcp', { headers: { 'x-forwarded-host': 'exact-preview.vercel.app' } }))).status, 403);
  const routes = JSON.parse(await readFile(path.join(f.output, 'config.json'), 'utf8')).routes;
  assert.ok(routes.findIndex((r: any) => r.dest === '/docs/mcp') < routes.findIndex((r: any) => r.handle === 'filesystem'));
  assert.ok(routes.some((r: any) => r.status === 404 && new RegExp(r.src).test('/__shoalrun/mcp-data/analytics/lib/adapter.mjs')));
  await assert.rejects(readFile(path.join(f.output, 'static/mcp-runtime.json')), /ENOENT/);
  await assert.rejects(readFile(path.join(f.output, 'static/__shoalrun/mcp-data/documents.json')), /ENOENT/);
  await mkdir(path.join(f.output, 'functions/custom.func'), { recursive: true });
  await writeFile(path.join(f.output, 'functions/custom.func/keep'), 'custom');
  f.config.mcp.path = '/agent'; await f.build();
  await assert.rejects(readFile(path.join(func, 'index.js')), /ENOENT/);
  f.config.mcp = false; await f.build();
  await assert.rejects(readFile(path.join(f.output, 'functions/docs/agent.func/index.js')), /ENOENT/);
  assert.equal(await readFile(path.join(f.output, 'functions/custom.func/keep'), 'utf8'), 'custom');
  f.config.mcp = { enabled: true, access: 'public', path: '/custom', publication: { channel: 'production', version: 'current', language: 'en' } };
  f.config.site.basePath = '';
  await assert.rejects(f.build(), /unrelated function/);
});

test('MCP analytics is server-only, scoped, flushed, and never records arguments or results', async t => {
  const f = await fixture(t);
  await mkdir(path.join(f.root, 'adapters'));
  const log = path.join(f.root, 'events.jsonl');
  await writeFile(path.join(f.root, 'adapters/analytics.mjs'), `import { appendFile } from 'node:fs/promises';\nawait appendFile(${JSON.stringify(log)}, '{\"loaded\":true}\\n');\nexport async function capture(event) { await appendFile(${JSON.stringify(log)}, JSON.stringify(event)+'\\n'); }\nexport async function flush() { await appendFile(${JSON.stringify(log)}, '{"flushed":true}\\n'); }`);
  f.config.mcp.analytics = { module: './adapters/analytics.mjs' };
  await f.build();
  const func = path.join(f.output, 'functions/docs/mcp.func');
  await assert.rejects(readFile(log), /ENOENT/, 'builds never execute the adapter');
  await rm(path.join(f.root, 'adapters'), { recursive: true });
  const entry = await import(pathToFileURL(path.join(func, 'index.js')).href);
  const client = await connection(t, entry.default);
  const tools = (await client.listTools()).tools;
  assert.equal(tools.length, 4);
  assert.ok(tools.every(tool => !('context' in (tool.inputSchema as any).properties)));
  await client.callTool({ name: 'search_docs', arguments: { query: 'SENSITIVE_QUERY_MARKER' } });
  await client.callTool({ name: 'get_page', arguments: { id: 'intro' } });
  await client.callTool({ name: 'get_page', arguments: { id: 'PRIVATE_INPUT_MARKER' } });
  const text = await readFile(log, 'utf8');
  assert.doesNotMatch(text, /SENSITIVE_QUERY_MARKER|PRIVATE_INPUT_MARKER|Welcome to|query|content/);
  const events = text.trim().split('\n').map(row => JSON.parse(row));
  assert.equal(events.filter(e => e.name === 'mcp_tool_call').length, 3);
  assert.equal(events.filter(e => e.flushed).length >= 3, true);
  assert.ok(events.some(e => e.pageId === 'intro' && !e.isError));
  assert.ok(events.some(e => e.isError && e.errorCode === 'unknown_page' && !e.pageId));
  assert.ok(events.filter(e => e.name).every(e => !e.client && !e.model), 'metadata remains off even with recognized client headers');
  assert.ok(events.filter(e => e.name).every(e => e.buildId.length === 64 && e.publication.channel === 'production' && e.durationMs >= 0));
  const publicFiles = await walk(path.join(f.output, 'static'));
  assert.ok(!publicFiles.some(file => /analytics/.test(file)));
  f.config.mcp.analytics = false; await f.build();
  assert.equal((await loadMcpRuntime(path.join(func, 'site')))!.runtime.analytics, undefined);
  await assert.rejects(readFile(path.join(func, 'site/__shoalrun/mcp-data/analytics/lib/analytics.mjs')), /ENOENT/);
});

test('analytics failures and malformed adapters preserve documentation access; tampered corpus fails closed', async t => {
  const f = await fixture(t);
  await writeFile(path.join(f.root, 'bad.mjs'), `export function capture() { throw new Error('private secret must not leak'); }\nexport function flush() { throw new Error('private secret'); }`);
  f.config.mcp.analytics = { module: './bad.mjs' };
  await f.build();
  const func = path.join(f.output, 'functions/docs/mcp.func');
  const client = await connection(t, vercelMcpNodeAdapter(path.join(func, 'site')));
  assert.ok(!(await client.callTool({ name: 'get_page', arguments: { id: 'intro' } })).isError);
  await attemptAnalytics(() => new Promise(() => {}), 5);
  await writeFile(path.join(f.root, 'bad.mjs'), 'export const capture = 42;');
  const standalone = path.join(f.root, 'standalone'); await f.save(); await compile(f.file, standalone);
  const second = await connection(t, vercelMcpNodeAdapter(standalone));
  assert.ok(!(await second.callTool({ name: 'get_page', arguments: { id: 'intro' } })).isError);
  await writeFile(path.join(func, 'site/__shoalrun/mcp-data/docs/intro.md'), 'tampered');
  await assert.rejects(createVercelMcpHandler(path.join(func, 'site')), /mismatch/);
  for (const analytics of [true, {}, { module: 'https://example.com/adapter.js' }, { module: './adapter.ts' }]) assert.throws(() => resolveMcp({ ...f.config.mcp, analytics }));
});

for (const mode of ['legacy', 'auto'] as const) test(`optional client metadata works on ${mode} requests without exporting raw input`, async t => {
  const f = await fixture(t);
  const log = path.join(f.root, 'metadata.jsonl');
  await writeFile(path.join(f.root, 'adapter.mjs'), `import { appendFile } from 'node:fs/promises';\nexport async function capture(event) { await appendFile(${JSON.stringify(log)}, JSON.stringify(event)+'\\n'); }`);
  f.config.mcp.analytics = { module: './adapter.mjs', clientMetadata: true };
  await f.build();
  const client = await connection(t, vercelMcpNodeAdapter(path.join(f.output, 'functions/docs/mcp.func/site')), mode);
  const result = await client.callTool({ name: 'get_page', arguments: { id: 'intro' }, _meta: { 'x-codex-turn-metadata': { model: 'gpt-6.1', prompt: 'PRIVATE_PROMPT' }, ignored: 'PRIVATE_METADATA' } });
  assert.ok(!result.isError);
  const text = await readFile(log, 'utf8');
  const event = JSON.parse(text.trim());
  assert.deepEqual(event.client, { name: 'codex', source: 'user_agent', verified: false });
  assert.deepEqual(event.model, { name: 'gpt-6.1', source: 'client_metadata', verified: false });
  assert.doesNotMatch(text, /PRIVATE_|Authorization|User-Agent|prompt|ignored/);
  const tools = (await client.listTools()).tools;
  assert.ok(tools.every(tool => !('context' in (tool.inputSchema as any).properties) && !('llm_model' in (tool.inputSchema as any).properties)));
});
