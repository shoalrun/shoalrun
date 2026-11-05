import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { copyFunctionRuntime } from './function-package.js';
import { initProject } from './init.js';
import { buildVercel } from './vercel.js';

const dist = path.dirname(fileURLToPath(import.meta.url));
async function inventory(directory: string): Promise<{ files: string[]; bytes: number }> {
  const files: string[] = [];
  let bytes = 0;
  async function visit(folder: string): Promise<void> {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const file = path.join(folder, entry.name);
      if (entry.isDirectory()) await visit(file);
      else { files.push(path.relative(directory, file).split(path.sep).join('/')); bytes += (await stat(file)).size; }
    }
  }
  await visit(directory);
  return { files, bytes };
}

test('function runtime closures stay isolated, exclude build tooling, and fit packaging budgets', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-function-closure-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const [entry, maxFiles, maxBytes] of [['ask-function.js', 1500, 8_000_000], ['search-function.js', 64, 256_000], ['mcp-vercel-runtime.js', 1400, 45_000_000]] as const) {
    const target = path.join(root, entry);
    await mkdir(target);
    await writeFile(path.join(target, 'package.json'), '{"type":"module"}\n');
    await copyFunctionRuntime(dist, entry, target);
    const contents = await inventory(target);
    assert.ok(contents.files.length <= maxFiles, `${entry}: ${contents.files.length} files exceed ${maxFiles}`);
    assert.ok(contents.bytes <= maxBytes, `${entry}: ${contents.bytes} bytes exceed ${maxBytes}`);
    assert.ok(!contents.files.some(file => /(?:^|\/)node_modules\/(?:lucide|shiki|@shikijs|katex|esbuild|@esbuild)(?:\/|$)/.test(file)), `${entry} includes build-only packages`);
    assert.ok(!contents.files.includes('lib/config.js'), `${entry} includes the source config loader`);
    assert.ok(contents.files.includes('LICENSE.shoalrun'), 'the runtime license must travel with its code');
    if (entry === 'search-function.js') {
      assert.ok(!contents.files.some(file => file.startsWith('node_modules/')), 'prepared search needs no third-party packages');
      for (const file of ['ask.js', 'ask-runtime.js', 'ask-setup.js', 'chat.js', 'chat-config.js', 'answer-cards.js', 'search-snippet.js', 'index-build.js']) assert.ok(!contents.files.includes(`lib/${file}`), `Search leaked ${file}`);
    }
    const result = execFileSync(process.execPath, ['--input-type=module', '-e', `await import(${JSON.stringify(pathToFileURL(path.join(target, 'lib', entry)).href)}); console.log('isolated import passed');`], { cwd: os.tmpdir(), env: { PATH: process.env.PATH }, encoding: 'utf8' });
    assert.match(result, /isolated import passed/);
  }
});

// No HTTP listener: the copied handlers must work independently of both the
// source checkout and the process that built them. Only fake service requests
// are allowed; unexpected requests fail rather than reaching the network.
function fakeServices() {
  const counters = new Map<string, number>();
  const calls = { embeddings: 0, chat: 0 };
  const send = async (url: string | URL | Request, options?: RequestInit): Promise<Response> => {
    const address = String(url);
    if (address === 'https://challenges.cloudflare.com/turnstile/v0/siteverify') {
      const token = new URLSearchParams(String(options?.body)).get('response');
      return Response.json({ success: true, hostname: token === 'wrong-host' ? 'other.example.com' : token === 'preview-host' ? 'preview.example.com' : 'docs.example.com', action: token === 'wrong-action' ? 'other_action' : 'docs_chat' });
    }
    const body = JSON.parse(String(options?.body ?? 'null'));
    if (address === 'http://127.0.0.1:8779/v1/embeddings') {
      calls.embeddings++;
      return Response.json({ data: body.input.map((_text: string, index: number) => ({ index, embedding: [1, 0] })) });
    }
    if (address === 'http://127.0.0.1:8779/v1/chat/completions') {
      calls.chat++;
      return Response.json({ model: 'test-chat', choices: [{ finish_reason: 'stop', message: { content: 'Read the handbook [1].' } }] });
    }
    if (address === 'http://127.0.0.1:8779/kv' || address === 'http://127.0.0.1:8779/kv/pipeline') {
      const command = ([name, key, amount]: string[]) => {
        if (name === 'INCRBY') { const total = (counters.get(key) ?? 0) + Number(amount); counters.set(key, total); return total; }
        if (name === 'EXPIRE') return 1;
        if (name === 'GET') return counters.get(key) ?? null;
        throw new Error(`Unexpected store command ${name}`);
      };
      return Response.json(Array.isArray(body?.[0]) ? body.map((item: string[]) => ({ result: command(item) })) : { result: command(body) });
    }
    throw new Error(`Unexpected external request: ${address}`);
  };
  return { send, calls };
}

test('generated Ask and Search packages answer independently with semantic fallback and separate budgets', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-function-isolation-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const project = path.join(root, 'project');
  await initProject(project, 'minimal');
  const config = path.join(project, 'docs.config.yaml');
  const original = await readFile(config, 'utf8');
  await writeFile(config, original.replace('title: Acme handbook', 'title: Acme handbook\n  origin: https://docs.example.com') + `
chat:
  provider: openai
  model: test-chat
  baseUrl: http://127.0.0.1:8779/v1
  keyEnv: PACK_TEST_CHAT
  challenge: { provider: turnstile, siteKey: 0x4AAAAAAFEqp0VO0aJ5DcUi, secretEnv: PACK_TEST_TURNSTILE, when: always, hostnames: [docs.example.com], action: docs_chat }
  budget: { perCaller: 2, perDay: 100, store: { provider: upstash, urlEnv: PACK_TEST_KV_URL, tokenEnv: PACK_TEST_KV_TOKEN } }
retrieval:
  embeddings: { provider: openai, model: test-embed, dimension: 2, baseUrl: http://127.0.0.1:8779/v1, keyEnv: PACK_TEST_EMBED }
search:
  limits: { perCallerPerDay: 1, perDay: 100, perCallerPerMinute: 20 }
`);
  const values = { PACK_TEST_CHAT: 'fake', PACK_TEST_EMBED: 'fake', PACK_TEST_KV_URL: 'http://127.0.0.1:8779/kv', PACK_TEST_KV_TOKEN: 'fake', PACK_TEST_TURNSTILE: 'fake-secret' };
  const before = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]));
  Object.assign(process.env, values);
  t.after(() => { for (const [key, value] of Object.entries(before)) if (value === undefined) delete process.env[key]; else process.env[key] = value; });
  const previousFetch = globalThis.fetch;
  globalThis.fetch = fakeServices().send as typeof fetch;
  t.after(() => { globalThis.fetch = previousFetch; });
  const output = path.join(root, 'output');
  await buildVercel(config, output, {}, { chat: true });
  const search = path.join(output, 'functions/__shoalrun/search.func');
  const ask = path.join(output, 'functions/__shoalrun/ask.func');
  assert.equal(JSON.parse(await readFile(path.join(output, 'static/__shoalrun/chat.json'), 'utf8')).action, 'docs_chat', 'the widget receives the same expected action as the verifier');
  const runtime = JSON.parse(await readFile(path.join(search, 'runtime.json'), 'utf8'));
  assert.equal(runtime.settings.chat, undefined);
  assert.ok(!JSON.stringify(runtime).includes('PACK_TEST_CHAT'), 'Search must not carry chat-provider configuration');
  assert.equal(runtime.searchStore.urlEnv, 'PACK_TEST_KV_URL');
  assert.deepEqual((await readdir(path.join(search, 'site/ai'))).sort(), ['chunks.json', 'embeddings.bin', 'embeddings.json']);
  const runner = `
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {Readable} from 'node:stream';
const services = (${fakeServices.toString()})(); globalThis.fetch = services.send;
const {createAskFunction} = await import(${JSON.stringify(pathToFileURL(path.join(ask, 'lib/ask-function.js')).href)});
const {createSession} = await import(${JSON.stringify(pathToFileURL(path.join(ask, 'lib/turnstile.js')).href)});
const {createHostedSearchFunction} = await import(${JSON.stringify(pathToFileURL(path.join(search, 'lib/search-function.js')).href)});
const ask = await createAskFunction(${JSON.stringify(ask)});
const search = await createHostedSearchFunction(${JSON.stringify(search)});
const runtimeFile=${JSON.stringify(path.join(search, 'runtime.json'))};
const original=JSON.parse(await readFile(runtimeFile,'utf8'));
await writeFile(runtimeFile,JSON.stringify({...original,searchStore:undefined}));
await assert.rejects(createHostedSearchFunction(${JSON.stringify(search)}),/shared budget store/);
await writeFile(runtimeFile,JSON.stringify({...original,searchStore:undefined,settings:{...original.settings,chat:{budget:{store:original.searchStore}}}}));
const legacySearch=await createHostedSearchFunction(${JSON.stringify(search)});
assert.equal((await legacySearch(new Request('https://docs.example.com/__shoalrun/search'))).status,405);
await writeFile(runtimeFile,JSON.stringify(original));
const request = (endpoint, body, origin = 'https://docs.example.com', cookie) => new Request('https://docs.example.com/__shoalrun/' + endpoint, {method:'POST',headers:{host:'docs.example.com',origin,'content-type':'application/json',...(cookie?{cookie}:{})},body:JSON.stringify(body)});
const query = {query:'handbook',variant:'production|current|en'};
assert.equal((await (await search(request('search',query))).json()).mode,'vector');
assert.equal((await (await search(request('search',query))).json()).fallbackReason,'budget-denied');
assert.equal((await search(request('search',query,'https://other.example'))).status,403);
for(const turnstileToken of [undefined,'wrong-host','wrong-action']) assert.equal((await ask(request('ask',{question:'Where is the handbook?',turnstileToken}))).status,403);
assert.equal(services.calls.chat,0,'missing or mismatched challenge binding never reaches the model');
const response = await ask(request('ask',{question:'Where is the handbook?',turnstileToken:'human'}));
assert.equal(response.status,200); assert.equal(services.calls.chat,1); assert.equal(services.calls.embeddings,2);
for(const context of [undefined,JSON.stringify({version:1,hostnames:['other.example.com'],action:'docs_chat'}),JSON.stringify({version:1,hostnames:['docs.example.com'],action:'different_action'})]){
 const cookie=createSession({secret:'fake-secret',context}).header('unknown',true).split(';')[0];
 assert.equal((await ask(request('ask',{question:'Where is the handbook?'},undefined,cookie))).status,403,'legacy and different-policy cookies do not bypass challenge binding');
}
assert.equal((await ask(request('ask',{question:'Where is the handbook?'},undefined,response.headers.get('set-cookie').split(';')[0]))).status,200,'a pass for this exact policy still covers follow-ups');
const askRuntimeFile=${JSON.stringify(path.join(ask, 'runtime.json'))};
const askRuntime=JSON.parse(await readFile(askRuntimeFile,'utf8'));
const envWithPreview={...process.env,VERCEL_URL:'preview.example.com'};
const previewRequest=()=>new Request('https://preview.example.com/__shoalrun/ask',{method:'POST',headers:{host:'preview.example.com',origin:'https://preview.example.com','content-type':'application/json'},body:JSON.stringify({question:'Where is the handbook?',turnstileToken:'preview-host'})});
assert.equal((await (await createAskFunction(${JSON.stringify(ask)},envWithPreview))(previewRequest())).status,403,'explicit challenge hostnames can exclude an otherwise allowed deployment host');
delete askRuntime.settings.chat.challenge.hostnames;
await writeFile(askRuntimeFile,JSON.stringify(askRuntime));
assert.equal((await (await createAskFunction(${JSON.stringify(ask)},envWithPreview))(previewRequest())).status,200,'default challenge binding derives exact trusted production and preview hostnames');
for(const [directory,endpoint] of [[${JSON.stringify(ask)},'ask'],[${JSON.stringify(search)},'search']]){
 const handler=(await import(new URL('index.js','file://'+directory+'/'))).default;
 const request=Readable.from([]);request.method='GET';request.url='/__shoalrun/'+endpoint;request.headers={host:'docs.example.com'};
 const result=await new Promise((resolve,reject)=>{const response={statusCode:200,headersSent:false,setHeader(){},end(body){this.headersSent=true;resolve({status:this.statusCode,body:String(body)});}};handler(request,response).catch(reject);});
 assert.equal(result.status,405,'copied Node adapter must preserve endpoint validation');
}
console.log('independent requests, scoped fallback, origin checks and separate budgets passed');
`;
  const result = execFileSync(process.execPath, ['--input-type=module', '-e', runner], { cwd: os.tmpdir(), env: { PATH: process.env.PATH, ...values }, encoding: 'utf8' });
  assert.match(result, /independent requests/);
});
