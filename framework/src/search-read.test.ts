import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { queryBuiltSite } from './search-query.js';

test('search supplies one executable read instruction and falls back on ambiguity or broad requests', async t => {
  const site = await mkdtemp(path.join(tmpdir(), 'shoalrun-search-read-'));
  t.after(() => rm(site, { recursive: true, force: true }));
  const section = (id: string, title: string) => ({ id, title, standalone: true, markdownUrl: `/docs/v2/search.sections/${id}.md`, markdownBytes: 1200, markdownTokens: 300 });
  const doc = { id: 'guide.search', url: '/docs/v2/search', markdownUrl: '/docs/v2/search.md', title: 'Search', summary: 'Configure providers.', type: 'reference', variant: 'production|v2|fr', text: 'Configure custom providers and credentials.', headings: [{ id: 'custom', title: 'Custom provider' }, { id: 'credentials', title: 'Credentials' }], markdownBytes: 16000, markdownTokens: 4000, markdownTokenEncoding: 'cl100k_base', sections: [section('custom', 'Custom provider'), section('credentials', 'Credentials')] };
  const save = async (record: object) => writeFile(path.join(site, 'search-index.json'), JSON.stringify({ schemaVersion: 1, documents: [record] }));
  await save(doc);
  for (const query of ['custom provider', 'How do I use a custom search provider?']) {
    const hits = await queryBuiltSite(site, query);
    const hit = hits.results[0];
    assert.equal(hit.read.tool, 'get_section');
    assert.deepEqual(hit.read.arguments, { id: doc.id, section: 'custom', channel: 'production', version: 'v2', language: 'fr', maxTokens: 4096 });
    assert.equal(hit.markdownUrl, doc.sections[0].markdownUrl);
    assert.equal(hit.pageMarkdownUrl, doc.markdownUrl);
    assert.equal(hit.markdownTokens, 300);
  }
  for (const query of ['How do I configure search?', 'search', 'custom credentials']) {
    const hit = (await queryBuiltSite(site, query)).results[0];
    assert.equal(hit.read.tool, 'get_page');
    assert.equal(hit.markdownUrl, doc.markdownUrl);
    assert.ok(!('section' in hit.read.arguments));
  }
  await save({ ...doc, sections: [...doc.sections, section('custom-2', 'Custom provider')] });
  assert.equal((await queryBuiltSite(site, 'custom provider')).results[0].read.tool, 'get_page');
  for (const standalone of [undefined, false, 'true']) {
    await save({ ...doc, sections: doc.sections.map(item => ({ ...item, standalone })) });
    const fallback = (await queryBuiltSite(site, 'custom provider')).results[0];
    assert.equal(fallback.read.tool, 'get_page', 'only an explicit boolean author declaration permits a section read');
    assert.equal(fallback.markdownUrl, doc.markdownUrl);
    assert.equal(fallback.markdownTokens, doc.markdownTokens);
  }
  await save({ ...doc, sections: [doc.sections[0], { ...section('custom-2', 'Custom provider'), standalone: false }] });
  assert.equal((await queryBuiltSite(site, 'custom provider')).results[0].read.tool, 'get_page', 'an unapproved matching heading still makes the query ambiguous');
  await save({ ...doc, sections: undefined });
  assert.equal((await queryBuiltSite(site, 'custom provider')).results[0].read.tool, 'get_page', 'older indexes remain readable');
  await writeFile(path.join(site, 'search-index.json'), JSON.stringify({ schemaVersion: 1, documents: [
    { ...doc, id: 'proof', title: 'Agent-friendly documentation', text: 'Try the page controls.', headings: [{ id: 'try', title: 'Try the page controls' }], sections: [section('try', 'Try the page controls')] },
    { ...doc, id: 'theme', title: 'Try a theme', summary: 'Use the page controls.', text: 'Try the page controls.', sections: [] },
  ] }));
  const exact = (await queryBuiltSite(site, 'Try the page controls', { limit: 1 })).results[0];
  assert.equal(exact.id, 'proof', 'a complete section title beats incidental page-title words');
  assert.equal(exact.read.tool, 'get_section');
});
