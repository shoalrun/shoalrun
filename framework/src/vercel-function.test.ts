import assert from 'node:assert/strict';
import { execFile, spawnSync } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, mkdtemp, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { createAskFunction, createHostedSearchFunction, nodeAdapter } from './ask-function.js';
import { addAskFunction } from './vercel-function.js';
import { buildVercel } from './vercel.js';

const cli = path.join(path.dirname(fileURLToPath(import.meta.url)), 'cli.js');

const vector = (text: string) => { const v = Array(8).fill(0); for (const word of text.toLowerCase().split(/\W+/)) for (let at = 0; at < word.length; at++) v[(word.charCodeAt(at) + at) % 8] += 1; const norm = Math.hypot(...v) || 1; return v.map(x => x / norm); };

// One local server plays the chat service, the embedding service, and the key-value store.
async function fakeServices() {
  const counters = new Map<string, string>();
  const lists = new Map<string, string[]>();
  const ttl = new Map<string, number>();
  const chatCalls: unknown[] = [];
  const embeddingCalls: string[][] = [];
  const server = http.createServer(async (req, res) => {
    const chunks: Buffer[] = []; for await (const chunk of req) chunks.push(chunk as Buffer);
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : undefined;
    const send = (value: unknown) => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(value)); };
    if (req.url?.endsWith('/embeddings')) { embeddingCalls.push(body.input as string[]); return send({ data: (body.input as string[]).map((text, index) => ({ index, embedding: vector(text) })), usage: { total_tokens: 1 } }); }
    if (req.url?.endsWith('/chat/completions')) { chatCalls.push(body); return send({ model: 'fake-chat', choices: [{ finish_reason: 'stop', message: { content: 'The handbook starts on the welcome page [1].' } }], usage: { prompt_tokens: 50, completion_tokens: 9 } }); }
    // A small Redis: the commands the budget, the rate limit, the log, and the pause flag use.
    const run = ([command, key, a, b]: string[]): unknown => {
      if (command === 'INCRBY') { counters.set(key, String(Number(counters.get(key) ?? 0) + Number(a))); return Number(counters.get(key)); }
      if (command === 'EXPIRE') { ttl.set(key, Number(a)); return 1; }
      if (command === 'GET') return counters.get(key) ?? null;
      if (command === 'SET') { counters.set(key, a); return 'OK'; }
      if (command === 'DEL') return counters.delete(key) ? 1 : 0;
      if (command === 'LPUSH') { lists.set(key, [a, ...(lists.get(key) ?? [])]); return lists.get(key)!.length; }
      if (command === 'LTRIM') { lists.set(key, (lists.get(key) ?? []).slice(Number(a), Number(b) + 1)); return 'OK'; }
      if (command === 'LRANGE') return (lists.get(key) ?? []).slice(Number(a), b === '-1' ? undefined : Number(b) + 1);
      throw new Error(`unexpected command ${command}`);
    };
    if (req.url === '/pipeline') return send((body as string[][]).map(command => ({ result: run(command) })));
    if (req.method === 'POST' && req.url === '/') return send({ result: run(body as string[]) });
    res.statusCode = 404; res.end();
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { base, counters, lists, ttl, chatCalls, embeddingCalls, close: () => new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); }) };
}

async function project(base: string, extra = '') {
  const root = await mkdtemp(path.join(os.tmpdir(), 'ask-fn-'));
  assert.equal(spawnSync(process.execPath, [cli, 'init', root, '--starter', 'minimal'], { encoding: 'utf8' }).status, 0);
  const config = path.join(root, 'docs.config.yaml');
  const text = await readFile(config, 'utf8');
  await writeFile(config, `${text.replace('site:\n  title: Acme handbook', 'site:\n  title: Acme handbook\n  origin: https://docs.example.com')}
chat:
  provider: openai
  model: fake-chat
  baseUrl: ${base}/v1
  keyEnv: FAKE_CHAT_KEY
  budget: { perCaller: 2, perDay: 10, store: { provider: upstash, urlEnv: FAKE_KV_URL, tokenEnv: FAKE_KV_TOKEN } }
${extra}retrieval:
  embeddings: { provider: openai, model: fake-embed, dimension: 8, baseUrl: ${base}/v1, keyEnv: FAKE_EMBED_KEY }
`);
  return { root, config };
}

const withEnv = async (values: Record<string, string | undefined>, run: () => Promise<void>) => {
  const saved = Object.fromEntries(Object.keys(values).map(name => [name, process.env[name]]));
  for (const [name, value] of Object.entries(values)) if (value === undefined) delete process.env[name]; else process.env[name] = value;
  try { await run(); } finally { for (const [name, value] of Object.entries(saved)) if (value === undefined) delete process.env[name]; else process.env[name] = value; }
};

const walk = async (directory: string): Promise<string[]> => (await Promise.all((await readdir(directory, { withFileTypes: true })).map(entry => entry.isDirectory() ? walk(path.join(directory, entry.name)) : Promise.resolve([path.join(directory, entry.name)])))).flat();

test('a chat build moves the private index into the function, and the copied function answers a question on its own', async () => {
  const services = await fakeServices();
  try {
    const { root, config } = await project(services.base);
    await writeFile(config, (await readFile(config, 'utf8')) + '\nsearch:\n  limits: { perCallerPerDay: 100, perDay: 1000, perCallerPerMinute: 10 }\nmcp:\n  enabled: true\n  access: public\n  publication: { channel: production, version: current, language: en }\n');
    const output = path.join(root, '.vercel', 'output');
    const env = { FAKE_CHAT_KEY: 'chat-secret-key', FAKE_EMBED_KEY: 'embed-secret-key', FAKE_KV_URL: services.base, FAKE_KV_TOKEN: 'kv-secret-token', SHOALRUN_ASK_HOSTS: undefined };
    await withEnv(env, async () => {
      const result = await buildVercel(config, output, {}, { chat: true });
      assert.equal(result.chat?.added, true, JSON.stringify(result.chat));
      assert.equal(result.mcp?.added, true);
      const func = path.join(output, 'functions', '__shoalrun', 'ask.func');
      const searchFunc = path.join(output, 'functions', '__shoalrun', 'search.func');
      // The index is private: nothing in the static output, and everything in the function.
      assert.ok(!(await walk(path.join(output, 'static'))).some(file => /chunks\.json|embeddings\.(bin|json)|[\\/]ai[\\/]|ask-widget/.test(file)));
      // The browser gets the panel script and a small public settings file, and every page loads the panel once.
      const publicSettings = JSON.parse(await readFile(path.join(output, 'static', '__shoalrun', 'chat.json'), 'utf8'));
      assert.deepEqual(publicSettings, {});
      assert.match(await readFile(path.join(output, 'static', '__shoalrun', 'ask.js'), 'utf8'), /Ask the docs/);
      const pages = (await walk(path.join(output, 'static'))).filter(file => file.endsWith('.html'));
      assert.ok(pages.length > 0);
      for (const page of pages) assert.equal((await readFile(page, 'utf8')).split('<script src="/__shoalrun/ask.js" defer></script>').length - 1, 1, page);
      assert.ok((await stat(path.join(func, 'site', 'ai', 'chunks.json'))).size > 0);
      assert.ok((await stat(path.join(func, 'site', 'ai', 'embeddings.bin'))).size > 0);
      assert.ok((await stat(path.join(searchFunc, 'site', 'ai', 'embeddings.bin'))).size > 0);
      const search = await createHostedSearchFunction(searchFunc);
      const searchRequest = new Request('https://docs.example.com/__shoalrun/search', { method: 'POST', headers: { host: 'docs.example.com', origin: 'https://docs.example.com', 'content-type': 'application/json', 'x-vercel-forwarded-for': '203.0.113.7' }, body: JSON.stringify({ query: 'handbook', variant: 'production|current|en' }) });
      const searchResponse = await search(searchRequest.clone());
      assert.equal(searchResponse.status, 200);
      assert.equal((await searchResponse.json() as { mode: string }).mode, 'vector');
      // Isolate the daily cap from the independent per-minute limit.
      for (let number = 2; number <= 101; number++) {
        for (const key of services.counters.keys()) if (key.startsWith('search-rate:')) services.counters.delete(key);
        const response = await search(searchRequest.clone());
        const body = await response.json() as { mode: string; fallbackReason?: string };
        assert.equal(body.mode, number <= 100 ? 'vector' : 'lexical', `search ${number}`);
        assert.equal(body.fallbackReason, number <= 100 ? undefined : 'budget-denied');
      }
      assert.equal(services.embeddingCalls.filter(inputs => inputs.length === 1 && inputs[0] === 'handbook').length, 100);
      const searchRuntimeFile = path.join(searchFunc, 'runtime.json');
      const searchRuntime = JSON.parse(await readFile(searchRuntimeFile, 'utf8'));
      assert.deepEqual(searchRuntime.settings.search.limits, { perCallerPerDay: 100, perDay: 1000, perCallerPerMinute: 10 });
      searchRuntime.settings.search.limits = { perCallerPerDay: 2, perDay: 3, perCallerPerMinute: 3 };
      await writeFile(searchRuntimeFile, JSON.stringify(searchRuntime));
      for (const key of services.counters.keys()) if (key.startsWith('search-')) services.counters.delete(key);
      const configuredSearch = await createHostedSearchFunction(searchFunc);
      const configuredRequest = (caller: string) => {
        const next = searchRequest.clone(); next.headers.set('x-vercel-forwarded-for', caller); return next;
      };
      for (const expected of ['vector', 'vector', 'lexical']) assert.equal((await (await configuredSearch(configuredRequest('caller-a'))).json()).mode, expected);
      for (const expected of ['vector', 'lexical', 'lexical']) assert.equal((await (await configuredSearch(configuredRequest('caller-b'))).json()).mode, expected);
      assert.equal((await configuredSearch(configuredRequest('caller-b'))).status, 429);


      assert.deepEqual(JSON.parse(await readFile(path.join(func, '.vc-config.json'), 'utf8')), { runtime: 'nodejs22.x', handler: 'index.js', launcherType: 'Nodejs', shouldAddHelpers: false, maxDuration: 120, memory: 1024 });
      // No key or token value is written anywhere in the function.
      for (const file of (await walk(func)).filter(name => !/[\\/]node_modules[\\/]|embeddings\.bin$/.test(name))) {
        const content = await readFile(file, 'utf8');
        for (const secret of ['chat-secret-key', 'embed-secret-key', 'kv-secret-token']) assert.ok(!content.includes(secret), `${file} holds a secret`);
      }
      const runtime = JSON.parse(await readFile(path.join(func, 'runtime.json'), 'utf8'));
      assert.deepEqual(runtime.hosts, ['docs.example.com']);
      assert.equal(runtime.settings.chat.keyEnv, 'FAKE_CHAT_KEY');
      // The copy runs by itself: import its entry point, as Vercel does, and ask it a question over HTTP.
      const handler = (await import(pathToFileURL(path.join(func, 'index.js')).href)).default as (req: http.IncomingMessage, res: http.ServerResponse) => Promise<void>;
      const server = http.createServer((req, res) => { void handler(req, res); });
      await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
      const address = `127.0.0.1:${(server.address() as AddressInfo).port}`;
      process.env.SHOALRUN_ASK_HOSTS = address;
      try {
        const ask = (question: string, headers: Record<string, string> = {}) => fetch(`http://${address}/__shoalrun/ask`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-vercel-forwarded-for': '203.0.113.9', ...headers }, body: JSON.stringify({ question }) });
        const first = await ask('where does the handbook start');
        assert.equal(first.status, 200);
        const body = await first.json() as { answer: string; decision: string; sources: Array<{ url: string }> };
        assert.match(body.answer, /welcome page/);
        assert.ok(body.sources.length > 0);
        assert.equal(services.chatCalls.length, 1);
        assert.equal((services.chatCalls[0] as { model: string }).model, 'fake-chat');
        // The daily budget lives in the shared store, keyed by a hash of the caller.
        assert.ok([...services.counters.keys()].every(key => /^(budget|rate|search-budget|search-rate):/.test(key) && !key.includes('203.0.113.9')));
        assert.equal((await ask('where does the handbook start again', { 'x-vercel-forwarded-for': '203.0.113.9' })).status, 200);
        const third = await (await ask('and a third question', { 'x-vercel-forwarded-for': '203.0.113.9' })).json() as { decision: string; answer: string };
        assert.equal(third.decision, 'search', 'a caller past their cap gets pages, not a model answer');
        assert.equal(services.chatCalls.length, 2);
        // A request to another host is refused.
        // fetch cannot set a Host header, so this one sends a raw request with another host.
        const wrongHost = await new Promise<number>((resolve, reject) => { const request = http.request({ host: '127.0.0.1', port: (server.address() as AddressInfo).port, path: '/__shoalrun/ask', method: 'POST', headers: { host: 'evil.example', 'content-type': 'application/json' } }, response => { response.resume(); resolve(response.statusCode ?? 0); }); request.on('error', reject); request.end(JSON.stringify({ question: 'q' })); });
        assert.equal(wrongHost, 403);
        assert.equal(services.chatCalls.length, 2, 'the refused request never reached the model');
      } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
    });
  } finally { await services.close(); }
});

test('hosted chat and search functions follow the site base path', async () => {
  const services = await fakeServices();
  try {
    const { root, config } = await project(services.base);
    await writeFile(config, (await readFile(config, 'utf8')).replace('origin: https://docs.example.com', 'origin: https://docs.example.com\n  basePath: /docs'));
    const output = path.join(root, '.vercel', 'output');
    await withEnv({ FAKE_CHAT_KEY: 'k', FAKE_EMBED_KEY: 'k', FAKE_KV_URL: services.base, FAKE_KV_TOKEN: 't' }, async () => {
      assert.equal((await buildVercel(config, output, {}, { chat: true })).chat?.added, true);
      const functions = path.join(output, 'functions', 'docs', '__shoalrun');
      await stat(path.join(functions, 'ask.func', 'index.js'));
      await stat(path.join(functions, 'search.func', 'index.js'));
      await stat(path.join(output, 'static', 'docs', '__shoalrun', 'chat.json'));
      const pages = (await walk(path.join(output, 'static', 'docs'))).filter(file => file.endsWith('.html'));
      assert.ok(pages.length > 0);
      for (const page of pages) assert.match(await readFile(page, 'utf8'), /<script src="\/docs\/__shoalrun\/ask\.js" defer><\/script>/);
      const search = await createHostedSearchFunction(path.join(functions, 'search.func'));
      const response = await search(new Request('https://docs.example.com/docs/__shoalrun/search', { method: 'POST', headers: { host: 'docs.example.com', origin: 'https://docs.example.com', 'content-type': 'application/json', 'x-vercel-forwarded-for': '203.0.113.11' }, body: JSON.stringify({ query: 'handbook', variant: 'production|current|en' }) }));
      assert.equal(response.status, 200);
      assert.equal((await response.json() as { mode: string }).mode, 'vector');
    });
  } finally { await services.close(); }
});

test('the function refuses to start without a shared budget store, and a build says why it skipped the chat', async () => {
  const services = await fakeServices();
  try {
    const { root, config } = await project(services.base);
    const text = await readFile(config, 'utf8');
    const env = { FAKE_CHAT_KEY: 'k', FAKE_EMBED_KEY: 'k', FAKE_KV_URL: services.base, FAKE_KV_TOKEN: 't' };
    await withEnv(env, async () => {
      const skipped = async (edited: string, pattern: RegExp) => { await writeFile(config, edited); const result = await addAskFunction({ configFile: config, staticDirectory: path.join(root, 'static'), functionsDirectory: path.join(root, 'functions') }); assert.equal(result.added, false); assert.match((result as { reason: string }).reason, pattern); };
      await skipped(text.replace(/chat:[\s\S]*$/, ''), /no chat section/);
      await skipped(text.replace(/  budget:.*\n/, '  budget: { perCaller: 2, perDay: 10 }\n'), /shared store/);
      await skipped(text.replace(/retrieval:[\s\S]*$/, ''), /no retrieval\.embeddings/);
      await writeFile(config, text);
      await withEnv({ FAKE_EMBED_KEY: undefined }, async () => {
        const result = await addAskFunction({ configFile: config, staticDirectory: path.join(root, 'static'), functionsDirectory: path.join(root, 'functions') });
        assert.deepEqual(result, { added: false, reason: 'set FAKE_EMBED_KEY at build time to embed the passages' });
      });
      // Without --chat, a Vercel build writes no function at all.
      const plain = await buildVercel(config, path.join(root, 'plain'), {});
      assert.equal(plain.chat, undefined);
      await assert.rejects(stat(path.join(root, 'plain', 'functions')), /ENOENT/);
    });
  } finally { await services.close(); }
});

test('rebuilding without chat or with missing chat prerequisites removes only the generated function', async () => {
  const services = await fakeServices();
  try {
    const { root, config } = await project(services.base);
    const output = path.join(root, 'out');
    const func = path.join(output, 'functions', '__shoalrun', 'ask.func');
    const searchFunc = path.join(output, 'functions', '__shoalrun', 'search.func');
    const unrelated = path.join(output, 'functions', 'custom.func', 'index.js');
    await mkdir(path.dirname(unrelated), { recursive: true });
    await writeFile(unrelated, 'export default null;');
    const original = await readFile(config, 'utf8');
    const env = { FAKE_CHAT_KEY: 'k', FAKE_EMBED_KEY: 'k', FAKE_KV_URL: services.base, FAKE_KV_TOKEN: 't' };
    await withEnv(env, async () => {
      assert.equal((await buildVercel(config, output, {}, { chat: true })).chat?.added, true);
      await buildVercel(config, output);
      await assert.rejects(stat(func), /ENOENT/);
      await assert.rejects(stat(searchFunc), /ENOENT/);
      for (const [edited, missingEnv] of [
        [original.replace(/chat:[\s\S]*?retrieval:/, 'retrieval:'), false],
        [original.replace(/  budget:.*\n/, '  budget: { perCaller: 2, perDay: 10 }\n'), false],
        [original.replace(/retrieval:[\s\S]*$/, ''), false],
        [original, true]
      ] as const) {
        await mkdir(func, { recursive: true });
        await writeFile(path.join(func, 'old.js'), 'old');
        await mkdir(searchFunc, { recursive: true });
        await writeFile(path.join(searchFunc, 'old.js'), 'old');
        await writeFile(config, edited);
        const build = () => buildVercel(config, output, {}, { chat: true });
        const result = missingEnv ? await withEnv({ FAKE_EMBED_KEY: undefined }, async () => { assert.equal((await build()).chat?.added, false); }) : await build();
        if (result) assert.equal(result.chat?.added, false);
        await assert.rejects(stat(func), /ENOENT/);
        await assert.rejects(stat(searchFunc), /ENOENT/);
        assert.equal(await readFile(unrelated, 'utf8'), 'export default null;');
      }
    });
  } finally { await services.close(); }
});

test('a Vercel rebuild reuses unchanged private passage vectors and embeds changed passages', async () => {
  const services = await fakeServices();
  try {
    const { root, config } = await project(services.base);
    const output = path.join(root, 'out');
    await withEnv({ FAKE_CHAT_KEY: 'k', FAKE_EMBED_KEY: 'k', FAKE_KV_URL: services.base, FAKE_KV_TOKEN: 't' }, async () => {
      const first = await buildVercel(config, output, {}, { chat: true });
      assert.equal(first.chat?.added, true);
      if (!first.chat?.added) return;
      assert.ok(first.chat.embeddingCounts.embedded > 0);
      const calls = services.embeddingCalls.length;
      const second = await buildVercel(config, output, {}, { chat: true });
      assert.equal(second.chat?.added, true);
      if (!second.chat?.added) return;
      assert.deepEqual(second.chat.embeddingCounts, { embedded: 0, reused: first.chat.chunks });
      assert.equal(services.embeddingCalls.length, calls);

      const page = path.join(root, 'content', 'welcome.mdx');
      await writeFile(page, (await readFile(page, 'utf8')).replace('This handbook explains how to set up and use Acme.', 'This updated handbook explains how to set up and use Acme.'));
      const third = await buildVercel(config, output, {}, { chat: true });
      assert.equal(third.chat?.added, true);
      if (!third.chat?.added) return;
      assert.ok(third.chat.embeddingCounts.embedded > 0);
      assert.ok(third.chat.embeddingCounts.reused > 0);
      assert.equal(services.embeddingCalls.length, calls + 1);

      const settings = await readFile(config, 'utf8');
      await writeFile(config, settings.replace('model: fake-embed', 'model: different-embed'));
      const fourth = await buildVercel(config, output, {}, { chat: true });
      assert.equal(fourth.chat?.added, true);
      if (!fourth.chat?.added) return;
      assert.deepEqual(fourth.chat.embeddingCounts, { embedded: fourth.chat.chunks, reused: 0 });
    });
  } finally { await services.close(); }
});

test('with when: always the function checks every visitor with Turnstile, and refuses everyone when its secret is missing', async () => {
  const services = await fakeServices();
  try {
    const { root, config } = await project(services.base, '  challenge: { provider: turnstile, siteKey: 1x00000000000000000000AA, secretEnv: FAKE_TURNSTILE_SECRET, when: always }\n  panel: { placeholder: Ask about Example }\n');
    const output = path.join(root, 'out');
    const env = { FAKE_CHAT_KEY: 'k', FAKE_EMBED_KEY: 'k', FAKE_KV_URL: services.base, FAKE_KV_TOKEN: 't', SHOALRUN_ASK_HOSTS: 'docs.example.com' };
    await withEnv(env, async () => {
      assert.equal((await buildVercel(config, output, {}, { chat: true })).chat?.added, true);
      assert.deepEqual(JSON.parse(await readFile(path.join(output, 'static', '__shoalrun', 'chat.json'), 'utf8')), { siteKey: '1x00000000000000000000AA', prewarm: true, panel: { placeholder: 'Ask about Example' } });
      const func = path.join(output, 'functions', '__shoalrun', 'ask.func');
      const verified: string[] = [];
      const cloudflare = (async (_url: string, init: RequestInit) => { const token = new URLSearchParams(String(init.body)).get('response') ?? ''; verified.push(token); return Response.json({ success: token === 'human' }); }) as unknown as typeof fetch;
      const post = (fn: (request: Request) => Promise<Response>, body: object, cookie?: string) => fn(new Request('https://docs.example.com/__shoalrun/ask', { method: 'POST', headers: { host: 'docs.example.com', 'content-type': 'application/json', 'x-vercel-forwarded-for': '198.51.100.4', ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) }));
      await withEnv({ FAKE_TURNSTILE_SECRET: 'turnstile-secret' }, async () => {
        const fn = await createAskFunction(func, process.env, cloudflare);
        assert.equal((await post(fn, { question: 'where does the handbook start' })).status, 403);
        assert.equal((await post(fn, { question: 'where does the handbook start', turnstileToken: 'bot' })).status, 403);
        assert.equal(services.chatCalls.length, 0, 'a failed check never reaches the model');
        const passed = await post(fn, { question: 'where does the handbook start', turnstileToken: 'human' });
        assert.equal(passed.status, 200);
        assert.deepEqual(verified, ['bot', 'human']);
        // The passed check earns a pass, so a follow-up needs no token and Cloudflare is not asked again.
        const cookie = passed.headers.get('set-cookie')!.split(';')[0];
        assert.ok(!cookie.includes('turnstile-secret'));
        assert.equal((await post(fn, { question: 'and where does it go next' }, cookie)).status, 200);
        assert.deepEqual(verified, ['bot', 'human']);
      });
      await withEnv({ FAKE_TURNSTILE_SECRET: undefined }, async () => {
        const fn = await createAskFunction(func, process.env, cloudflare);
        assert.equal((await post(fn, { question: 'q', turnstileToken: 'human' })).status, 403, 'a missing secret refuses everyone');
      });
    });
  } finally { await services.close(); }
});

test('the Node adapter turns a request into a Web request and back, retries a failed start, and hides the reason', async () => {
  let starts = 0;
  const errors: string[] = [];
  const saved = console.error; console.error = (message: string) => { errors.push(String(message)); };
  try {
    const handler = nodeAdapter(async () => { starts++; if (starts === 1) throw new Error('index missing'); return async request => new Response(JSON.stringify({ method: request.method, host: request.headers.get('host'), body: await request.text() }), { status: 201, headers: { 'x-test': 'yes' } }); });
    const server = http.createServer((req, res) => { void handler(req, res); });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/x`;
    try {
      const failed = await fetch(url, { method: 'POST', body: 'hello' });
      assert.equal(failed.status, 503);
      assert.doesNotMatch(await failed.text(), /index missing/);
      assert.ok(errors.some(message => /index missing/.test(message)));
      const ok = await fetch(url, { method: 'POST', body: 'hello' });
      assert.equal(ok.status, 201);
      assert.equal(ok.headers.get('x-test'), 'yes');
      assert.deepEqual(await ok.json(), { method: 'POST', host: url.slice(7, url.indexOf('/x')), body: 'hello' });
      assert.equal((await fetch(url, { method: 'POST', body: 'x'.repeat(40_000) })).status, 413);
      assert.equal(starts, 2);
    } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
  } finally { console.error = saved; }
});

const runCli = async (args: string[], env: Record<string, string>) => {
  try { const { stdout, stderr } = await promisify(execFile)(process.execPath, [cli, ...args], { env: { ...process.env, ...env }, encoding: 'utf8' }); return { code: 0, stdout, stderr }; }
  catch (error) { const failed = error as { code?: number; stdout?: string; stderr?: string }; return { code: failed.code ?? 1, stdout: failed.stdout ?? '', stderr: failed.stderr ?? '' }; }
};

test('the hosted function records redacted questions with a lifetime, the report reads them back, and pause and resume switch the chat off and on', async () => {
  const services = await fakeServices();
  try {
    const { root, config } = await project(services.base, '  log: { retentionDays: 30, maxPerDay: 100 }\n');
    const output = path.join(root, 'out');
    const env = { FAKE_CHAT_KEY: 'k', FAKE_EMBED_KEY: 'k', FAKE_KV_URL: services.base, FAKE_KV_TOKEN: 'kv-token', SHOALRUN_ASK_HOSTS: 'docs.example.com' };
    await withEnv(env, async () => {
      assert.equal((await buildVercel(config, output, {}, { chat: true })).chat?.added, true);
      const func = path.join(output, 'functions', '__shoalrun', 'ask.func');
      const post = (fn: (request: Request) => Promise<Response>, question: string) => fn(new Request('https://docs.example.com/__shoalrun/ask', { method: 'POST', headers: { host: 'docs.example.com', 'content-type': 'application/json', 'x-vercel-forwarded-for': '198.51.100.4' }, body: JSON.stringify({ question }) }));
      const fn = await createAskFunction(func);
      assert.equal((await post(fn, 'where does the handbook start')).status, 200);
      assert.equal((await post(fn, 'email me at jo@example.com where the handbook starts')).status, 200);
      const day = new Date().toISOString().slice(0, 10);
      const stored = services.lists.get(`asklog:${day}`)!;
      assert.equal(stored.length, 2);
      assert.equal(services.ttl.get(`asklog:${day}`), 30 * 86400);
      assert.ok(stored.every(line => !line.includes('jo@example.com') && !line.includes('198.51.100.4')));
      assert.equal(JSON.parse(stored[0]).question, 'email me at [email] where the handbook starts');
      // The report reads the hosted log through the same store settings.
      const report = await runCli(['ask-log', '--kv', '--config', config, '--days', '1'], env);
      assert.equal(report.code, 0, report.stderr);
      assert.match(report.stdout, /# Ask log: 2 questions/);
      // Pause: a new function instance refuses at once and never reaches the model, and resume brings it back.
      const calls = services.chatCalls.length;
      assert.match((await runCli(['chat', 'status', '--config', config], env)).stdout, /is running/);
      assert.match((await runCli(['chat', 'pause', '--config', config], env)).stdout, /is paused/);
      assert.match((await runCli(['chat', 'status', '--config', config], env)).stdout, /is paused, since 20/);
      const paused = await post(await createAskFunction(func), 'where does the handbook start');
      assert.equal(paused.status, 503);
      assert.equal((await paused.json() as { paused?: boolean }).paused, true);
      assert.equal(paused.headers.get('retry-after'), '300');
      assert.equal(services.chatCalls.length, calls);
      assert.match((await runCli(['chat', 'resume', '--config', config], env)).stdout, /is resumed/);
      assert.equal((await post(await createAskFunction(func), 'where does the handbook start')).status, 200);
      // Without the store's settings, the commands say so and change nothing.
      const noEnv = await runCli(['chat', 'pause', '--config', config], { FAKE_KV_URL: '', FAKE_KV_TOKEN: '' });
      assert.notEqual(noEnv.code, 0);
      assert.match(noEnv.stderr + noEnv.stdout, /Set FAKE_KV_URL/);
      assert.equal((await runCli(['chat', 'nope', '--config', config], env)).code === 0, false);
    });
  } finally { await services.close(); }
});

test('by default nobody is checked until they have used their free questions, then one check earns a pass', async () => {
  const services = await fakeServices();
  try {
    const { root, config } = await project(services.base, '  challenge: { provider: turnstile, siteKey: 1x00000000000000000000AA, secretEnv: FAKE_TURNSTILE_SECRET, freeQuestions: 1 }\n');
    const output = path.join(root, 'out');
    const env = { FAKE_CHAT_KEY: 'k', FAKE_EMBED_KEY: 'k', FAKE_KV_URL: services.base, FAKE_KV_TOKEN: 't', SHOALRUN_ASK_HOSTS: 'docs.example.com', FAKE_TURNSTILE_SECRET: 'turnstile-secret' };
    await withEnv(env, async () => {
      assert.equal((await buildVercel(config, output, {}, { chat: true })).chat?.added, true);
      assert.deepEqual(JSON.parse(await readFile(path.join(output, 'static', '__shoalrun', 'chat.json'), 'utf8')), { siteKey: '1x00000000000000000000AA' }, 'no prewarm in adaptive mode');
      const verified: string[] = [];
      const cloudflare = (async (_url: string, init: RequestInit) => { const token = new URLSearchParams(String(init.body)).get('response') ?? ''; verified.push(token); return Response.json({ success: token === 'human' }); }) as unknown as typeof fetch;
      const fn = await createAskFunction(path.join(output, 'functions', '__shoalrun', 'ask.func'), process.env, cloudflare);
      const post = (body: object, cookie?: string) => fn(new Request('https://docs.example.com/__shoalrun/ask', { method: 'POST', headers: { host: 'docs.example.com', 'content-type': 'application/json', 'x-vercel-forwarded-for': '198.51.100.4', ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) }));
      assert.equal((await post({ question: 'where does the handbook start' })).status, 200, 'the first question needs no check');
      assert.deepEqual(verified, []);
      const asked = await post({ question: 'where does the handbook start' });
      assert.equal(asked.status, 403, 'the free question is used, so the check is required');
      assert.equal((await asked.json() as { challenge?: boolean }).challenge, true);
      const passed = await post({ question: 'where does the handbook start', turnstileToken: 'human' });
      assert.equal(passed.status, 200);
      const cookie = passed.headers.get('set-cookie')!.split(';')[0];
      assert.equal((await post({ question: 'and after that' }, cookie)).status, 200, 'the pass covers follow-ups');
      assert.deepEqual(verified, ['human']);
    });
  } finally { await services.close(); }
});
