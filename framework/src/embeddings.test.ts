import assert from 'node:assert/strict';
import { mkdir, mkdtemp, symlink, truncate, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { createProvider, embedChunkIndex, openAIProvider, readEmbeddings, voyageProvider, writeEmbeddings, type EmbeddingProvider } from './embeddings.js';
import { embeddingInput, type Chunk, type ChunkIndex } from './index-build.js';
import { Retriever, fuse, type Hit } from './retrieval.js';

type Call = { url: string; headers: Record<string, string>; body: { input: string[]; model: string; input_type: string; output_dimension: number; truncation: boolean } };

// A fake Voyage endpoint. `respond` decides each reply, and every request is recorded.
function fakeVoyage(respond: (call: Call, attempt: number) => Response | Promise<Response>) {
  const calls: Call[] = [];
  const send = (async (url: string, init: RequestInit) => {
    const call = { url, headers: init.headers as Record<string, string>, body: JSON.parse(init.body as string) } as Call;
    calls.push(call);
    return respond(call, calls.length);
  }) as unknown as typeof fetch;
  return { calls, send };
}

const ok = (call: Call, vector = (text: string, at: number) => Array.from({ length: call.body.output_dimension }, (_, dim) => (dim === at % call.body.output_dimension ? 3 : 0) + text.length * 0)) =>
  Response.json({ data: [...call.body.input].map((text, at) => ({ index: at, embedding: vector(text, at) })).reverse(), usage: { total_tokens: 1 } });

test('the Voyage provider sends the documented request, batches, restores order, and returns unit vectors', async () => {
  const { calls, send } = fakeVoyage(call => ok(call));
  const provider = voyageProvider({ model: 'voyage-4-large', apiKey: 'test-key', fetch: send, batchSize: 2, dimension: 256 });
  const vectors = await provider.embed(['a', 'b', 'c', 'd', 'e'], 'document');
  assert.equal(provider.model, 'voyage-4-large');
  assert.equal(provider.dimension, 256);
  assert.deepEqual(calls.map(call => call.body.input), [['a', 'b'], ['c', 'd'], ['e']]);
  assert.equal(calls[0].url, 'https://api.voyageai.com/v1/embeddings');
  assert.equal(calls[0].headers.authorization, 'Bearer test-key');
  assert.deepEqual({ ...calls[0].body, input: undefined }, { input: undefined, model: 'voyage-4-large', input_type: 'document', output_dimension: 256, truncation: true });
  assert.equal(vectors.length, 5);
  vectors.forEach((vector, at) => { assert.equal(vector.length, 256); assert.ok(Math.abs(Math.hypot(...vector) - 1) < 1e-5); assert.equal(vector[at % 2], 1); });
});

test('the Voyage provider reads the key from the environment, and fails clearly without one', async () => {
  const saved = process.env.VOYAGE_API_KEY;
  try {
    delete process.env.VOYAGE_API_KEY;
    await assert.rejects(voyageProvider({ model: 'voyage-4-large', fetch: fakeVoyage(call => ok(call)).send }).embed(['a'], 'query'), /Set VOYAGE_API_KEY/);
    process.env.VOYAGE_API_KEY = 'from-env';
    const { calls, send } = fakeVoyage(call => ok(call));
    await voyageProvider({ model: 'voyage-4-large', fetch: send }).embed(['a'], 'query');
    assert.equal(calls[0].headers.authorization, 'Bearer from-env');
    assert.equal(calls[0].body.input_type, 'query');
  } finally {
    if (saved === undefined) delete process.env.VOYAGE_API_KEY; else process.env.VOYAGE_API_KEY = saved;
  }
});

test('the Voyage provider retries rate limits and server errors, then gives up without leaking the key', async () => {
  const flaky = fakeVoyage((call, attempt) => attempt < 3 ? new Response('busy', { status: attempt === 1 ? 429 : 503 }) : ok(call));
  assert.equal((await voyageProvider({ model: 'voyage-4-large', apiKey: 'test-key', fetch: flaky.send, retryDelayMs: 0 }).embed(['a'], 'query')).length, 1);
  assert.equal(flaky.calls.length, 3);
  const down = fakeVoyage(() => new Response('nope', { status: 503 }));
  await assert.rejects(voyageProvider({ model: 'voyage-4-large', apiKey: 'test-key', fetch: down.send, retryDelayMs: 0, retries: 1 }).embed(['a'], 'query'), /Voyage returned 503/);
  assert.equal(down.calls.length, 2);
  const denied = fakeVoyage(() => Response.json({ detail: 'Provided API key is invalid.' }, { status: 401 }));
  await assert.rejects(voyageProvider({ model: 'voyage-4-large', apiKey: 'secret-key-value', fetch: denied.send, retryDelayMs: 0 }).embed(['a'], 'query'), (error: Error) => { assert.match(error.message, /401: Provided API key is invalid/); assert.doesNotMatch(error.message, /secret-key-value/); return true; });
  assert.equal(denied.calls.length, 1);
});

test('the Voyage provider rejects a response that does not match the request', async () => {
  const short = fakeVoyage(call => Response.json({ data: [{ index: 0, embedding: Array(call.body.output_dimension).fill(1) }] }));
  await assert.rejects(voyageProvider({ model: 'voyage-4-large', apiKey: 'k', fetch: short.send }).embed(['a', 'b'], 'document'), /unexpected response/);
  const wrong = fakeVoyage(() => Response.json({ data: [{ index: 0, embedding: [1, 2, 3] }] }));
  await assert.rejects(voyageProvider({ model: 'voyage-4-large', apiKey: 'k', fetch: wrong.send }).embed(['a'], 'document'), /unexpected response/);
  assert.throws(() => voyageProvider({ model: 'voyage-4-large', dimension: 300 }), /must be one of/);
  assert.throws(() => voyageProvider({ model: 'voyage-4-large', batchSize: 0 }), /batch size/);
});

test('embedding responses require ordered identities and finite usable vectors', async () => {
  const badRows = [
    [{ index: 0, embedding: [1, 0] }, { index: 0, embedding: [0, 1] }],
    [{ index: 0, embedding: ['bad', 0] }, { index: 1, embedding: [0, 1] }],
    [{ index: 0, embedding: [1e100, 0] }, { index: 1, embedding: [0, 1] }],
    [{ index: 0, embedding: [0, 0] }, { index: 1, embedding: [0, 1] }],
  ];
  for (const data of badRows) {
    const provider = openAIProvider({ model: 'local', dimension: 2, baseUrl: 'http://localhost:8001', fetch: async () => Response.json({ data }) });
    await assert.rejects(provider.embed(['a', 'b'], 'document'), /unexpected response/);
  }
});

const chunk = (id: string, text: string, variant = 'production|current|en'): Chunk => {
  const base = { id, docId: id.split('#')[0], title: 'Guide', type: 'guide', variant, headingPath: [], url: `/${id}`, markdownUrl: `/${id}.md`, text };
  return { ...base, digest: `digest-${text}` };
};

// Deterministic stand-in provider: one axis per distinct text, so identical text gets identical vectors.
function stub(model = 'stub-large', dimension = 4): EmbeddingProvider & { seen: string[] } {
  const seen: string[] = [];
  return { seen, name: 'stub', model, space: model, dimension, async embed(texts) { seen.push(...texts); return texts.map(text => { const vector = new Float32Array(dimension); vector[text.length % dimension] = 1; return vector; }); } };
}

test('vectors round-trip through ai/embeddings.{json,bin} and mismatched files are refused', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-embed-'));
  const meta = { schemaVersion: 1 as const, provider: 'stub', model: 'm', dimension: 3, sourceDigest: 's', ids: ['a', 'b'], digests: ['da', 'db'] };
  const vectors = [Float32Array.from([1, 0, 0]), Float32Array.from([0, 0.6, 0.8])];
  const written = await writeEmbeddings(directory, meta, vectors);
  assert.equal(written.bytes, 24);
  const back = await readEmbeddings(directory);
  assert.deepEqual(back?.meta, { ...meta, space: 'm' });
  assert.deepEqual(back?.vectors.map(vector => [...vector]), [[1, 0, 0], [0, Math.fround(0.6), Math.fround(0.8)]]);
  await assert.rejects(writeEmbeddings(directory, { ...meta, dimension: 4 }, vectors), /do not match/);
  await truncate(written.vectorFile, 20);
  await assert.rejects(readEmbeddings(directory), /does not match/);
  await writeFile(written.metaFile, '{"schemaVersion":2}');
  await assert.rejects(readEmbeddings(directory), /invalid embeddings\.json/);
  assert.equal(await readEmbeddings(await mkdtemp(path.join(os.tmpdir(), 'shoalrun-none-'))), undefined);
});

test('embedChunkIndex embeds only passages without a current vector', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-embed-'));
  const index = (texts: string[]): ChunkIndex => ({ schemaVersion: 1, sourceDigest: texts.join(), chunks: texts.map((text, at) => chunk(`p#${at}`, text)) });
  const first = stub();
  const one = await embedChunkIndex(directory, index(['aa', 'bbb', 'c']), first, embeddingInput);
  assert.deepEqual({ embedded: one.embedded, reused: one.reused, passages: one.passages }, { embedded: 3, reused: 0, passages: 3 });
  assert.equal(first.seen.length, 3);
  const second = stub();
  const two = await embedChunkIndex(directory, index(['aa', 'bbb', 'changed']), second, embeddingInput);
  assert.deepEqual({ embedded: two.embedded, reused: two.reused }, { embedded: 1, reused: 2 });
  assert.equal(second.seen.length, 1);
  assert.match(second.seen[0], /changed/);
  const other = stub('stub-small');
  assert.equal((await embedChunkIndex(directory, index(['aa', 'bbb', 'changed']), other, embeddingInput)).embedded, 3);
  const wider = stub('stub-small', 8);
  assert.equal((await embedChunkIndex(directory, index(['aa', 'bbb', 'changed']), wider, embeddingInput)).embedded, 3);
  assert.equal((await embedChunkIndex(directory, index(['aa', 'bbb', 'changed']), { ...wider, name: 'another-provider' }, embeddingInput)).embedded, 3);
  assert.equal((await readEmbeddings(directory))?.meta.dimension, 8);
});

test('embedding reuse changes with backend, document prefix, and actual input', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-fingerprint-'));
  const index: ChunkIndex = { schemaVersion: 1, sourceDigest: 'x', chunks: [chunk('a#1', 'same')] };
  let calls = 0;
  const provider = (baseUrl: string, documentPrefix = '') => openAIProvider({ model: 'local', dimension: 2, baseUrl, documentPrefix, fetch: async () => { calls++; return Response.json({ data: [{ index: 0, embedding: [1, 0] }] }); } });
  assert.equal((await embedChunkIndex(directory, index, provider('http://localhost:8001'), item => item.text)).embedded, 1);
  assert.equal((await embedChunkIndex(directory, index, provider('http://localhost:8001'), item => item.text)).reused, 1);
  assert.equal((await embedChunkIndex(directory, index, provider('http://localhost:8002'), item => item.text)).embedded, 1);
  assert.equal((await embedChunkIndex(directory, index, provider('http://localhost:8002', 'passage: '), item => item.text)).embedded, 1);
  assert.equal((await embedChunkIndex(directory, index, provider('http://localhost:8002', 'passage: '), item => `changed ${item.text}`)).embedded, 1);
  assert.equal(calls, 4);
  const meta = (await readEmbeddings(directory))!.meta;
  assert.equal(meta.inputDigests?.length, 1);
  assert.doesNotMatch(JSON.stringify(meta), /passage: |localhost/);
});

const hit = (id: string, score = 0): Hit => ({ chunk: chunk(id, id), score });

test('rank fusion combines ranks, not scores, and rewards agreement', () => {
  const fused = fuse([[hit('a', 9), hit('b', 8), hit('c', 7)], [hit('c', 0.9), hit('b', 0.8), hit('d', 0.7)]], 4);
  // c is first in one list and third in the other (1/61 + 1/63), which edges b's two second places (2/62).
  assert.deepEqual(fused.map(item => item.chunk.id), ['c', 'b', 'a', 'd']);
  assert.equal(fuse([[hit('a')]], 5).length, 1);
  assert.deepEqual(fuse([], 5), []);
});

test('vector and hybrid retrieval score by cosine, skip stale vectors, and stay in one publication', () => {
  const chunks = [chunk('a#1', 'alpha topic'), chunk('b#1', 'beta topic'), chunk('c#1', 'gamma topic'), chunk('s#1', 'sandbox topic', 'sandbox|current|en')];
  const index: ChunkIndex = { schemaVersion: 1, sourceDigest: 'x', chunks };
  const meta = { schemaVersion: 1 as const, provider: 'stub', model: 'm', dimension: 2, sourceDigest: 'x', ids: chunks.map(item => item.id), digests: chunks.map((item, at) => at === 2 ? 'stale' : item.digest) };
  const embeddings = { meta, vectors: [Float32Array.from([1, 0]), Float32Array.from([0.6, 0.8]), Float32Array.from([0, 1]), Float32Array.from([1, 0])] };
  const retriever = new Retriever(index, embeddings);
  assert.deepEqual(retriever.coverage(), { total: 4, embedded: 3, stale: 1, model: 'm', dimension: 2 });
  const query = Float32Array.from([3, 0]);
  assert.deepEqual(retriever.vector(query, { variant: 'production|current|en' }).map(item => item.chunk.id), ['a#1', 'b#1']);
  assert.ok(Math.abs(retriever.vector(query, { variant: 'production|current|en' })[1].score - 0.6) < 1e-6);
  assert.deepEqual(retriever.vector(query, { variant: 'sandbox|current|en' }).map(item => item.chunk.id), ['s#1']);
  assert.throws(() => retriever.vector(query), /multiple publications/);
  assert.throws(() => retriever.vector(Float32Array.from([1, 0, 0]), { variant: 'production|current|en' }), /3 dimensions/);
  const hybrid = retriever.hybrid('beta', Float32Array.from([0, 1]), { variant: 'production|current|en', limit: 3 });
  assert.equal(hybrid[0].chunk.id, 'b#1');
  assert.ok(hybrid.length <= 3);
  assert.throws(() => new Retriever(index).vector(query, { variant: 'production|current|en' }), /No current embeddings/);
});

test('semantic search is optional: hybrid falls back to lexical without vectors or a query vector', () => {
  const chunks = [chunk('a#1', 'alpha topic'), chunk('b#1', 'beta topic')];
  const index: ChunkIndex = { schemaVersion: 1, sourceDigest: 'x', chunks };
  const options = { variant: 'production|current|en' };
  const plain = new Retriever(index);
  assert.equal(plain.hasVectors(options), false);
  assert.deepEqual(plain.coverage(), { total: 2, embedded: 0, stale: 0 });
  assert.deepEqual(plain.hybrid('beta', Float32Array.from([0, 1]), options), plain.lexical('beta', options));
  const embeddings = { meta: { schemaVersion: 1 as const, provider: 'stub', model: 'm', dimension: 2, sourceDigest: 'x', ids: ['a#1', 'b#1'], digests: chunks.map(item => item.digest) }, vectors: [Float32Array.from([1, 0]), Float32Array.from([0, 1])] };
  const semantic = new Retriever(index, embeddings);
  assert.equal(semantic.hasVectors(options), true);
  assert.deepEqual(semantic.hybrid('beta', undefined, options), semantic.lexical('beta', options));
  // Vectors that no longer match their passages count as absent.
  const stale = new Retriever(index, { ...embeddings, meta: { ...embeddings.meta, digests: ['old', 'old'] } });
  assert.equal(stale.hasVectors(options), false);
  assert.deepEqual(stale.hybrid('beta', Float32Array.from([0, 1]), options), stale.lexical('beta', options));
});

test('embedding files are neither read from nor written to an ai directory that leaves the site', async () => {
  const outside = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-outside-'));
  const meta = { schemaVersion: 1 as const, provider: 'stub', model: 'm', dimension: 2, sourceDigest: 's', ids: ['a'], digests: ['da'] };
  await writeEmbeddings(outside, meta, [Float32Array.from([1, 0])]);
  const site = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-site-'));
  await mkdir(site, { recursive: true });
  await symlink(path.join(outside, 'ai'), path.join(site, 'ai'));
  await assert.rejects(readEmbeddings(site), /leaves the site directory/);
  await assert.rejects(writeEmbeddings(site, meta, [Float32Array.from([1, 0])]), /leaves the site directory/);
});

type OpenAICall = { url: string; headers: Record<string, string>; body: { input: string[]; model: string; encoding_format: string; dimensions?: number; input_type?: string } };

function fakeOpenAI(respond?: (call: OpenAICall, attempt: number) => Response) {
  const calls: OpenAICall[] = [];
  const send = (async (url: string, init: RequestInit) => {
    const call = { url, headers: init.headers as Record<string, string>, body: JSON.parse(init.body as string) } as OpenAICall;
    calls.push(call);
    const dimension = call.body.dimensions ?? 4;
    return respond?.(call, calls.length) ?? Response.json({ data: call.body.input.map((_, at) => ({ index: at, embedding: Array.from({ length: dimension }, (__, dim) => dim === at % dimension ? 5 : 0) })).reverse() });
  }) as unknown as typeof fetch;
  return { calls, send };
}

test('the OpenAI-style provider sends the standard request, with no input type, and each model is its own space', async () => {
  const { calls, send } = fakeOpenAI();
  const provider = openAIProvider({ model: 'text-embedding-3-small', apiKey: 'test-key', fetch: send, dimension: 256, batchSize: 2 });
  const vectors = await provider.embed(['a', 'b', 'c'], 'document');
  assert.deepEqual({ model: provider.model, dimension: provider.dimension, space: provider.space, name: provider.name }, { model: 'text-embedding-3-small', dimension: 256, space: 'text-embedding-3-small', name: 'openai' });
  assert.deepEqual(calls.map(call => call.body.input), [['a', 'b'], ['c']]);
  assert.equal(calls[0].url, 'https://api.openai.com/v1/embeddings');
  assert.equal(calls[0].headers.authorization, 'Bearer test-key');
  assert.deepEqual({ ...calls[0].body, input: undefined }, { input: undefined, model: 'text-embedding-3-small', encoding_format: 'float', dimensions: 256 });
  assert.equal(calls[0].body.input_type, undefined);
  vectors.forEach((vector, at) => { assert.equal(vector.length, 256); assert.ok(Math.abs(Math.hypot(...vector) - 1) < 1e-5); assert.equal(vector[at % 2], 1); });
  assert.equal(voyageProvider({ model: 'voyage-4-large' }).space, voyageProvider({ model: 'voyage-4-lite' }).space);
  assert.notEqual(voyageProvider({ model: 'voyage-4-large' }).space, voyageProvider({ model: 'voyage-code-4' }).space);
  assert.notEqual(provider.space, openAIProvider({ model: 'text-embedding-3-large' }).space);
});

test('the OpenAI-style provider works against a compatible local server and its own key variable', async () => {
  const local = fakeOpenAI();
  const saved = process.env.OPENAI_API_KEY;
  try {
    delete process.env.OPENAI_API_KEY;
    const ollama = openAIProvider({ baseUrl: 'http://localhost:11434/v1/', model: 'nomic-embed-text', dimension: 4, fetch: local.send, queryPrefix: 'search_query: ', documentPrefix: 'search_document: ' });
    await ollama.embed(['hello'], 'query');
    await ollama.embed(['hello'], 'document');
    assert.equal(local.calls[0].url, 'http://localhost:11434/v1/embeddings');
    assert.equal(local.calls[0].headers.authorization, undefined);
    assert.equal(local.calls[0].body.dimensions, undefined);
    assert.deepEqual(local.calls.map(call => call.body.input[0]), ['search_query: hello', 'search_document: hello']);
    await assert.rejects(openAIProvider({ model: 'text-embedding-3-small', fetch: local.send }).embed(['a'], 'query'), /Set OPENAI_API_KEY/);
    await assert.rejects(openAIProvider({ model: 'text-embedding-3-small', baseUrl: 'https://example.com/v1', keyEnv: 'MY_EMBED_KEY', fetch: local.send }).embed(['a'], 'query'), /Set MY_EMBED_KEY/);
    process.env.MY_EMBED_KEY = 'custom-key';
    await openAIProvider({ model: 'text-embedding-3-small', baseUrl: 'https://example.com/v1', keyEnv: 'MY_EMBED_KEY', fetch: local.send }).embed(['a'], 'query');
    assert.equal(local.calls.at(-1)?.headers.authorization, 'Bearer custom-key');
  } finally {
    delete process.env.MY_EMBED_KEY;
    if (saved !== undefined) process.env.OPENAI_API_KEY = saved;
  }
});

test('the OpenAI-style provider needs a dimension for unknown models and checks the response, retries, and hides the key', async () => {
  assert.throws(() => openAIProvider({ model: 'some-local-model' }), /Pass a dimension/);
  const wrong = fakeOpenAI(() => Response.json({ data: [{ index: 0, embedding: [1, 2, 3] }] }));
  await assert.rejects(openAIProvider({ apiKey: 'k', model: 'some-local-model', dimension: 4, fetch: wrong.send }).embed(['a'], 'query'), /unexpected response/);
  const flaky = fakeOpenAI((call, attempt) => attempt < 2 ? new Response('busy', { status: 429 }) : Response.json({ data: [{ index: 0, embedding: [1, 0, 0, 0] }] }));
  assert.equal((await openAIProvider({ apiKey: 'k', model: 'some-local-model', dimension: 4, fetch: flaky.send, retryDelayMs: 0 }).embed(['a'], 'query')).length, 1);
  const denied = fakeOpenAI(() => Response.json({ error: { message: 'Incorrect API key provided.' } }, { status: 401 }));
  await assert.rejects(openAIProvider({ model: 'text-embedding-3-small', apiKey: 'sk-secret-value', fetch: denied.send, retryDelayMs: 0 }).embed(['a'], 'query'), (error: Error) => { assert.match(error.message, /401: Incorrect API key provided/); assert.doesNotMatch(error.message, /sk-secret-value/); return true; });
  assert.equal(createProvider({ provider: 'openai', model: 'text-embedding-3-small' }).name, 'openai');
  assert.equal(createProvider({ provider: 'voyage', model: 'voyage-4-lite' }).name, 'voyage');
  assert.throws(() => createProvider(), /Choose an embedding provider/);
  assert.throws(() => createProvider({ provider: 'openai' }), /Choose an embedding model for openai/);
  assert.throws(() => createProvider({ provider: 'cohere', model: 'x' }), /Unknown embedding provider cohere/);
  assert.throws(() => voyageProvider({} as never), /Choose a Voyage model/);
  assert.throws(() => openAIProvider({} as never), /Choose an embedding model/);
});

test('vector files written before spaces existed get one from their provider and model', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-legacy-'));
  const meta = { schemaVersion: 1 as const, provider: 'voyage', model: 'voyage-4-large', dimension: 2, sourceDigest: 's', ids: ['a'], digests: ['da'] };
  await writeEmbeddings(directory, meta, [Float32Array.from([1, 0])]);
  assert.equal((await readEmbeddings(directory))?.meta.space, voyageProvider({ model: 'voyage-4-lite' }).space);
  await writeEmbeddings(directory, { ...meta, provider: 'openai', model: 'text-embedding-3-small' }, [Float32Array.from([1, 0])]);
  assert.equal((await readEmbeddings(directory))?.meta.space, 'text-embedding-3-small');
});
