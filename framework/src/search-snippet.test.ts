import assert from 'node:assert/strict';
import { test } from 'node:test';
import { searchSnippet, searchPassageParagraphs } from './search-snippet.js';

test('search snippets render prose without Markdown link targets or list markers', () => {
  assert.equal(searchSnippet('- [Configuration reference](/config.md) — Look up every `navigation` field.', 'navigation'), 'Configuration reference — Look up every navigation field.');
});

test('search snippets prefer matching prose and use the page summary for tables and code', () => {
  assert.equal(searchSnippet('An introduction.\n\nThe navigation tree sets page order.', 'navigation'), 'The navigation tree sets page order.');
  assert.equal(searchSnippet('| Token | Controls |\n| --- | --- |\n| `--color-header-muted` | Navigation |', 'navigation', 'Browse the theme tokens.'), 'Browse the theme tokens.');
  assert.equal(searchSnippet('```yaml\nnavigation: []\n```', 'navigation', 'Arrange the site menu.'), 'Arrange the site menu.');
});

test('snippets ignore question filler and generated discovery boilerplate', () => {
  const text = '> Documentation index: [llms.txt](/llms.txt) · Document manifest: [documents.json](/documents.json)\n\nBreadcrumbs: Authoring > Navigation\n\nThis is the introduction.\n\nRestart preview after editing the metadata provider.';
  assert.equal(searchSnippet(text, 'What do I do after editing the metadata provider?'), 'Restart preview after editing the metadata provider.');
});
test('snippet matches respect word boundaries and keep a late matching term visible', () => {
  assert.equal(searchSnippet('The boathouse has storage.\n\nTie the boat here.', 'boat'), 'Tie the boat here.');
  const snippet = searchSnippet('Introductory context. '.repeat(20) + 'Restart preview after editing metadata.provider.', 'metadata.provider');
  assert.ok(snippet.includes('metadata.provider'));
  assert.ok(snippet.startsWith('…'));
  assert.ok(snippet.length <= 180);
});
test('snippets preserve Unicode matches, omit unsafe markup and fall back for empty prose', () => {
  assert.equal(searchSnippet('A general overview.\n\nConfiguración de navegación.', 'navegación'), 'Configuración de navegación.');
  assert.equal(searchSnippet('<script>hidden()</script>\n\n![ignored](private.png)\n\n```sh\nsecret\n```', 'hidden', 'Read the published guide.'), 'Read the published guide.');
});

test('search evidence excludes link directories, code-only passages, and discovery metadata', () => {
  assert.deepEqual(searchPassageParagraphs('- [Diagrams](/diagrams.md) — Draw charts and graphs.\n\n- [Images](/images.md) — Add captions.'), []);
  assert.deepEqual(searchPassageParagraphs('```mermaid\ngraph LR\nA --> B\n```'), []);
  assert.deepEqual(searchPassageParagraphs('Navigation section: [Docs](/docs)\n\nPublished: 2026-10-18.\n\nUse diagrams for relationships.'), ['Use diagrams for relationships.']);
  assert.deepEqual(searchPassageParagraphs('Use [Diagrams](/diagrams.md) for charts.\n\n- Keep the warning visible.\n- Include the source.'), ['Use Diagrams for charts.', 'Keep the warning visible.', 'Include the source.']);
});
