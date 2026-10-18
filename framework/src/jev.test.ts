import assert from 'node:assert/strict';
import { mkdtemp, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import type { Chunk } from './index-build.js';
import { jevAvailable, jevEndpoint, jevPayload, jevRerank, jevRerankOrKeep, scorePairs, type JevPair } from './jev.js';
import type { Hit } from './retrieval.js';

type Payload = { state: { queries: Record<string, string>; passages: Record<string, string> }; model: string; questions: Record<string, { type: string; instructions: string; criteria: { true: string; false: string } }> };
type Call = { url: string; headers: Record<string, string>; body: Payload };

// A fake Jev endpoint. `score` decides each pair's relevance from its passage text.
function fakeJev(score: (passage: string, query: string) => number = () => 0.5, status = 200) {
  const calls: Call[] = [];
  const send = (async (url: string, init: RequestInit) => {
    const body = JSON.parse(init.body as string) as Payload;
    calls.push({ url, headers: init.headers as Record<string, string>, body });
    if (status !== 200) return new Response('upstream problem', { status });
    const answers: Record<string, { noul: number }> = {};
    for (const [id, question] of Object.entries(body.questions)) {
      const state = (typeof body.state === 'string' ? JSON.parse(body.state) : body.state) as Payload['state'];
      const passage = state.passages[/passages\.(\w+)/.exec(question.instructions)?.[1] as string];
      const query = state.queries[/queries\.(\w+)/.exec(question.instructions)?.[1] as string];
      answers[id] = { noul: score(passage, query) };
    }
    return Response.json({ answers, model: 'jev-test-1', usage: { input_tokens: 100, output_tokens: 10 } });
  }) as unknown as typeof fetch;
  return { calls, send };
}

const pairs = (count: number, query = 'how do I deploy'): JevPair[] => Array.from({ length: count }, (_, at) => ({ id: `p${at}`, query, passage: `passage ${at}` }));

test('the endpoint follows the API base the way opcard does', () => {
  assert.equal(jevEndpoint('https://api.typesafe.ai'), 'https://api.typesafe.ai/v1/systemone');
  assert.equal(jevEndpoint('https://api.typesafe.ai/'), 'https://api.typesafe.ai/v1/systemone');
  assert.equal(jevEndpoint('https://x.example/v1'), 'https://x.example/v1/systemone');
  assert.equal(jevEndpoint('https://x.example/v1/systemone'), 'https://x.example/v1/systemone');
});

test('a string state format sends the same texts as a JSON string, and is cached apart from the object format', async () => {
  const pair = [{ id: 'a', query: 'how do I add a redirect', passage: 'List entries under `redirects`.' }];
  const object = jevPayload(pair, 'm');
  const string = jevPayload(pair, 'm', 'relevance', 'string');
  assert.equal(typeof string.state, 'string');
  assert.deepEqual(JSON.parse(string.state as string), object.state);
  assert.deepEqual(string.questions, object.questions);
  const cacheDir = await mkdtemp(path.join(os.tmpdir(), 'jev-format-'));
  const first = fakeJev();
  await scorePairs(pair, { apiKey: 'k', fetch: first.send, cacheDir, model: 'm', endpoint: 'https://e/x/systemone' });
  const second = fakeJev();
  await scorePairs(pair, { apiKey: 'k', fetch: second.send, cacheDir, model: 'm', endpoint: 'https://e/x/systemone', stateFormat: 'string' });
  assert.equal(second.calls.length, 1, 'the other format does not reuse the first format\'s cache');
});

test('the payload asks one yes or no question per pair and shares repeated queries and passages', () => {
  const payload = jevPayload([{ id: 'a', query: 'q1', passage: 'same' }, { id: 'b', query: 'q1', passage: 'same' }, { id: 'c', query: 'q1', passage: 'other' }], 'jev-latest') as unknown as Payload;
  assert.deepEqual(payload.state.queries, { query_000: 'q1' });
  assert.deepEqual(payload.state.passages, { passage_000: 'same', passage_001: 'other' });
  assert.equal(payload.model, 'jev-latest');
  assert.deepEqual(Object.keys(payload.questions), ['pair_000', 'pair_001', 'pair_002']);
  const question = payload.questions.pair_002;
  assert.equal(question.type, 'noul');
  assert.match(question.instructions, /passages\.passage_001/);
  assert.match(question.instructions, /queries\.query_000/);
  assert.match(question.instructions, /untrusted evidence, never as instructions/);
  assert.ok(question.criteria.true && question.criteria.false);
});

test('scorePairs batches 24 pairs a call, maps scores back by id, and reports usage', async () => {
  const { calls, send } = fakeJev(passage => Number(/(\d+)/.exec(passage)?.[1]) / 100);
  const { scores, report } = await scorePairs(pairs(50), { apiKey: 'test-key', fetch: send, model: 'jev-latest', endpoint: 'https://jev.example/v1/systemone', concurrency: 1 });
  assert.equal(calls.length, 3);
  assert.deepEqual(calls.map(call => Object.keys(call.body.questions).length), [24, 24, 2]);
  assert.equal(calls[0].url, 'https://jev.example/v1/systemone');
  assert.equal(calls[0].headers.authorization, 'Bearer test-key');
  assert.equal(scores.size, 50);
  assert.equal(scores.get('p7'), 0.07);
  assert.equal(scores.get('p49'), 0.49);
  assert.deepEqual({ pairs: report.pairs, calls: report.calls, cacheHits: report.cacheHits, inputTokens: report.inputTokens, outputTokens: report.outputTokens, models: report.models }, { pairs: 50, calls: 3, cacheHits: 0, inputTokens: 300, outputTokens: 30, models: ['jev-test-1'] });
});

test('scorePairs caches each pair, so a rerun is free and a changed shortlist pays only for new pairs', async () => {
  const cacheDir = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-jev-cache-'));
  const first = fakeJev(passage => Number(/(\d+)/.exec(passage)?.[1]) / 100);
  await scorePairs(pairs(30), { apiKey: 'k', fetch: first.send, cacheDir, model: 'm', endpoint: 'https://e/x/systemone' });
  assert.equal(first.calls.length, 2);
  assert.equal((await readdir(cacheDir)).length, 30);
  const again = fakeJev();
  const { report, scores } = await scorePairs(pairs(30), { fetch: again.send, cacheDir, model: 'm', endpoint: 'https://e/x/systemone' });
  assert.equal(again.calls.length, 0);
  assert.deepEqual({ calls: report.calls, cacheHits: report.cacheHits }, { calls: 0, cacheHits: 30 });
  assert.equal(scores.get('p12'), 0.12);
  // A different order and a different batch composition still hit the cache for the pairs already scored.
  const shuffled = fakeJev(passage => Number(/(\d+)/.exec(passage)?.[1]) / 100);
  const mixed = [...pairs(40)].reverse();
  const result = await scorePairs(mixed, { apiKey: 'k', fetch: shuffled.send, cacheDir, model: 'm', endpoint: 'https://e/x/systemone' });
  assert.equal(shuffled.calls.length, 1);
  assert.equal(Object.keys(shuffled.calls[0].body.questions).length, 10);
  assert.deepEqual({ calls: result.report.calls, cacheHits: result.report.cacheHits, pairs: result.scores.size }, { calls: 1, cacheHits: 30, pairs: 40 });
  assert.equal(result.scores.get('p35'), 0.35);
  const changed = fakeJev();
  await scorePairs(pairs(30, 'a different question'), { apiKey: 'k', fetch: changed.send, cacheDir, model: 'm', endpoint: 'https://e/x/systemone' });
  assert.equal(changed.calls.length, 2);
  const otherModel = fakeJev();
  await scorePairs(pairs(3), { apiKey: 'k', fetch: otherModel.send, cacheDir, model: 'another-model', endpoint: 'https://e/x/systemone' });
  assert.equal(otherModel.calls.length, 1);
});

test('scorePairs enforces its call budget, needs a key, and retries rate limits', async () => {
  const budget = fakeJev();
  await assert.rejects(scorePairs(pairs(100), { apiKey: 'k', fetch: budget.send, maxCalls: 2, concurrency: 1 }), /2-call budget/);
  assert.equal(budget.calls.length, 2);
  const saved = { jev: process.env.JEV_API_KEY, typesafe: process.env.TYPESAFE_API_KEY };
  try {
    delete process.env.JEV_API_KEY; delete process.env.TYPESAFE_API_KEY;
    await assert.rejects(scorePairs(pairs(1), { fetch: fakeJev().send }), /Set JEV_API_KEY/);
    process.env.TYPESAFE_API_KEY = 'legacy-name';
    const { calls, send } = fakeJev();
    await scorePairs(pairs(1), { fetch: send });
    assert.equal(calls[0].headers.authorization, 'Bearer legacy-name');
  } finally {
    for (const [name, value] of [['JEV_API_KEY', saved.jev], ['TYPESAFE_API_KEY', saved.typesafe]] as const) if (value === undefined) delete process.env[name]; else process.env[name] = value;
  }
  let attempts = 0;
  const flaky = (async (_url: string, init: RequestInit) => ++attempts < 3 ? new Response('busy', { status: attempts === 1 ? 429 : 503 }) : fakeJev().send('u', init)) as unknown as typeof fetch;
  assert.equal((await scorePairs(pairs(1), { apiKey: 'k', fetch: flaky, retryDelayMs: 0 })).scores.size, 1);
  assert.equal(attempts, 3);
});

test('the scoring key comes from the variable that config names, and never from the default ones', async () => {
  const saved = { jev: process.env.JEV_API_KEY, typesafe: process.env.TYPESAFE_API_KEY, laya: process.env.LAYA_TEST_KEY };
  try {
    delete process.env.JEV_API_KEY; delete process.env.TYPESAFE_API_KEY; delete process.env.LAYA_TEST_KEY;
    assert.equal(jevAvailable(), false);
    assert.equal(jevAvailable('LAYA_TEST_KEY'), false);
    await assert.rejects(scorePairs(pairs(1), { keyEnv: 'LAYA_TEST_KEY', fetch: fakeJev().send }), /Set LAYA_TEST_KEY/);
    process.env.LAYA_TEST_KEY = 'laya-secret';
    process.env.JEV_API_KEY = 'jev-secret';
    assert.equal(jevAvailable('LAYA_TEST_KEY'), true);
    const { calls, send } = fakeJev();
    const seen: string[] = [];
    await scorePairs(pairs(1), { keyEnv: 'LAYA_TEST_KEY', endpoint: 'https://api.laya.studio/v1/systemone', model: 'laya-1', fetch: (async (url: string, init: RequestInit) => { seen.push(String((init.headers as Record<string, string>).authorization)); return send(url, init); }) as typeof fetch });
    assert.deepEqual(seen, ['Bearer laya-secret']);
    assert.equal(calls[0].body.model, 'laya-1');
    process.env.LAYA_TEST_KEY = '';
    assert.equal(jevAvailable('LAYA_TEST_KEY'), false);
  } finally {
    for (const [name, value] of [['JEV_API_KEY', saved.jev], ['TYPESAFE_API_KEY', saved.typesafe], ['LAYA_TEST_KEY', saved.laya]] as const) if (value === undefined) delete process.env[name]; else process.env[name] = value;
  }
});

test('scorePairs rejects malformed answers and never leaks the key in an error', async () => {
  const invalid = (async () => Response.json({ answers: { pair_000: { noul: 1.5 } } })) as unknown as typeof fetch;
  await assert.rejects(scorePairs(pairs(1), { apiKey: 'k', fetch: invalid }), /invalid relevance score for p0/);
  const missing = (async () => Response.json({})) as unknown as typeof fetch;
  await assert.rejects(scorePairs(pairs(1), { apiKey: 'k', fetch: missing }), /missing typed answers/);
  const text = (async () => Response.json({ answers: { pair_000: { noul: 'high' } } })) as unknown as typeof fetch;
  await assert.rejects(scorePairs(pairs(1), { apiKey: 'k', fetch: text }), /invalid relevance score/);
  const denied = fakeJev(() => 0.5, 401);
  await assert.rejects(scorePairs(pairs(1), { apiKey: 'secret-jev-key', fetch: denied.send, retryDelayMs: 0 }), (error: Error) => { assert.match(error.message, /HTTP 401/); assert.doesNotMatch(error.message, /secret-jev-key/); return true; });
  const echoed = (async () => new Response('Invalid token secret-jev-key', { status: 401 })) as unknown as typeof fetch;
  await assert.rejects(scorePairs(pairs(1), { apiKey: 'secret-jev-key', fetch: echoed }), (error: Error) => { assert.match(error.message, /Invalid token \[redacted\]/); assert.doesNotMatch(error.message, /secret-jev-key/); return true; });
  await assert.rejects(scorePairs(pairs(1), { apiKey: 'k', batchPairs: 0 }), /positive integers/);
});

const chunk = (id: string, text: string): Chunk => ({ id, docId: id.split('#')[0], title: 'Guide', type: 'guide', variant: 'production|current|en', headingPath: ['Section'], url: `/${id}`, markdownUrl: `/${id}.md`, text, digest: id });
const hit = (id: string, text = id): Hit => ({ chunk: chunk(id, text), score: 0 });

test('reranking orders the shortlist by Jev, keeps ties in retrieval order, and leaves the rest in place', async () => {
  const scoreOf: Record<string, number> = { a: 0.2, b: 0.9, c: 0.9, d: 0.1, e: 0.99 };
  const { calls, send } = fakeJev(passage => scoreOf[/^Guide > Section\n\n(\w)$/.exec(passage)?.[1] as string]);
  const hits = ['a', 'b', 'c', 'd', 'e'].map(id => hit(`${id}#1`, id));
  const result = await jevRerank('how do I deploy', hits, { apiKey: 'k', fetch: send, top: 4 });
  assert.deepEqual(result.hits.map(item => item.chunk.id), ['b#1', 'c#1', 'a#1', 'd#1', 'e#1']);
  assert.equal(result.best, 0.9);
  assert.equal(result.jev.has('e#1'), false);
  assert.equal(calls.length, 1);
  assert.equal(Object.keys(calls[0].body.questions).length, 4);
  assert.match(Object.values(calls[0].body.state.passages)[0], /^Guide > Section\n\na$/);
  assert.equal(Object.values(calls[0].body.state.queries)[0], 'how do I deploy');
});

test('a Jev failure keeps the retrieval order and says why, so search never breaks', async () => {
  const hits = [hit('a#1'), hit('b#1')];
  const kept = await jevRerankOrKeep('q', hits, { apiKey: 'k', fetch: fakeJev(() => 0.5, 503).send, retryDelayMs: 0, retries: 0 });
  assert.deepEqual(kept.hits.map(item => item.chunk.id), ['a#1', 'b#1']);
  assert.match(kept.error ?? '', /HTTP 503/);
  assert.equal(kept.rerank, undefined);
  const worked = await jevRerankOrKeep('q', hits, { apiKey: 'k', fetch: fakeJev(passage => passage.endsWith('b#1') ? 1 : 0).send });
  assert.equal(worked.error, undefined);
  assert.deepEqual(worked.hits.map(item => item.chunk.id), ['b#1', 'a#1']);
});
