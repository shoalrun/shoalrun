import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, symlink, writeFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { DocumentationError, documentationFailure, documentationTokens, getDocumentationPage, getDocumentationOutline, searchDocumentation } from './documentation-core.js';

async function fixture(t: { after: (fn: () => Promise<unknown>) => unknown }) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-docs-core-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const doc = { id: 'guide.search', title: 'Configure search', summary: 'Select a search provider.', type: 'reference', url: '/search', markdownUrl: '/search.md', variant: { channel: 'production', version: 'v1', language: 'en' } };
  await writeFile(path.join(directory, 'documents.json'), JSON.stringify({ schemaVersion: 1, documents: [doc] }));
  await writeFile(path.join(directory, 'search-index.json'), JSON.stringify({ schemaVersion: 1, documents: Array.from({ length: 5 }, (_, i) => ({ ...doc, id: `guide.search${i}`, variant: 'production|v1|en', text: 'Select the custom search provider. '.repeat(80), headings: [] })) }));
  const content = '# Configure search\n\n' + 'Read the provider contract. 🌊 多语言内容\n'.repeat(600);
  await writeFile(path.join(directory, 'search.md'), content);
  return { directory, doc, content };
}

test('documentation token budgets include JSON metadata and truncate page content and search results', async t => {
  const { directory, content } = await fixture(t);
  for (const maxTokens of [256, 512, 4096]) {
    const page = await getDocumentationPage(directory, 'guide.search', { maxTokens });
    assert.ok(page.budget.truncated);
    assert.ok(content.startsWith(page.content));
    assert.ok(page.content.length > 0);
    assert.ok(documentationTokens(JSON.stringify(page)) <= maxTokens);
    assert.ok(documentationTokens(JSON.stringify(page)) <= page.budget.tokens);
    assert.equal(page.publication.version, 'v1');
    const search = await searchDocumentation(directory, 'search provider', { maxTokens });
    assert.equal(search.total, 5);
    assert.ok(documentationTokens(JSON.stringify(search)) <= maxTokens);
    assert.equal(search.budget.truncated, search.results.length < search.total);
  }
  const full = await getDocumentationPage(directory, 'guide.search', { maxTokens: 100_000 });
  assert.equal(full.content, content);
  assert.equal(full.budget.truncated, false);
  assert.equal((await searchDocumentation(directory, 'unfindableword')).results.length, 0);
});

test('documentation errors distinguish invalid requests, unknown IDs, missing indexes, and corrupt builds', async t => {
  const { directory, doc } = await fixture(t);
  const code = (expected: string) => (error: unknown) => error instanceof DocumentationError && error.code === expected;
  await assert.rejects(getDocumentationPage(directory, 'missing'), code('unknown_page'));
  await assert.rejects(searchDocumentation(directory, ' '), code('invalid_input'));
  await assert.rejects(getDocumentationPage(directory, 'guide.search', { maxTokens: 255 }), code('invalid_input'));
  await assert.rejects(searchDocumentation(directory, 'search', { version: 'missing' }), code('invalid_input'));
  await writeFile(path.join(directory, 'documents.json'), JSON.stringify({ schemaVersion: 1, documents: [doc, { ...doc, variant: { ...doc.variant, version: 'v2' } }] }));
  await assert.rejects(getDocumentationPage(directory, doc.id), code('invalid_input'));
  assert.equal((await getDocumentationPage(directory, doc.id, { version: 'v2' })).publication.version, 'v2');
  await rm(path.join(directory, 'search-index.json'));
  await assert.rejects(searchDocumentation(directory, 'search'), code('missing_index'));
  await writeFile(path.join(directory, 'documents.json'), '{bad');
  await assert.rejects(getDocumentationPage(directory, doc.id), code('internal_error'));
  assert.equal(documentationFailure(new Error('private detail')).error.message.includes('private detail'), false);
});

test('page reads reject manifest traversal and symlinks outside the built site', async t => {
  const { directory, doc } = await fixture(t);
  const outside = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-docs-outside-'));
  t.after(() => rm(outside, { recursive: true, force: true }));
  await writeFile(path.join(outside, 'private.md'), 'private data');
  await mkdir(path.join(directory, 'links'));
  await symlink(path.join(outside, 'private.md'), path.join(directory, 'links/private.md'));
  for (const markdownUrl of ['/links/private.md', `/../${path.basename(outside)}/private.md`, `/%2e%2e/${path.basename(outside)}/private.md`]) {
    await writeFile(path.join(directory, 'documents.json'), JSON.stringify({ schemaVersion: 1, documents: [{ ...doc, markdownUrl }] }));
    await assert.rejects(getDocumentationPage(directory, doc.id), (error: unknown) => error instanceof DocumentationError && error.code === 'internal_error');
  }
});

test('CLI supports site selection, bounded JSON reads, and structured failures without swallowing option errors', async t => {
  const { directory } = await fixture(t);
  const cli = path.join(path.dirname(fileURLToPath(import.meta.url)), 'cli.js');
  const run = (...args: string[]) => spawnSync(process.execPath, [cli, 'docs', ...args], { encoding: 'utf8' });
  const page = run('read', 'guide.search', '--site', directory, '--max-tokens', '256', '--json');
  assert.equal(page.status, 0, page.stderr);
  assert.equal(JSON.parse(page.stdout).budget.truncated, true);
  const search = run('search', 'search provider', '--site', directory, '--limit', '1');
  assert.equal(search.status, 0, search.stderr);
  assert.equal(JSON.parse(search.stdout).results.length, 1);
  for (const args of [['read', 'missing', '--json'], ['search', 'search', '--bogus'], ['read', 'guide.search', '--max-tokens', 'wat', '--json'], ['read', 'guide.search', '--limit', '2', '--json']]) {
    const result = run(...args, '--site', directory);
    assert.equal(result.status, 1);
    assert.ok(['unknown_page', 'invalid_input'].includes(JSON.parse(result.stdout).error.code));
  }
  const markdown = run('read', 'guide.search', '--site', directory, '--max-tokens', '256');
  assert.match(markdown.stdout, /# Configure search/);
  assert.match(markdown.stderr, /truncated/);
  assert.equal(await readFile(path.join(directory, 'search.md'), 'utf8').then(text => text.startsWith(markdown.stdout)), true);
});


test('outline budget errors supply a retry budget that returns the complete outline', async t => {
  const { directory, doc } = await fixture(t);
  const sections = Array.from({ length: 24 }, (_, index) => ({ id: `section-${index}`, title: `Configuration field ${index}`, markdownUrl: `/search.sections/section-${index}.md`, digest: 'a'.repeat(64), markdownBytes: 300, markdownTokens: 80 }));
  await writeFile(path.join(directory, 'documents.json'), JSON.stringify({ schemaVersion: 1, documents: [{ ...doc, digest: 'b'.repeat(64), sections }] }));
  let retry = 0;
  await assert.rejects(getDocumentationOutline(directory, doc.id, { maxTokens: 256 }), error => {
    assert.ok(error instanceof DocumentationError);
    assert.equal(error.code, 'invalid_input');
    const match = error.message.match(/Retry get_outline with maxTokens=(\d+)/);
    assert.ok(match, 'the error tells the client exactly how to retry');
    retry = Number(match[1]);
    return true;
  });
  const outline = await getDocumentationOutline(directory, doc.id, { maxTokens: retry });
  assert.equal(outline.sections.length, sections.length);
  assert.equal(outline.budget.truncated, false);
  assert.ok(outline.budget.tokens <= retry);
});
