import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { models, normalizedVectors, pairedHitRate, reportMarkdown, requestEmbeddings, scoreQueries, tokenPacer } from './benchmark-embeddings.mjs';

test('benchmark uses native provider input types, dimensions, and correctly ordered normalized vectors', async t => {
  const previous = process.env.BENCHMARK_TEST_KEY;
  process.env.BENCHMARK_TEST_KEY = 'test-only-key';
  t.after(() => { if (previous === undefined) delete process.env.BENCHMARK_TEST_KEY; else process.env.BENCHMARK_TEST_KEY = previous; });
  for (const provider of ['voyage', 'cohere']) for (const type of ['query', 'document']) {
    const model = { ...models.find(model => model.provider === provider), keyEnv: 'BENCHMARK_TEST_KEY' };
    const result = await requestEmbeddings(model, ['first', 'second'], type, 2, { retries: 0, fetch: async (_url, options) => {
      const body = JSON.parse(options.body);
      if (provider === 'cohere') {
        assert.equal(body.input_type, type === 'query' ? 'search_query' : 'search_document');
        assert.equal(body.truncate, 'NONE');
        assert.deepEqual(body.embedding_types, ['float']);
        assert.deepEqual(body.texts, ['first', 'second']);
      } else {
        assert.equal(body.input_type, type);
        assert.equal(body.truncation, false);
        assert.deepEqual(body.input, ['first', 'second']);
      }
      assert.equal(body.output_dimension, 2);
      return Response.json(provider === 'cohere'
        ? { embeddings: { float: [[3, 4], [0, 2]] }, meta: { billed_units: { input_tokens: 5 } } }
        : { data: [{ index: 1, embedding: [0, 2] }, { index: 0, embedding: [3, 4] }], usage: { total_tokens: 5 } });
    } });
    assert.ok(Math.abs(result.vectors[0][0] - 0.6) < 1e-6);
    assert.deepEqual([...result.vectors[1]], [0, 1]);
    assert.equal(result.billedTokens, 5);
  }
});

test('benchmark rejects invalid embeddings rather than scoring corrupt vectors', () => {
  for (const rows of [[], [[1]], [[0, 0]], [[NaN, 1]], [[Infinity, 1]], [['1', 1]], [[Number.MAX_VALUE, 1]]]) {
    assert.throws(() => normalizedVectors(rows, 1, 2));
  }
});

test('benchmark collapses passages to pages, requires every expected group, and honors reader views', () => {
  const chunk = (id, docId, audience, text) => ({ id, docId, title: docId, type: 'reference', variant: 'production|current|en', headingPath: [], url: `/${docId}`, markdownUrl: `/${docId}.md`, text, digest: id, readerFilters: { audience: [audience] } });
  const index = { schemaVersion: 1, sourceDigest: 'test', chunks: [chunk('a1', 'a', 'writer', 'boat boat boat'), chunk('a2', 'a', 'writer', 'boat boat'), chunk('b1', 'b', 'reader', 'boat'), chunk('c1', 'c', 'writer', 'boat')] };
  const queries = [
    { kind: 'task', split: 'original', query: 'boat', expect: ['a'], expectGroups: [['a'], ['c']] },
    { kind: 'task', split: 'additional', query: 'boat', expect: ['b'], readerSelection: { audience: ['writer'] } },
    { kind: 'none', query: 'boat', expect: [] }
  ];
  const result = scoreQueries(index, queries, undefined, undefined, 'lexical');
  assert.deepEqual(result.rows[0].top, ['a', 'b', 'c']);
  assert.equal(result.rows[0].rank, 3);
  assert.equal(result.rows[1].rank, 0);
  assert.equal(result.overall.count, 2);
  assert.equal(result.bySplit.original.count, 1);
  assert.equal(result.bySplit.original.hitRate[3], 1);
  assert.equal(result.bySplit.additional.hitRate[3], 0);
  assert.equal(result.overall.hitRate[3], 0.5);
  assert.equal(result.overall.mrr, 1 / 6);
});

test('paired comparison preserves query pairing and reports directional wins and losses', () => {
  const scores = ranks => ({ rows: ranks.map((rank, at) => ({ query: `q${at}`, kind: 'task', rank })) });
  const result = pairedHitRate(scores([1, 5, 0]), scores([0, 1, 1]));
  assert.equal(result.delta, 1 / 3);
  assert.equal(result.wins, 2);
  assert.equal(result.losses, 1);
  assert.equal(result.ties, 0);
  assert.ok(result.ci95[0] <= result.delta && result.ci95[1] >= result.delta);
  assert.deepEqual(result, pairedHitRate(scores([1, 5, 0]), scores([0, 1, 1])));
  assert.throws(() => pairedHitRate(scores([1]), { rows: [{ query: 'different', kind: 'task', rank: 1 }] }));
});

test('token pacing waits for a shared window to expire before accepting another batch', async () => {
  let time = 0;
  const pauses = [];
  const pace = tokenPacer(100, () => time, async ms => { pauses.push(ms); time += ms; });
  await pace(60);
  await pace(40);
  assert.deepEqual(pauses, []);
  await pace(1);
  assert.deepEqual(pauses, [60_001]);
  await assert.rejects(pace(101), /exceeds the token pacing limit/);
});

test('expanded fixture preserves every original query and contains 200 distinct scoped cases', async () => {
  const original = JSON.parse(await readFile(new URL('../fixtures/retrieval-queries.json', import.meta.url), 'utf8'));
  const expanded = JSON.parse(await readFile(new URL('../fixtures/embedding-benchmark-queries-200.json', import.meta.url), 'utf8'));
  assert.equal(expanded.queries.length, 200);
  assert.deepEqual(expanded.queries.filter(row => row.split === 'original').map(({ split, ...row }) => row), original.queries);
  assert.equal(expanded.queries.filter(row => row.split === 'additional').length, 106);
  assert.equal(new Set(expanded.queries.map(row => JSON.stringify([row.query, row.variant, row.readerSelection]))).size, 200);
  for (const row of expanded.queries) {
    assert.ok(row.query.trim());
    if (row.kind !== 'none') assert.ok((row.expectGroups ?? [row.expect]).every(group => group.length > 0));
  }
});

test('readable report explains the metrics and formats differences as percentage points', () => {
  const report = { createdAt: '2026-10-02', dimension: 1024, pages: 128, passages: 1097, queries: 200, answerable: 179, runs: [], models: [], comparisons: [{ candidate: 'test', mode: 'vector', delta: 0.02, ci95: [-0.01, 0.05], wins: 3, losses: 1 }] };
  const markdown = reportMarkdown(report, { dataUrl: 'https://example.net/results' });
  assert.ok(markdown.includes('https://example.net/results'));
  assert.ok(markdown.includes('| test | vector | 2.0 | -1.0 to 5.0 | 3 | 1 |'));
  for (const term of ['BM25', 'Mean reciprocal rank', 'Hit@1', 'Reciprocal rank fusion', 'p95', 'billedTokens', 'bestScore', 'queryDigest', 'Held-out evaluation']) assert.ok(markdown.includes(term), term);
  assert.ok(!markdown.includes('## Original and added queries'));
});
