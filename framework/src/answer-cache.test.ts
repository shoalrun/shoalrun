import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AnswerCache, cacheable, normalizeQuestion } from './answer-cache.js';
import type { AskResult } from './ask.js';

const result = (extra: Partial<AskResult> = {}): AskResult => ({ question: 'q', mode: 'lexical', decision: 'answered', answer: 'Run it [1].', sources: [{ number: 1, id: 'a#1', title: 'Guide', heading: 'Run', url: '/a#1' }], considered: [{ number: 1, id: 'a#1', title: 'Guide', heading: 'Run', url: '/a#1' }, { number: 2, id: 'b#1', title: 'Guide', heading: 'Other', url: '/b#1' }], uncited: false, invalidCitations: [], unsupportedCode: [], verified: false, claims: [], unsupportedClaims: [], notes: [], usage: { promptTokens: 1, completionTokens: 1, chatCalls: 1 }, timings: { rewriteMs: 0, retrieveMs: 0, rerankMs: 0, answerMs: 0, verifyMs: 0 }, ...extra });
const digests = new Map([['a#1', 'da'], ['b#1', 'db']]);
const digestOf = (id: string) => digests.get(id);

test('questions differ only by case, spacing, and closing punctuation are the same question', () => {
  assert.equal(normalizeQuestion('  How do I   Deploy to Vercel?? '), 'how do i deploy to vercel');
  assert.equal(normalizeQuestion('how do i deploy to vercel.'), 'how do i deploy to vercel');
  assert.notEqual(normalizeQuestion('how do i deploy to vercel'), normalizeQuestion('how do i deploy to netlify'));
  const cache = new AnswerCache();
  assert.equal(cache.key('How do I?', { variant: 'v' }), cache.key('how do i', { variant: 'v' }));
  assert.notEqual(cache.key('how do i', { variant: 'v' }), cache.key('how do i', { variant: 'w' }));
  assert.notEqual(cache.key('how do i', { readerSelection: { audience: ['authors'] } }), cache.key('how do i', { readerSelection: { audience: ['maintainers'] } }));
  assert.equal(cache.key('q', { readerSelection: { audience: ['b', 'a'], persona: ['x'] } }), cache.key('q', { readerSelection: { persona: ['x'], audience: ['a', 'b'] } }));
});

test('only an answer that passed every check is worth reusing', () => {
  assert.equal(cacheable(result()), true);
  assert.equal(cacheable(result({ decision: 'excerpt' })), true);
  const escalation = 'The answer was flagged (unsupported-claim), so z-ai/glm-5.3-flash answered too. Its answer has fewer flags and is shown.';
  assert.equal(cacheable(result({ notes: [escalation] })), true);
  assert.equal(cacheable(result({ notes: [escalation], unsupportedClaims: [{ text: 't', support: 0.2 }] })), false);
  assert.equal(cacheable(result({ notes: [escalation, 'Jev was unavailable'] })), false);
  assert.equal(cacheable(result({ notes: ['The answer was flagged (uncited), so x answered too. Its answer was no cleaner, so the first answer is shown.'] })), false);
  for (const bad of [{ decision: 'hedged' as const }, { decision: 'declined' as const }, { uncited: true }, { invalidCitations: [9] }, { unsupportedCode: ['x y'] }, { unsupportedClaims: [{ text: 't', support: 0.1 }] }, { notes: ['Jev was unavailable'] }]) assert.equal(cacheable(result(bad)), false, JSON.stringify(bad));
});

test('a stored answer is returned until it is old, evicted, or a passage behind it changes', () => {
  let time = 1_000;
  const cache = new AnswerCache({ maxEntries: 2, ttlMs: 10_000, now: () => time });
  const key = cache.key('how do i', {});
  assert.equal(cache.get(key, digestOf), undefined);
  cache.set(key, result(), digestOf);
  assert.equal(cache.get(key, digestOf)?.answer, 'Run it [1].');
  assert.deepEqual({ hits: cache.hits, misses: cache.misses }, { hits: 1, misses: 1 });
  // A passage that was shown to the model but not cited still invalidates the entry when it changes.
  assert.equal(cache.get(key, id => id === 'b#1' ? 'changed' : digestOf(id)), undefined);
  assert.equal(cache.size, 0);
  cache.set(key, result(), digestOf);
  assert.equal(cache.get(key, id => id === 'a#1' ? undefined : digestOf(id)), undefined);
  cache.set(key, result(), digestOf);
  time += 10_001;
  assert.equal(cache.get(key, digestOf), undefined);
  time = 1_000;
  cache.set('one', result(), digestOf);
  cache.set('two', result(), digestOf);
  cache.get('one', digestOf);
  cache.set('three', result(), digestOf);
  assert.deepEqual([cache.get('one', digestOf) !== undefined, cache.get('two', digestOf) !== undefined, cache.get('three', digestOf) !== undefined], [true, false, true]);
  cache.set('unknown', result({ considered: [{ number: 1, id: 'gone#1', title: 'x', heading: '', url: '/x' }] }), digestOf);
  assert.equal(cache.get('unknown', digestOf), undefined);
  cache.set('flagged', result({ uncited: true }), digestOf);
  assert.equal(cache.get('flagged', digestOf), undefined);
});
