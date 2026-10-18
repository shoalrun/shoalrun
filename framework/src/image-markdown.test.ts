import assert from 'node:assert/strict';
import { test } from 'node:test';
import { publicTree } from './representation-tree.js';
import { renderMarkdown, parsePlainMarkdown, root, paragraph, text, heading, code } from './semantic-markdown.js';

test('block images preserve Markdown paragraphs, headings, and code fences', () => {
  const tree = root([paragraph(text('Before image.')), { type: 'docImage', url: '/assets/example.png', alt: 'Example', width: 640 }, heading(2, 'Instructions'), paragraph(text('After image.')), code('echo hello', 'sh')]);
  const markdown = renderMarkdown(publicTree(tree, 'markdown', new Set()));
  assert.deepEqual(parsePlainMarkdown(markdown).map(node => node.type), ['paragraph', 'paragraph', 'heading', 'paragraph', 'code']);
  assert.equal(parsePlainMarkdown(markdown)[4].value, 'echo hello');
  assert.match(markdown, /Before image\.\n\n!\[Example\]/);
});
