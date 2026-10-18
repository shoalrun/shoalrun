import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { queryBuiltSite } from './search-query.js';

test('browser and CLI prefer all terms, then rank partial results by coverage without widening publication or reader visibility', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-search-fallback-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const page = (id: string, title: string, text: string, extra = {}) => ({ id, title, text, summary: '', url: `/${id}`, markdownUrl: `/${id}.md`, variant: 'production|current|en', type: 'reference', headings: [], ...extra });
  const index = { schemaVersion: 1, documents: [page('snippets', 'Reuse warnings', 'Share a warning across pages.'), page('warning', 'Warning', 'One warning.'), page('filler', 'How do I?', 'How can I help you with the thing?'), page('other', 'Other publication', 'Reuse warnings across pages.', { variant: 'sandbox|current|en' }), page('hidden', 'Hidden', 'secretcode', { readerFilters: { audience: ['developer'] } })] };
  await writeFile(path.join(directory, 'search-index.json'), JSON.stringify(index));
  const sentence = 'How can I reuse warnings across pages?';
  const cli = await queryBuiltSite(directory, sentence, { channel: 'production' });
  assert.equal(cli.matchMode, 'partial');
  assert.equal(cli.results[0].id, 'snippets');
  assert.ok(!cli.results.some(hit => hit.id === 'filler'));
  const exact = await queryBuiltSite(directory, 'reuse warnings', { channel: 'production' });
  assert.equal(exact.matchMode, 'all');
  assert.deepEqual(exact.results.map(hit => hit.id), ['snippets']);
  assert.equal((await queryBuiltSite(directory, 'unfindableword', { channel: 'production' })).total, 0);
  const original = globalThis.fetch;
  globalThis.fetch = (async () => Response.json(index)) as typeof fetch;
  t.after(() => { globalThis.fetch = original; });
  const provider = await import(`${pathToFileURL(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../assets/search-lexical.js')).href}?fallback-test`);
  const context = { variant: 'production|current|en', indexUrl: '/search-index.json', limit: 8 };
  assert.equal((await provider.search(sentence, context))[0].url, '/snippets');
  assert.deepEqual((await provider.search('reuse warnings', context)).map((hit: any) => hit.url), ['/snippets']);
  assert.deepEqual(await provider.search('secretcode missingword', { ...context, readerSelection: { audience: ['ui'] } }), []);
});


test('CLI admits stronger near-complete matches without promoting sparse or filler-only matches', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-search-near-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const page = (id: string, title: string, text: string, extra = {}) => ({ id, title, text, summary: '', url: `/${id}`, markdownUrl: `/${id}.md`, variant: 'production|current|en', type: 'reference', headings: [], ...extra });
  const complete = page('overview', 'Overview', 'Rotate service credentials safely.');
  const focused = page('credentials', 'Service credentials', 'Manage credentials safely.');
  const documents = [complete, focused, page('sparse', 'Rotate', ''), page('filler', 'How can I', 'Rotate service credentials safely.'), page('other', 'Rotate service credentials safely', '', { variant: 'sandbox|current|en' })];
  const save = (docs: object[]) => writeFile(path.join(directory, 'search-index.json'), JSON.stringify({ schemaVersion: 1, documents: docs }));
  await save(documents);
  const result = await queryBuiltSite(directory, 'rotate service credentials safely', { channel: 'production' });
  assert.equal(result.matchMode, 'mixed');
  assert.equal(result.results[0].id, 'credentials');
  assert.ok(result.results.some(hit => hit.id === 'overview'), 'complete matches remain available');
  assert.ok(!result.results.some(hit => ['sparse', 'other'].includes(hit.id)));
  assert.equal(result.results[0].read.tool, 'get_page');
  assert.ok(!('contentScore' in result.results[0]));
  await save([{ ...complete, headings: [{ id: 'rotate', title: 'Rotate' }] }, focused]);
  assert.equal((await queryBuiltSite(directory, 'rotate service credentials safely')).results[0].id, 'overview', 'a complete match with relevant heading text retains preference');
  await save([complete, focused]);
  assert.equal((await queryBuiltSite(directory, 'rotate service')).matchMode, 'all', 'two-term queries keep complete-match preference');
  assert.equal((await queryBuiltSite(directory, 'rotate service credentials safely tomorrow')).results[0].id, 'credentials', 'partial fallback compares field relevance within one content term of best coverage');
  await save([complete, page('filler', 'How can I', 'Service credentials safely.')]);
  assert.equal((await queryBuiltSite(directory, 'How can I rotate service credentials safely')).results[0].id, 'overview', 'filler score alone cannot displace complete content coverage');
  await save([page('overview', 'How can I', complete.text), focused]);
  assert.equal((await queryBuiltSite(directory, 'How can I rotate service credentials safely')).results[0].id, 'credentials', 'filler title wording cannot prevent stronger content matches');
  await save([complete, page('tie', 'Elsewhere', 'Service credentials safely.')]);
  assert.equal((await queryBuiltSite(directory, 'rotate service credentials safely')).matchMode, 'all');
});


test('CLI recognizes simple query plurals in subject titles without broadening body or heading matches', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-search-title-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const page = (id: string, title: string, text = '', headings: Array<{ id: string; title: string }> = []) => ({ id, title, text, summary: '', url: `/${id}`, markdownUrl: `/${id}.md`, variant: 'production|current|en', type: 'reference', headings });
  await writeFile(path.join(directory, 'search-index.json'), JSON.stringify({ schemaVersion: 1, documents: [
    page('worker', 'Worker queues'), page('body', 'Background', 'worker'), page('heading', 'Overview', '', [{ id: 'worker', title: 'Worker' }]),
    page('status', 'Status'), page('class', 'Class'), page('analysis', 'Analysis'), page('gas', 'Gas'),
  ] }));
  assert.deepEqual((await queryBuiltSite(directory, 'workers')).results.map(hit => hit.id), ['worker']);
  assert.deepEqual((await queryBuiltSite(directory, 'worker')).results.map(hit => hit.id).sort(), ['body', 'heading', 'worker']);
  for (const word of ['status', 'class', 'analysis', 'gas']) assert.equal((await queryBuiltSite(directory, word)).results[0].id, word);
  for (const word of ['statu', 'clas', 'analysi', 'ga']) {
    // Existing singular-query matching can add an -s; this correction must not
    // strip these endings from a plural query and match an unrelated shorter title.
    await writeFile(path.join(directory, 'search-index.json'), JSON.stringify({ schemaVersion: 1, documents: [page('short', word)] }));
    assert.equal((await queryBuiltSite(directory, `${word}s`)).total, 0);
  }
});


test('partial fallback prioritizes focused subjects only within the coverage band', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-search-partial-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const page = (id: string, title: string, text: string, variant = 'production|current|en') => ({ id, title, text, summary: '', url: `/${id}`, markdownUrl: `/${id}.md`, variant, type: 'reference', headings: [] });
  const records = [
    page('incidental', 'Overview', 'set up queue worker token'),
    page('subject', 'Queue worker', 'check token'),
    page('sparse', 'Set up queue', ''),
    page('filler', 'How can I', 'set up queue worker token'),
    page('other', 'Set up queue worker check token limits', '', 'sandbox|current|en'),
  ];
  await writeFile(path.join(directory, 'search-index.json'), JSON.stringify({ schemaVersion: 1, documents: records }));
  const result = await queryBuiltSite(directory, 'How can I set up queue worker check token limits', { channel: 'production' });
  assert.equal(result.matchMode, 'partial');
  assert.equal(result.results[0].id, 'subject', 'four focused terms beat five incidental terms');
  assert.ok(result.results.findIndex(hit => hit.id === 'sparse') > result.results.findIndex(hit => hit.id === 'incidental'), 'three title terms cannot displace five-term coverage');
  assert.ok(!result.results.some(hit => hit.id === 'other'));
  assert.equal(result.results[0].read.tool, 'get_page');
  const tied = [page('b', 'Same subject', 'queue worker'), page('a', 'Same subject', 'queue worker')];
  await writeFile(path.join(directory, 'search-index.json'), JSON.stringify({ schemaVersion: 1, documents: tied }));
  assert.deepEqual((await queryBuiltSite(directory, 'queue worker missing')).results.map(hit => hit.id), ['a', 'b'], 'ties keep stable ID ordering');
  await writeFile(path.join(directory, 'search-index.json'), JSON.stringify({ schemaVersion: 1, documents: [page('one', 'Queue', ''), page('two', 'Background', 'queue worker')] }));
  assert.equal((await queryBuiltSite(directory, 'queue worker missing')).results[0].id, 'two', 'single-term title matches stay below two-term coverage');
});
