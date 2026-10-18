import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pageFusion } from './diagnose-page-fusion.mjs';
const hit = (id, docId, variant = 'production|current|en') => ({ chunk: { id, docId, variant }, score: 1 });

test('page fusion combines different lexical and semantic sections and preserves both supporting passages', () => {
  const lexical = [hit('a-lex', 'a'), hit('b', 'b'), hit('c', 'c')];
  const vector = [hit('a-vector', 'a'), hit('c', 'c'), hit('b', 'b')];
  const pages = pageFusion(lexical, vector);
  assert.equal(pages[0].docId, 'a');
  assert.equal(pages[0].lexicalRank, 1);
  assert.equal(pages[0].vectorRank, 1);
  assert.deepEqual(new Set(pages[0].passages.map(h => h.chunk.id)), new Set(['a-lex', 'a-vector']));
  assert.equal(pages.find(p => p.docId === 'b').passages.length, 1, 'same supporting passage is deduplicated');
});

test('repeated passages do not add page votes and rank units disclose the scoring choice', () => {
  const lexical = [hit('a1', 'a'), hit('a2', 'a'), hit('b1', 'b')];
  const vector = [hit('b2', 'b'), hit('a3', 'a')];
  const passage = pageFusion(lexical, vector);
  const page = pageFusion(lexical, vector, { rankUnit: 'page' });
  assert.equal(passage.find(p => p.docId === 'b').lexicalRank, 3);
  assert.equal(page.find(p => p.docId === 'b').lexicalRank, 2);
  assert.equal(passage.find(p => p.docId === 'a').score, 1 / 61 + 1 / 62);
  assert.equal(passage.find(p => p.docId === 'a').passages.length, 3);
});

test('page fusion keeps publications separate, limits results and excludes zero-weight lists', () => {
  const lexical = [hit('one', 'same', 'one'), hit('two', 'same', 'two')];
  assert.equal(pageFusion(lexical, []).length, 2);
  assert.equal(pageFusion(lexical, [], { limit: 1 }).length, 1);
  assert.deepEqual(pageFusion(lexical, [hit('third', 'third')], { lexicalWeight: 0 }).map(p => p.docId), ['third']);
  for (const options of [{ rankUnit: 'unknown' }, { vectorWeight: NaN }, { k: -1 }, { limit: 0 }, { lexicalWeight: 0, vectorWeight: 0 }]) assert.throws(() => pageFusion(lexical, [], options));
});
