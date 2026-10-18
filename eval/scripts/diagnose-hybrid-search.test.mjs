import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fuse, Retriever } from '../../framework/dist/retrieval.js';
import { fingerprint, readCachedVectors, weightedFusion, collapsePages, answerRank, compareRanking } from './diagnose-hybrid-search.mjs';
const chunk = (id, docId = id, audience = 'writer') => ({ id, docId, title: docId, type: 'reference', variant: 'production|current|en', headingPath: [], url: `/${docId}`, markdownUrl: `/${docId}.md`, text: 'boat', digest: id, readerFilters: { audience: [audience] } });
const hit = id => ({ chunk: chunk(id), score: 10 });

test('equal-weight diagnostics reproduce fusion ties; heavier vectors and zero weights behave deliberately', () => {
  const lexical = [hit('b'), hit('c'), hit('a')], vector = [hit('a'), hit('c'), hit('b')];
  assert.deepEqual(weightedFusion(lexical, vector), fuse([lexical, vector], 60));
  assert.equal(weightedFusion(lexical, vector, { vectorWeight: 8 })[0].chunk.id, 'a');
  assert.deepEqual(weightedFusion([hit('only-lexical')], vector, { lexicalWeight: 0 }).map(h => h.chunk.id), vector.map(h => h.chunk.id));
  for (const options of [{ vectorWeight: -1 }, { vectorWeight: NaN }, { lexicalWeight: 0, vectorWeight: 0 }, { k: -1 }]) assert.throws(() => weightedFusion(lexical, vector, options));
});

test('page scoring collapses repeated passages and requires every synthesis group', () => {
  const pages = collapsePages([{ chunk: chunk('a1', 'a') }, { chunk: chunk('a2', 'a') }, { chunk: chunk('b1', 'b') }]);
  assert.deepEqual(pages, ['a', 'b']);
  assert.equal(answerRank({ kind: 'synthesis', expectGroups: [['a', 'alternative'], ['b']] }, pages), 2);
  assert.equal(answerRank({ kind: 'synthesis', expectGroups: [['a'], ['missing']] }, pages), 0);
  assert.equal(answerRank({ kind: 'none', expect: [] }, pages), 0);
});

test('diagnostics honor reader filters and disclose expected passages omitted from candidate lists', () => {
  const chunks = [chunk('a1', 'a'), chunk('a2', 'a'), chunk('b1', 'b', 'reader')];
  const index = { schemaVersion: 1, sourceDigest: 'test', chunks };
  const stored = { meta: { ids: chunks.map(c => c.id), digests: chunks.map(c => c.digest) }, vectors: chunks.map(() => Float32Array.from([1, 0])) };
  const result = compareRanking(new Retriever(index, stored), [{ kind: 'task', query: 'boat', expect: ['b'], readerSelection: { audience: ['writer'] } }], [Float32Array.from([1, 0])], { name: 'test', passageLimit: 2, candidateDepth: 50 });
  assert.equal(result.scores.vector.overall.hitRate[3], 0);
  assert.equal(result.diagnostics[0].expectedPassages.length, 0);
  assert.deepEqual(result.scores.vector.rows[0].top, ['a']);
});

test('offline cache reads refuse misses and corrupt fingerprints, preserve duplicate text alignment, and never call fetch', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-offline-vectors-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const fetch = t.mock.method(globalThis, 'fetch', () => { throw new Error('Unexpected network request'); });
  const model = { name: 'test', provider: 'voyage' };
  const texts = ['a', 'b', 'a'];
  await assert.rejects(readCachedVectors(model, texts, 'query', 2, [root]), /never makes API calls/);
  const key = fingerprint({ version: 1, model, dimension: 2, inputType: 'query', texts: ['a', 'b'] });
  await writeFile(path.join(root, `${key}.json`), JSON.stringify({ cacheKey: 'wrong', vectors: [[1, 0], [0, 1]] }));
  await assert.rejects(readCachedVectors(model, texts, 'query', 2, [root]), /fingerprint/);
  await writeFile(path.join(root, `${key}.json`), JSON.stringify({ cacheKey: key, vectors: [[1, 0], [0, 1]] }));
  const got = await readCachedVectors(model, texts, 'query', 2, [root]);
  assert.deepEqual(got.vectors.map(v => [...v]), [[1, 0], [0, 1], [1, 0]]);
  assert.deepEqual(got.batches, [key]);
  assert.equal(fetch.mock.callCount(), 0);
});
