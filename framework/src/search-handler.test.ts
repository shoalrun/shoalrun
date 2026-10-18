import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Retriever } from './retrieval.js';
import { createSearchHandler } from './search-handler.js';
import type { ChunkIndex } from './index-build.js';
import type { StoredEmbeddings } from './embeddings.js';
import { prepareSearchPassage } from './search-snippet.js';

const prepared = (index: ChunkIndex): ChunkIndex => ({ ...index, chunks: index.chunks.map(chunk => ({ ...chunk, search: prepareSearchPassage(chunk.text) })) });

const index: ChunkIndex = { schemaVersion: 1, sourceDigest: 'site', chunks: [
  { id: 'a#intro', docId: 'a', title: 'Harbor guide', type: 'guide', variant: 'production|current|en', headingPath: ['Docking'], url: '/harbor#docking', markdownUrl: '/harbor.md', text: 'Tie up the boat here.', digest: 'a', readerFilters: { audience: ['authors'] } },
  { id: 'b#intro', docId: 'b', title: 'Sail guide', type: 'guide', variant: 'production|current|en', headingPath: [], url: '/sail', markdownUrl: '/sail.md', text: 'Raise the sail.', digest: 'b', readerFilters: { audience: ['maintainers'] } }
] };
const embeddings: StoredEmbeddings = { meta: { schemaVersion: 1, provider: 'voyage', model: 'voyage-4-large', space: 'voyage-4', dimension: 2, sourceDigest: 'site', ids: ['a#intro', 'b#intro'], digests: ['a', 'b'] }, vectors: [new Float32Array([1, 0]), new Float32Array([0, 1])] };
const origin = 'http://127.0.0.1:8770';
const request = (body: unknown, from = origin) => new Request(`${origin}/__shoalrun/search`, { method: 'POST', headers: { origin: from, 'content-type': 'application/json' }, body: JSON.stringify(body) });
const filters = { facets: { audience: { label: 'Audience', options: { authors: 'Authors', maintainers: 'Maintainers' } } }, typeDefaults: {}, controls: { sidebar: true } };

test('local search ranks semantic passages and filters by publication and reader view', async () => {
  let calls = 0;
  const handle = createSearchHandler({ retriever: new Retriever(prepared(index), embeddings), hosts: ['127.0.0.1:8770'], readerFilters: filters, pageSummaries: new Map([['production|current|en:a', 'A guide to safe docking.']]), embedQuery: async () => { calls++; return new Float32Array([1, 0]); } });
  const response = await handle(request({ query: 'boat', variant: 'production|current|en', readerSelection: { audience: ['authors'] } }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.mode, 'vector');
  assert.deepEqual(body.results.map((hit: { url: string }) => hit.url), ['/harbor#docking']);
  assert.equal(calls, 1);
  assert.equal((await handle(request({ query: 'boat', variant: 'other' }))).status, 400);
  assert.equal((await handle(request({ query: 'boat', variant: 'production|current|en', readerSelection: { audience: ['unknown'] } }))).status, 400);
  assert.equal((await handle(request({ query: 'boat', variant: 'production|current|en' }, 'https://example.com'))).status, 403);
  assert.equal(calls, 1);
});

test('local search serves lexical results when no embeddings are loaded', async () => {
  const handle = createSearchHandler({ retriever: new Retriever(prepared(index)), hosts: ['127.0.0.1:8770'] });
  const response = await handle(request({ query: 'boat', variant: 'production|current|en' }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.mode, 'lexical');
  assert.equal(body.results[0].url, '/harbor#docking');
});

test('search requires a rebuilt prepared index instead of parsing legacy passages on first use', () => {
  assert.throws(() => createSearchHandler({ retriever: new Retriever(index), hosts: ['127.0.0.1:8770'] }), /run shoalrun index.*embeddings can be reused/);
});

test('search requests use prepared evidence without reading Markdown passage text', async () => {
  const built = prepared(index);
  const retriever = new Retriever(built, embeddings);
  const handle = createSearchHandler({ retriever, hosts: ['127.0.0.1:8770'], embedQuery: async () => new Float32Array([1, 0]) });
  for (const chunk of built.chunks) Object.defineProperty(chunk, 'text', { get() { throw new Error('Request tried to parse Markdown'); } });
  const body = await (await handle(request({ query: 'boat', variant: 'production|current|en' }))).json();
  assert.equal(body.mode, 'vector');
  assert.equal(body.results[0].summary, 'Tie up the boat here.');
});

test('local search returns a validation response for non-object JSON', async () => {
  const handle = createSearchHandler({ retriever: new Retriever(prepared(index)), hosts: ['127.0.0.1:8770'] });
  for (const value of [null, [], 'boat', 7, true]) {
    const response = await handle(request(value));
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: 'Invalid search request.' });
  }
});

test('embedding failures preserve lexical results and reader filters', async () => {
  const handle = createSearchHandler({
    retriever: new Retriever(prepared(index), embeddings), hosts: ['127.0.0.1:8770'], readerFilters: filters,
    embedQuery: async () => { throw new Error('provider unavailable'); }
  });
  for (const audience of ['authors', 'maintainers']) {
    const response = await handle(request({ query: 'boat', variant: 'production|current|en', readerSelection: { audience: [audience] } }));
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.mode, 'lexical');
    assert.deepEqual(body.results.map((hit: { url: string }) => hit.url), audience === 'authors' ? ['/harbor#docking'] : []);
  }
});

test('semantic deadline aborts embeddings and returns lexical results even if the provider ignores cancellation', { timeout: 1000 }, async () => {
  let providerSignal: AbortSignal | undefined;
  let rejectProvider: ((error: Error) => void) | undefined;
  const handle = createSearchHandler({
    retriever: new Retriever(prepared(index), embeddings), hosts: ['127.0.0.1:8770'], semanticTimeoutMs: 10,
    embedQuery: async (_query, signal) => {
      providerSignal = signal;
      return new Promise<Float32Array>((_resolve, reject) => { rejectProvider = reject; });
    }
  });
  const response = await handle(request({ query: 'boat', variant: 'production|current|en' }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.mode, 'lexical');
  assert.equal(body.results[0].url, '/harbor#docking');
  assert.equal(providerSignal?.aborted, true);
  // A provider settling after fallback must not cause an unhandled rejection.
  rejectProvider!(new Error('late provider failure'));
});

test('semantic deadline bounds budget reservation and prevents a late embedding call', { timeout: 1000 }, async () => {
  let allowBudget: ((allowed: boolean) => void) | undefined;
  let embeds = 0;
  const handle = createSearchHandler({
    retriever: new Retriever(prepared(index), embeddings), hosts: ['127.0.0.1:8770'], semanticTimeoutMs: 10,
    budget: { reserve: () => new Promise<boolean>(resolve => { allowBudget = resolve; }) },
    embedQuery: async () => { embeds++; return new Float32Array([1, 0]); }
  });
  const response = await handle(request({ query: 'boat', variant: 'production|current|en' }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.mode, 'lexical');
  assert.equal(body.results[0].url, '/harbor#docking');
  allowBudget!(true);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(embeds, 0);
});

test('budget reservation errors preserve lexical search without calling embeddings', async () => {
  const handle = createSearchHandler({
    retriever: new Retriever(prepared(index), embeddings), hosts: ['127.0.0.1:8770'],
    budget: { reserve: async () => { throw new Error('budget store unavailable'); } },
    embedQuery: async () => { assert.fail('must not embed without a budget reservation'); }
  });
  const response = await handle(request({ query: 'boat', variant: 'production|current|en' }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.mode, 'lexical');
  assert.equal(body.results[0].url, '/harbor#docking');
});

test('hosted search limits requests and embedding spend independently of lexical results', async () => {
  let embeds = 0;
  let reservations = 0;
  let takes = 0;
  const handle = createSearchHandler({ retriever: new Retriever(prepared(index), embeddings), hosts: ['127.0.0.1:8770'], embedQuery: async () => { embeds++; return new Float32Array([1, 0]); }, budget: { reserve: async () => ++reservations === 1 }, rateLimiter: { take: async () => ({ allowed: ++takes <= 2, retryAfterSeconds: 17 }) } });
  const body = { query: 'boat', variant: 'production|current|en' };
  assert.equal((await (await handle(request(body))).json() as { mode: string }).mode, 'vector');
  assert.equal((await (await handle(request(body))).json() as { mode: string }).mode, 'lexical');
  const limited = await handle(request(body));
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get('retry-after'), '17');
  assert.equal(embeds, 1);
  assert.equal(reservations, 2);
});


test('semantic search does not promote incidental word matches over vector results', async () => {
  const retriever = new Retriever(prepared(index), embeddings);
  retriever.hybrid = () => assert.fail('Search-box semantic retrieval must not fuse rankings');
  retriever.lexical = () => assert.fail('Successful semantic retrieval must not add lexical results');
  const handle = createSearchHandler({ retriever, hosts: ['127.0.0.1:8770'], embedQuery: async () => new Float32Array([0, 1]) });
  const response = await handle(request({ query: 'boat', variant: 'production|current|en', limit: 1 }));
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.mode, 'vector');
  assert.deepEqual(body.results.map((hit: { url: string }) => hit.url), ['/sail']);
});

test('identifier assistance obeys multi-facet views and publication scope in both semantic and fallback search', async () => {
  const chunks = [
    { ...index.chunks[0], id: 'shared', docId: 'shared', url: '/shared', readerFilters: undefined, text: 'Use settings.preview while authoring.' },
    { ...index.chunks[0], id: 'author', docId: 'author', url: '/author', readerFilters: { audience: ['authors'], focus: ['write'], persona: ['ui'] }, text: 'Restart settings.preview after author edits.' },
    { ...index.chunks[0], id: 'maintainer', docId: 'maintainer', url: '/maintainer', readerFilters: { audience: ['maintainers'], focus: ['configure'], persona: ['developer'] }, text: 'Restart settings.preview after maintainer edits.' },
    { ...index.chunks[0], id: 'other-version', docId: 'other-version', url: '/other-version', variant: 'production|v2|en', readerFilters: undefined, text: 'Restart settings.preview; excluded release details.' }
  ];
  const scoped: ChunkIndex = { ...index, chunks };
  const stored: StoredEmbeddings = { ...embeddings, meta: { ...embeddings.meta, ids: chunks.map(c => c.id), digests: chunks.map(c => c.digest) }, vectors: chunks.map(() => new Float32Array([1, 0])) };
  const config = { ...filters, facets: { ...filters.facets, focus: { label: 'Focus', options: { write: 'Write', configure: 'Configure' } }, persona: { label: 'Persona', options: { ui: 'UI', developer: 'Developer' } } } };
  for (const fallback of [false, true]) for (const selection of [
    { audience: ['authors'], focus: ['write'], persona: ['ui'] },
    { audience: ['maintainers'], focus: ['configure'], persona: ['developer'] },
    { audience: ['authors', 'maintainers'], focus: ['write', 'configure'], persona: ['ui', 'developer'] },
    { audience: [], focus: [], persona: [] },
    { audience: ['authors'], focus: ['configure'], persona: ['ui'] }
  ]) {
    const handler = createSearchHandler({ retriever: new Retriever(prepared(scoped), stored), hosts: ['127.0.0.1:8770'], readerFilters: config, embedQuery: async () => { if (fallback) throw new Error('outage'); return new Float32Array([1, 0]); } });
    const body = await (await handler(request({ query: 'Restart settings.preview after edits', variant: 'production|current|en', readerSelection: selection }))).json();
    const eligible = chunks.filter(c => c.variant === 'production|current|en' && Object.entries(c.readerFilters ?? {}).every(([facet, marks]) => !selection[facet as keyof typeof selection].length || marks.some(m => selection[facet as keyof typeof selection].includes(m))));
    assert.deepEqual(new Set(body.results.map((r: { url: string }) => r.url)), new Set(eligible.map(c => c.url)));
    assert.ok(body.results.every((r: { summary: string }) => !r.summary.includes('excluded release')));
    assert.equal(body.mode, fallback ? 'lexical' : 'vector');
  }
});

test('topic search ranks substantive landing passages instead of related links and source-only fragments', async () => {
  const chunk = (id: string, docId: string, title: string, text: string, headingPath: string[] = []) => ({ ...index.chunks[0], id, docId, title, text, headingPath, url: `/${docId}${headingPath.length ? '#example' : ''}`, readerFilters: undefined });
  const chunks = [
    chunk('a-related', 'images', 'Images', '- [Diagrams](/diagrams) — Draw charts and graphs.', ['Related reading', 'Related topics']),
    ...Array.from({ length: 60 }, (_, i) => chunk(`b-source-${i}`, 'gallery', 'Diagram gallery', '```mermaid\ngraph LR\nA --> B\n```', ['Source'])),
    chunk('c-chart', 'gallery', 'Diagram gallery', 'Compare values on labeled axes.', ['XY chart']),
    chunk('d-related', 'diagrams', 'Diagrams', '- [Gallery](/gallery) — Browse charts and graphs.', ['Related reading']),
    chunk('e-intro', 'diagrams', 'Diagrams', 'Draw charts and graphs from source.'),
    chunk('f-fonts', 'fonts', 'Fonts', 'Choose a typeface.')
  ];
  const scoped: ChunkIndex = { ...index, chunks };
  const stored: StoredEmbeddings = { ...embeddings, meta: { ...embeddings.meta, ids: chunks.map(c => c.id), digests: chunks.map(c => c.digest) }, vectors: chunks.map((_, i) => new Float32Array([1, i / 100])) };
  for (const fallback of [false, true]) {
    const handle = createSearchHandler({ retriever: new Retriever(prepared(scoped), stored), hosts: ['127.0.0.1:8770'], embedQuery: async () => { if (fallback) throw new Error('offline'); return new Float32Array([1, 0]); } });
    for (const query of ['charts', 'graphs', 'charts and graphs']) {
      const body = await (await handle(request({ query, variant: 'production|current|en', limit: 3 }))).json();
      assert.equal(body.mode, fallback ? 'lexical' : 'vector');
      assert.ok(body.results.some((hit: { url: string }) => hit.url === '/diagrams'));
      assert.ok(body.results.every((hit: { url: string; summary: string }) => !hit.url.startsWith('/images') && !hit.summary.includes('Browse charts')));
      assert.ok(body.results.every((hit: { summary: string }) => hit.summary.length));
    }
    const body = await (await handle(request({ query: 'diagrams', variant: 'production|current|en', limit: 3 }))).json();
    assert.equal(body.results[0].url, '/diagrams');
    assert.equal(body.results[0].section, undefined);
  }
});

test('literal code and table lookups preserve rankings and descriptions in semantic and fallback search', async () => {
  const chunks = [
    { ...index.chunks[0], id: 'a-similar', docId: 'tokens', title: 'Theme tokens', url: '/tokens#other-colors', text: '| Token | Meaning |\n| --- | --- |\n| `--color-muted` | Secondary text. |' },
    { ...index.chunks[0], id: 'token', docId: 'tokens', title: 'Theme tokens', url: '/tokens#colors', text: '| Token | Meaning |\n| --- | --- |\n| `--color-header-muted` | Quiet header text. |' },
    { ...index.chunks[0], id: 'command', docId: 'cli', title: 'CLI reference', url: '/cli#scripts', text: '| Script | Purpose |\n| --- | --- |\n| `npm run docs:search-preview` | Serve the semantic search preview. |' },
    { ...index.chunks[0], id: 'code', docId: 'plugin', title: 'Plugin source', url: '/plugin#source', text: '```js\ncontent.component("Tabs", {}, children)\n```' },
    { ...index.chunks[0], id: 'b-unrelated', docId: 'themes', title: 'Themes', url: '/themes', text: 'Choose a theme and palette.' },
    { ...index.chunks[0], id: 'nav', docId: 'links', title: 'Related tools', url: '/links', text: '- [content.component](/plugin) — Find helper syntax.' },
    { ...index.chunks[0], id: 'hidden', docId: 'private', title: 'Private', url: '/private', text: '```css\n--color-header-muted: red\n```', readerFilters: { audience: ['maintainers'] } },
    { ...index.chunks[0], id: 'other', docId: 'other', title: 'Other release', url: '/v2', text: '```css\n--color-header-muted: red\n```', variant: 'production|v2|en' }
  ];
  const scoped: ChunkIndex = { ...index, chunks };
  const stored: StoredEmbeddings = { ...embeddings, meta: { ...embeddings.meta, ids: chunks.map(c => c.id), digests: chunks.map(c => c.digest) }, vectors: chunks.map(() => new Float32Array([1, 0])) };
  for (const fallback of [false, true]) {
    const handle = createSearchHandler({ retriever: new Retriever(prepared(scoped), stored), hosts: ['127.0.0.1:8770'], readerFilters: filters, embedQuery: async () => { if (fallback) throw new Error('offline'); return new Float32Array([1, 0]); } });
    for (const [query, url, snippet] of [
      ['--color-header-muted', '/tokens#colors', '--color-header-muted — Quiet header text.'],
      ['npm run docs:search-preview', '/cli#scripts', 'npm run docs:search-preview — Serve the semantic search preview.'],
      ['content.component', '/plugin#source', 'content.component("Tabs", {}, children)']
    ]) {
      const body = await (await handle(request({ query, variant: 'production|current|en', readerSelection: { audience: ['authors'] } }))).json();
      assert.equal(body.mode, fallback ? 'lexical' : 'vector');
      assert.ok(body.results.some((hit: { url: string; summary: string }) => hit.url === url && hit.summary === snippet), JSON.stringify(body.results));
      assert.ok(body.results.every((hit: { url: string }) => !['/private', '/v2', '/links'].includes(hit.url)));
      if (query === '--color-header-muted') assert.equal(body.results[0].url, url);
    }
  }
});


test('search distinguishes fallback causes without exposing queries or provider errors', async () => {
  for (const reason of ['embeddings-unavailable', 'budget-denied', 'budget-unavailable', 'provider-error', 'deadline'] as const) {
    const events: string[] = [];
    const handler = createSearchHandler({
      retriever: new Retriever(prepared(index), embeddings), hosts: ['127.0.0.1:8770'],
      onFallback: value => events.push(value), semanticTimeoutMs: 5,
      ...(reason === 'embeddings-unavailable' ? {} : { embedQuery: async () => {
        if (reason === 'provider-error') throw new Error('private provider error');
        if (reason === 'deadline') return new Promise<Float32Array>(() => {});
        assert.fail('budget rejection must prevent embedding');
      } }),
      ...(reason === 'budget-denied' ? { budget: { reserve: async () => false } } : {}),
      ...(reason === 'budget-unavailable' ? { budget: { reserve: async () => { throw new Error('private store error'); } } } : {})
    });
    const response = await handler(request({ query: 'boat', variant: 'production|current|en' }));
    const body = await response.json();
    assert.equal(body.mode, 'lexical');
    assert.equal(body.fallbackReason, reason);
    assert.deepEqual(events, [reason]);
    assert.ok(!JSON.stringify(body).includes('private'));
    assert.equal(body.results[0].url, '/harbor#docking');
  }
});
