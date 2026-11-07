import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTermIndex, searchTerms, type TermDocument, type TermField } from './search-terms.js';
import { compileSearchTerms } from './search-terms-build.js';
const document = (id: string, extra: Partial<TermDocument> = {}): TermDocument => ({ id, title: id, summary: '', url: `/${id}`, markdownUrl: `/${id}.md`, type: 'reference', variant: 'production|current|en', headings: [], ...extra });
const variant = 'production|current|en';

test('precompiled postings cover late prose and preserve phrase positions and literal identifiers', () => {
  const docs = [document('guide'), document('distractor')];
  const fields: TermField[] = [
    { document: 0, kind: 3, text: 'padding '.repeat(2000) + 'Rotate service credentials. ForFeature docs.config.yaml --profile.' },
    { document: 1, kind: 3, text: 'credentials service rotate. ForFeatureExtra docs.config.yamlExtra --profileExtra.' }
  ];
  const index = buildTermIndex(docs, fields, [['rotate service', 'credential rotation']]);
  for (const query of ['ForFeature', 'docs.config.yaml', '--profile', 'credential rotation']) assert.deepEqual(searchTerms(index, query, { variant }).results.map(hit => hit.document.id), ['guide']);
  assert.ok(!JSON.stringify(index).includes('padding padding'), 'article prose is not stored');
  assert.equal(searchTerms(index, 'unfindablexyz', { variant }).total, 0);
});

test('term matches and phrase evidence never cross reader scopes, field boundaries, or publications', () => {
  const docs = [document('visible'), document('hidden', { readerFilters: { audience: ['internal'] } }), document('other', { variant: 'production|current|en|payments' })];
  const index = buildTermIndex(docs, [
    { document: 0, kind: 3, filters: { audience: ['customer'] }, text: 'sharedword blue' },
    { document: 0, kind: 3, filters: { audience: ['internal'] }, text: 'secretword moon' },
    { document: 1, kind: 0, text: 'secretword blue moon' },
    { document: 2, kind: 0, text: 'secretword blue moon' }
  ], [['blue moon', 'pairphrase']]);
  const options = { variant, readerSelection: { audience: ['customer'] } };
  assert.equal(searchTerms(index, 'secretword', options).total, 0);
  assert.equal(searchTerms(index, 'pairphrase', options).total, 0);
  assert.equal(searchTerms(index, 'pairphrase', { variant }).total, 1, 'only the hidden page has a real adjacent phrase');
  assert.deepEqual(searchTerms(index, 'sharedword', options).results.map(hit => hit.document.id), ['visible']);
  assert.equal(searchTerms(index, 'sharedword', { variant: 'production|current|en|reporting' }).total, 0);
});

test('HTML compilation omits scripts and Markdown-only content, and never labels shared prose with a hidden heading', () => {
  const docs = [document('guide', { headings: [{ id: 'shared', title: 'Shared' }, { id: 'internal', title: 'Internal secret heading' }] })];
  const html = '<article><h2 id="shared">Shared</h2><p>Public &lt;ForFeature&gt;.</p><section data-reader-filters="{&quot;audience&quot;:[&quot;internal&quot;]}"><h2 id="internal">Internal secret heading</h2><p>hiddenneedle</p></section><p>publicneedle</p><script>executableneedle</script></article>';
  const index = compileSearchTerms([{ doc: { frontmatter: { id: 'guide' }, variant: { channel: 'production', version: 'current', language: 'en' } } as any, html }], docs, []);
  const options = { variant, readerSelection: { audience: ['customer'] } };
  assert.equal(searchTerms(index, 'hiddenneedle', options).total, 0);
  assert.equal(searchTerms(index, 'executableneedle', { variant }).total, 0);
  assert.equal(searchTerms(index, 'ForFeature', options).total, 1);
  assert.equal(searchTerms(index, 'publicneedle', options).results[0].section?.id, 'shared');
});

test('changelog preference is soft, explicit history retains matching release notes, and selection happens before scoring', () => {
  const docs = [document('guide', { title: 'Customer editions', type: 'how-to' }), document('change', { title: 'Customer editions release notes', type: 'changelog-entry' })];
  const index = buildTermIndex(docs, docs.map((doc, document) => ({ document, kind: 0, text: doc.title })));
  assert.equal(searchTerms(index, 'customer editions', { variant }).results[0].document.id, 'guide');
  assert.equal(searchTerms(index, 'customer editions release notes', { variant }).results[0].document.id, 'change');
  assert.throws(() => searchTerms(index, 'customer', { variant, limit: 0 }), /limit/);
  assert.throws(() => searchTerms(index, 'customer', { variant, limit: 101 }), /limit/);
});

test('nested reader scopes AND their predicates, including several selected choices', () => {
  const docs = [document('guide')];
  const index = buildTermIndex(docs, [{ document: 0, kind: 3, text: 'nestedneedle', filters: [{ audience: ['internal'] }, { audience: ['customer'] }] }]);
  assert.equal(searchTerms(index, 'nestedneedle', { variant, readerSelection: { audience: ['customer'] } }).total, 0);
  assert.equal(searchTerms(index, 'nestedneedle', { variant, readerSelection: { audience: ['internal'] } }).total, 0);
  assert.equal(searchTerms(index, 'nestedneedle', { variant, readerSelection: { audience: ['customer', 'internal'] } }).total, 1);
});

test('bounded spelling recovery is explicit, skips identifiers, and cannot reveal hidden vocabulary', () => {
  const docs = [document('python'), document('hidden', { readerFilters: { audience: ['internal'] } })];
  const index = buildTermIndex(docs, [{ document: 0, kind: 0, text: 'Python references' }, { document: 1, kind: 0, text: 'Hiddenneedle' }]);
  const found = searchTerms(index, 'pyhton references', { variant });
  assert.equal(found.results[0].document.id, 'python');
  assert.match(found.correction!, /pyhton → python/);
  const hidden = searchTerms(index, 'hiddenneedl', { variant, readerSelection: { audience: ['customer'] } });
  assert.equal(hidden.total, 0); assert.equal(hidden.correction, undefined);
  for (const query of ['pyhton.method', '--pyhton', 'Pyhton', '"pyhton"']) assert.equal(searchTerms(index, query, { variant }).correction, undefined);
  assert.equal(searchTerms(index, '__proto__', { variant }).total, 0);
});

test('exact titles land on the page, and focused near-complete matches can beat incidental full-body matches', () => {
  const docs = [document('guide', { title: 'Customer editions', headings: [{ id: 'notes', title: 'Notes' }] }), document('incidental')];
  const index = buildTermIndex(docs, [
    { document: 0, kind: 0, text: 'Customer editions' },
    { document: 0, kind: 3, section: 0, text: 'Shared docs.' },
    { document: 1, kind: 3, text: 'customer facing docs' }
  ]);
  assert.equal(searchTerms(index, 'customer editions', { variant }).results[0].section, undefined);
  assert.equal(searchTerms(index, 'customer facing docs', { variant }).results[0].document.id, 'guide');
  assert.equal(searchTerms(index, 'customer facing docs', { variant }).matchMode, 'mixed');
});

test('real build-time facet omission removes terms from the decoded public index in separate builds', async t => {
  const { mkdtemp, mkdir, writeFile, readFile, rm } = await import('node:fs/promises');
  const path = await import('node:path'); const os = await import('node:os');
  const { compile } = await import('./compiler.js');
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-terms-facets-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(path.join(directory, 'content'));
  await writeFile(path.join(directory, 'content/guide.mdx'), '---\nid: guide\ntitle: Shared guide\nsummary: Shared instructions.\ntype: reference\nslug: /guide\nchannel: production\nversion: current\nlanguage: en\naccess: { policy: public }\nreaderFilters: { audience: [customer, internal] }\n---\nPublicmarkerq.\n\n<ForFacet audience="internal">\n\n## Internal section\n\nFacetsecretmarkerq.\n\n</ForFacet>\n');
  const config = { schemaVersion: 1, site: { title: 'Scoped terms' }, publications: { defaults: { channel: 'production', version: 'current', language: 'en' }, channels: { production: {} }, versions: { current: {} }, enabled: [{ channel: 'production', version: 'current', language: 'en' }] }, readerFilters: { facets: { audience: { label: 'Audience', options: { customer: 'Customer', internal: 'Internal' } } } }, outputs: { html: { highlighting: { provider: 'none' } } } };
  for (const audience of ['internal', 'customer']) {
    const file = path.join(directory, 'config.json');
    await writeFile(file, JSON.stringify({ ...config, site: { ...config.site, contentFilter: { audience: [audience] } } }));
    const output = path.join(directory, audience);
    await compile(file, output);
    const index = JSON.parse(await readFile(path.join(output, 'search-terms.json'), 'utf8'));
    assert.equal(searchTerms(index, 'publicmarkerq', { variant }).total, 1);
    assert.equal(searchTerms(index, 'facetsecretmarkerq', { variant }).total, audience === 'internal' ? 1 : 0);
    assert.equal(Object.hasOwn(index.terms, 'facetsecretmarkerq'), audience === 'internal');
  }
});

test('literal CamelCase and qualified identifiers do not collapse singular and plural symbol names', () => {
  const docs = [document('singular', { title: 'getCredential' }), document('plural', { title: 'getCredentials', headings: [{ id: 'method', title: 'sdk.Client.getCredentials' }] })];
  const index = buildTermIndex(docs, [{ document: 0, kind: 0, text: 'getCredential' }, { document: 1, kind: 0, text: 'getCredentials' }, { document: 1, kind: 2, section: 0, text: 'sdk.Client.getCredentials' }]);
  assert.deepEqual(searchTerms(index, 'getCredentials', { variant }).results.map(hit => hit.document.id), ['plural']);
  assert.deepEqual(searchTerms(index, 'getCredential', { variant }).results.map(hit => hit.document.id), ['singular']);
  assert.deepEqual(searchTerms(index, 'sdk.Client.getCredentials', { variant }).results.map(hit => hit.document.id), ['plural']);
});

test('precompiled CLI reads keep the full page when query evidence spans standalone sections', async t => {
  const { mkdtemp, writeFile, rm } = await import('node:fs/promises'); const path = await import('node:path'); const os = await import('node:os'); const { queryBuiltSite } = await import('./search-query.js');
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-terms-read-')); t.after(() => rm(directory, { recursive: true, force: true }));
  const docs = [document('guide', { title: 'Account maintenance', headings: [{ id: 'rotate', title: 'Rotate' }, { id: 'credentials', title: 'Credentials' }], sections: [{ id: 'rotate', title: 'Rotate', markdownUrl: '/guide.sections/rotate.md', markdownBytes: 100, markdownTokens: 20, standalone: true }, { id: 'credentials', title: 'Credentials', markdownUrl: '/guide.sections/credentials.md', markdownBytes: 100, markdownTokens: 20, standalone: true }] })];
  const index = buildTermIndex(docs, [{ document: 0, kind: 0, text: 'Account maintenance' }, { document: 0, kind: 1, text: 'Timeout guidance' }, { document: 0, kind: 2, section: 0, text: 'Rotate' }, { document: 0, kind: 2, section: 1, text: 'Credentials' }]);
  await writeFile(path.join(directory, 'search-terms.json'), JSON.stringify(index));
  assert.equal((await queryBuiltSite(directory, 'rotate credentials')).results[0].read.tool, 'get_page');
  assert.equal((await queryBuiltSite(directory, 'rotate')).results[0].read.tool, 'get_section');
  const focused = (await queryBuiltSite(directory, 'account rotate')).results[0];
  assert.equal(focused.read.tool, 'get_section');
  assert.equal(focused.read.arguments.section, 'rotate');
  assert.equal((await queryBuiltSite(directory, 'account rotate credentials')).results[0].read.tool, 'get_page');
  assert.equal((await queryBuiltSite(directory, 'account rotate timeout')).results[0].read.tool, 'get_page');
  assert.equal((await queryBuiltSite(directory, 'account maintenance')).results[0].read.tool, 'get_page');
});

test('facet names do not read inherited object properties', () => {
  const docs = [document('guide', { readerFilters: { constructor: ['selected'] } })];
  const index = buildTermIndex(docs, [{ document: 0, kind: 3, text: 'needle' }]);
  assert.equal(searchTerms(index, 'needle', { variant }).total, 1);
  assert.equal(searchTerms(index, 'needle', { variant, readerSelection: { constructor: ['other'] } }).total, 0);
});

test('semantic browser provider resolves indexed symbols and unknown literal flags without an endpoint call', async t => {
  const { pathToFileURL, fileURLToPath } = await import('node:url'); const path = await import('node:path');
  const docs = [document('method', { title: 'getCredentials' })];
  const compiled = buildTermIndex(docs, [{ document: 0, kind: 0, text: 'getCredentials' }]);
  const before = globalThis.fetch; const urls: string[] = [];
  globalThis.fetch = (async url => { urls.push(String(url)); return Response.json(compiled); }) as typeof fetch;
  t.after(() => { globalThis.fetch = before; });
  const provider = await import(`${pathToFileURL(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../assets/search-semantic.js')).href}?literal-inverted-test`);
  const context = { variant, indexUrl: '/literal-test/search-index.json', limit: 8 };
  assert.deepEqual((await provider.search('getCredentials', context)).map((hit: any) => hit.url), ['/method']);
  assert.deepEqual(await provider.search('--nonexistent-quantum-flag', context), []);
  assert.deepEqual(await provider.search('🦩🛸', context), []);
  assert.ok(urls.length); assert.ok(urls.every(url => url.endsWith('search-terms.json')));
});

test('dunder names and trailing underscores remain exact, while natural hyphenation is case-insensitive', () => {
  const docs = [document('dunder', { title: '__init__' }), document('trailing', { title: 'value_' }), document('shared')];
  const index = buildTermIndex(docs, [{ document: 0, kind: 0, text: '__init__' }, { document: 1, kind: 0, text: 'value_' }, { document: 2, kind: 0, text: 'Shared content' }], [['single source', 'shared content']]);
  assert.equal(searchTerms(index, '__init__', { variant }).results[0].document.id, 'dunder');
  assert.equal(searchTerms(index, 'value_', { variant }).results[0].document.id, 'trailing');
  assert.equal(searchTerms(index, 'Single-Source', { variant }).results[0].document.id, 'shared');
});
