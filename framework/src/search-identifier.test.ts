import assert from 'node:assert/strict';
import { test } from 'node:test';
import { identifierRescue, searchIdentifiers } from './search-identifier.js';
import type { Hit } from './retrieval.js';
const hit = (id: string, text = 'Semantic answer.'): Hit => ({ score: 1, chunk: { id, docId: id.split('#')[0], title: id, type: 'reference', variant: 'production|current|en', headingPath: [], url: `/${id}`, markdownUrl: `/${id}.md`, text, digest: id } });
test('identifier assistance handles config keys and flags without routing filenames or ordinary prose', () => {
  assert.deepEqual(searchIdentifiers('What sets `site.basePath` with --port?'), ['site.basePath', '--port']);
  assert.deepEqual(searchIdentifiers('llms.txt docs.config.yaml https://example.com ordinary preview'), []);
});
test('identifier assistance preserves the first two semantic pages and uses decisive prose', () => {
  const semantic = [hit('a#one'), hit('a#two'), hit('b'), hit('c'), hit('d')];
  const lexical = [hit('table', '| Key | Meaning |\n| --- | --- |\n| `metadata.provider` | Module |'), hit('prefix', 'Set metadata.provider.module here.'), hit('right', 'Restart after editing `metadata.provider`.')];
  const results = identifierRescue('Does metadata.provider reload?', semantic, lexical);
  assert.deepEqual([...new Set(results.map(h => h.chunk.docId))], ['a', 'b', 'right', 'c', 'd']);
  assert.equal(results[3].chunk.text, 'Restart after editing `metadata.provider`.');
});
test('identifier assistance requires all literals in one paragraph and ignores hidden destinations and listings', () => {
  const semantic = [hit('a'), hit('b'), hit('c')];
  assert.equal(identifierRescue('site.origin site.basePath', semantic, [hit('d', 'Set site.origin.\n\nSet site.basePath.')]), semantic);
  assert.equal(identifierRescue('site.origin', semantic, [hit('d', '[Click](https://site.origin)\n\n```yaml\nsite.origin: example\n```')]), semantic);
  assert.equal(identifierRescue('plain search', semantic, [hit('d', 'plain search')]), semantic);
});
test('already useful identifier pages are unchanged; rescued pages appear once with the matching passage', () => {
  const semantic = [hit('a'), hit('b'), hit('c'), hit('d#unrelated'), hit('d#other')];
  assert.equal(identifierRescue('site.origin', semantic, [hit('a', 'Set site.origin here.')]), semantic);
  const results = identifierRescue('site.origin', semantic, [hit('d#answer', 'Set site.origin here.')]);
  assert.equal(results.filter(h => h.chunk.docId === 'd').length, 1);
  assert.equal(results[2].chunk.id, 'd#answer');
});
