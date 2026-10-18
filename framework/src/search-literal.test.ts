import assert from 'node:assert/strict';
import { test } from 'node:test';
import { literalSearch } from './search-literal.js';
import { searchLiteralLines } from './search-snippet.js';

test('literal matching distinguishes technical lookups from topic words and identifier prefixes', () => {
  for (const query of ['charts', 'graphs', 'charts and graphs', 'diagrams', 'change my fonts']) assert.equal(literalSearch(query), undefined, query);
  for (const query of ['--color-header-muted', 'content.component', 'npm run build', 'npm run docs:search-preview', 'curl -X POST', 'sequenceDiagram', 'layout="dagre"', '"flowchart LR"', 'docs.config.yaml']) {
    const text = query.startsWith('"') ? query.slice(1, -1) : query;
    assert.equal(literalSearch(query)?.([text]), text, query);
  }
  assert.equal(literalSearch('--color-header-muted')?.(['--color-header-muted-extra', 'prefix--color-header-muted']), undefined);
  assert.equal(literalSearch('content.component')?.(['content.components', 'content.component.extra']), undefined);
  assert.equal(literalSearch('npm run build')?.(['npm run build-all']), undefined);
  assert.equal(literalSearch('curl -X POST')?.(['curl -X GET']), undefined);
  assert.equal(literalSearch('settings.preview and settings.theme')?.(['settings.preview only', 'settings.theme only']), undefined);
});

test('literal snippets use complete visible table rows or code lines without hidden link targets', () => {
  const markdown = '| Token | Meaning |\n| --- | --- |\n| `--color-header-muted` | Quiet header text. |\n\n```sh\nnpm run docs:search-preview\n```\n\n[Hidden](https://example.com/content.component)\n\n<script>content.component</script>';
  const lines = searchLiteralLines(markdown);
  assert.equal(literalSearch('--color-header-muted')?.(lines), '--color-header-muted — Quiet header text.');
  assert.equal(literalSearch('npm run docs:search-preview')?.(lines), 'npm run docs:search-preview');
  assert.equal(literalSearch('content.component')?.(lines), undefined);
  const long = 'Context '.repeat(40) + '--color-header-muted — Quiet header text. ' + 'More context. '.repeat(40);
  const snippet = literalSearch('--color-header-muted')!([long])!;
  assert.ok(snippet.includes('--color-header-muted'));
  assert.ok(snippet.length <= 180);
});
