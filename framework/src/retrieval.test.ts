import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Chunk } from './index-build.js';
import { Retriever, tokenize } from './retrieval.js';

const chunk = (id: string, text: string, headingPath: string[] = [], variant = 'production|current|en', title = 'Guide'): Chunk => ({ id, docId: id.split('#')[0], title, type: 'guide', variant, headingPath, url: `/${id}`, markdownUrl: `/${id}.md`, text, digest: id });

test('tokenize keeps identifiers whole, indexes their parts, and folds plain plurals only', () => {
  assert.deepEqual(tokenize('docs.config.yaml'), ['docs.config.yaml', 'doc', 'config', 'yaml']);
  assert.deepEqual(tokenize('$include'), ['$include', 'include']);
  assert.deepEqual(tokenize('/publish/audit'), ['publish/audit', 'publish', 'audit']);
  for (const [word, folded] of [['pages', 'page'], ['classes', 'class'], ['class', 'class'], ['status', 'status'], ['statuses', 'status'], ['queries', 'query'], ['boxes', 'box'], ['access', 'access'], ['has', 'has']]) assert.deepEqual(tokenize(word), [folded], word);
  assert.deepEqual(tokenize('  ...  '), []);
});

test('lexical search weights headings above body text and keeps exact identifiers findable', () => {
  const retriever = new Retriever({ schemaVersion: 1, sourceDigest: 'x', chunks: [
    chunk('a#body', 'The audit command checks the project. It runs tests.'),
    chunk('b#heading', 'Run it before you publish.', ['Audit a project']),
    chunk('c#config', 'Set outputs.html.search to none to remove the box.'),
    chunk('d#other', 'Nothing relevant here at all.')
  ] });
  assert.equal(retriever.lexical('audit')[0].chunk.id, 'b#heading');
  assert.equal(retriever.lexical('outputs.html.search')[0].chunk.id, 'c#config');
  assert.deepEqual(retriever.lexical('zzzz qqqq'), []);
  assert.deepEqual(retriever.lexical('   '), []);
  assert.equal(retriever.lexical('audit', { limit: 1 }).length, 1);
});

test('search stays inside one publication and refuses an ambiguous or unknown one', () => {
  const retriever = new Retriever({ schemaVersion: 1, sourceDigest: 'x', chunks: [
    chunk('a#one', 'The sandbox base URL is different.', [], 'sandbox|current|en'),
    chunk('b#one', 'The production base URL is different.', [], 'production|current|en')
  ] });
  assert.deepEqual(retriever.variants(), ['production|current|en', 'sandbox|current|en']);
  assert.throws(() => retriever.lexical('base url'), /multiple publications/);
  assert.deepEqual(retriever.lexical('base url', { variant: 'sandbox|current|en' }).map(hit => hit.chunk.id), ['a#one']);
  assert.throws(() => retriever.lexical('base url', { variant: 'production|v2|en' }), /No indexed passages/);
});

test('an empty index and an invalid file are handled', () => {
  assert.deepEqual(new Retriever({ schemaVersion: 1, sourceDigest: 'x', chunks: [] }).variants(), []);
  assert.throws(() => new Retriever({ schemaVersion: 2 } as never), /invalid chunks\.json/);
});


test('page introductions obey publication and passage reader filters', () => {
  const staff = { ...chunk('same#staff', 'Staff context'), readerFilters: { audience: ['staff'] } };
  const publicIntro = chunk('same#public', 'Public context');
  const sandbox = chunk('same#sandbox', 'Sandbox context', [], 'sandbox|current|en');
  const search = new Retriever({ schemaVersion: 1, sourceDigest: 'x', chunks: [staff, publicIntro, sandbox] });
  assert.throws(() => search.pageIntroduction('same'), /multiple publications/);
  assert.equal(search.pageIntroduction('same', { variant: 'production|current|en', readerSelection: { audience: ['customers'] } })?.id, 'same#public');
  assert.equal(search.pageIntroduction('same', { variant: 'production|current|en', readerSelection: { audience: ['staff'] } })?.id, 'same#staff');
  assert.equal(search.pageIntroduction('same', { variant: 'sandbox|current|en' })?.id, 'same#sandbox');
  assert.equal(search.pageIntroduction('missing', { variant: 'production|current|en' }), undefined);
});
