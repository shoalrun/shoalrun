import assert from 'node:assert/strict';
import { mkdir, mkdtemp, symlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { buildCards, CardIndex, cardIsCurrent, decodeVector, encodeVector, parseCardQuestions, readCards, rejection, writeCards } from './answer-cards.js';
import type { AskResult } from './ask.js';

const result = (extra: Partial<AskResult> = {}): AskResult => ({ question: 'q', mode: 'hybrid+jev', decision: 'answered', answer: 'List redirects under `redirects` [1].', sources: [{ number: 1, id: 'cfg#redirects', title: 'Config', heading: 'redirects', url: '/config#redirects' }], considered: [{ number: 1, id: 'cfg#redirects', title: 'Config', heading: 'redirects', url: '/config#redirects' }], uncited: false, invalidCitations: [], unsupportedCode: [], verified: true, claims: [], unsupportedClaims: [], notes: [], routing: { answeredBy: 'main/model', failed: [] }, usage: { promptTokens: 1, completionTokens: 1, chatCalls: 1 }, timings: { rewriteMs: 0, retrieveMs: 0, rerankMs: 0, answerMs: 0, verifyMs: 0 }, ...extra });
const unit = (...values: number[]) => { const vector = Float32Array.from(values); const length = Math.hypot(...vector); return vector.map(value => value / length); };
const embedding = { provider: 'stub', model: 'm', space: 'm', dimension: 2 };
const vectorFor = (text: string) => /redirect/i.test(text) ? unit(1, 0.1) : unit(0.1, 1);
const digests = new Map([['cfg#redirects', 'd1']]);

async function built(extra: Partial<Parameters<typeof buildCards>[0]> = {}) {
  return buildCards({ questions: [{ question: 'How do I write redirects?', aliases: ['add a redirect', 'redirect syntax'] }, { question: 'How do I change fonts?' }], ask: async question => question.includes('fonts') ? result({ decision: 'declined', answer: 'The documentation does not cover that.', sources: [], considered: [] }) : result(), embed: async texts => texts.map(vectorFor), digestOf: id => digests.get(id), embedding, variant: 'production|current|en', now: () => new Date('2026-09-27T12:00:00Z'), ...extra });
}

test('vectors survive being written as text', () => {
  const vector = Float32Array.from([0.25, -0.5, 1e-3, 3]);
  assert.deepEqual([...decodeVector(encodeVector(vector))], [...vector]);
});

test('only an answer that passed every check becomes a card, and the rest are reported with a reason', async () => {
  const { file, rejected } = await built();
  assert.deepEqual(file.cards.map(card => [card.id, card.question, card.aliases, card.model, card.generatedAt, Object.keys(card.digests), card.vectors.length]), [['how-do-i-write-redirects', 'How do I write redirects?', ['add a redirect', 'redirect syntax'], 'main/model', '2026-09-27T12:00:00.000Z', ['cfg#redirects'], 3]]);
  assert.deepEqual(rejected, [{ question: 'How do I change fonts?', reason: 'the docs do not cover it' }]);
  const reasons = (extra: Partial<AskResult>) => rejection(result(extra));
  assert.equal(reasons({}), undefined);
  assert.equal(reasons({ decision: 'hedged' }), 'the answer was hedged');
  assert.equal(reasons({ uncited: true }), 'the answer cites nothing');
  assert.equal(reasons({ unsupportedClaims: [{ text: 't', support: 0.1 }] }), '1 unsupported sentence(s)');
  assert.equal(reasons({ unsupportedCode: ['x y'] }), 'code that is not in the docs');
  assert.equal(reasons({ invalidCitations: [9] }), 'an invented citation');
  assert.match(reasons({ notes: ['Jev was unavailable'] }) ?? '', /carried a note: Jev was unavailable/);
  const failing = await built({ ask: async () => { throw new Error('model down'); } });
  assert.deepEqual(failing.rejected.map(item => item.reason), ['asking failed: model down', 'asking failed: model down']);
  assert.equal(failing.file.cards.length, 0);
  const duplicate = await built({ questions: [{ question: 'How do I write redirects?' }, { question: 'how do i write redirects' }, { question: '  ' }] });
  assert.deepEqual(duplicate.rejected.map(item => item.reason), ['a card for this question already exists', 'the question is empty']);
  const unknown = await built({ digestOf: () => undefined });
  assert.equal(unknown.rejected[0].reason, 'a passage behind the answer is unknown');
});

test('a question that means the same as a card is matched, within the same publication and reader view', async () => {
  const { file } = await built();
  const index = new CardIndex(file);
  assert.equal(index.size, 1);
  const scope = { threshold: 0.95, variant: 'production|current|en' };
  assert.equal(index.match(vectorFor('how do i add a redirect'), scope)?.card.id, 'how-do-i-write-redirects');
  assert.ok((index.match(vectorFor('redirect'), scope)?.similarity ?? 0) > 0.99);
  assert.equal(index.match(vectorFor('how do i change fonts'), scope), undefined);
  assert.equal(index.match(vectorFor('redirect'), { ...scope, variant: 'sandbox|current|en' }), undefined);
  assert.equal(index.match(vectorFor('redirect'), { ...scope, readerSelection: { audience: ['authors'] } }), undefined);
  assert.equal(index.match(Float32Array.from([1, 0, 0]), scope), undefined);
  const scoped = new CardIndex((await built({ readerSelection: { audience: ['authors', 'maintainers'] } })).file);
  assert.equal(scoped.match(vectorFor('redirect'), { ...scope, readerSelection: { audience: ['maintainers', 'authors'] } })?.card.id, 'how-do-i-write-redirects');
  assert.equal(scoped.match(vectorFor('redirect'), scope), undefined);
});

test('a card is current only while every passage behind it is unchanged', async () => {
  const { file } = await built();
  const [card] = file.cards;
  assert.equal(cardIsCurrent(card, id => digests.get(id)), true);
  assert.equal(cardIsCurrent(card, () => 'changed'), false);
  assert.equal(cardIsCurrent(card, () => undefined), false);
});

test('cards are written to ai/answers.json and read back, and a symlinked ai directory is refused', async () => {
  const site = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-cards-'));
  assert.equal(await readCards(site), undefined);
  const { file } = await built();
  const target = await writeCards(site, file);
  assert.equal(path.basename(target), 'answers.json');
  assert.deepEqual((await readCards(site))?.cards.map(card => card.id), ['how-do-i-write-redirects']);
  const outside = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-cards-outside-'));
  await mkdir(path.join(outside, 'ai'));
  const linked = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-cards-linked-'));
  await symlink(path.join(outside, 'ai'), path.join(linked, 'ai'));
  await assert.rejects(readCards(linked), /leaves the site directory/);
  await assert.rejects(writeCards(linked, file), /leaves the site directory/);
});

test('a question list is JSON or YAML, as strings or mappings with aliases', () => {
  assert.deepEqual(parseCardQuestions('- how do I write redirects\n- question: how do I deploy\n  aliases: [ship it, go live]\n'), [{ question: 'how do I write redirects' }, { question: 'how do I deploy', aliases: ['ship it', 'go live'] }]);
  assert.deepEqual(parseCardQuestions('questions:\n  - one\n'), [{ question: 'one' }]);
  assert.deepEqual(parseCardQuestions('["a", {"question": "b"}]'), [{ question: 'a' }, { question: 'b' }]);
  assert.throws(() => parseCardQuestions('title: x'), /must be a list/);
  assert.throws(() => parseCardQuestions('- 5'), /Question 1 must be a string or a mapping with a question/);
  assert.throws(() => parseCardQuestions('- question: q\n  aliases: nope'), /Question 1: aliases must be a list of strings/);
});
