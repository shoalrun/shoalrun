import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Run the shipped renderer with a small DOM so assertions cover its actual
// copyable code text, rather than a second Markdown implementation.
class Element {
  constructor(tag, text = '') { this.tag = tag; this.children = []; this.value = text; this.attributes = {}; }
  set textContent(text) { this.value = text; this.children = []; }
  get textContent() { return this.value + this.children.map(child => typeof child === 'string' ? child : child.textContent).join(''); }
  setAttribute(name, value) { this.attributes[name] = value; }
  append(...children) { this.children.push(...children); }
}
const widget = readFileSync(new URL('../assets/ask-widget.js', import.meta.url), 'utf8');
const context = vm.createContext({ document: { createElement: tag => new Element(tag), createTextNode: text => new Element('#text', text) } });
vm.runInContext(widget.slice(widget.indexOf('  const el ='), widget.indexOf('  const style =')) + '\nglobalThis.draw = render;', context);
function render(markdown) {
  const root = new Element('article');
  context.draw(root, markdown, []);
  return root;
}
const nodes = (root, tag) => [...(root.tag === tag ? [root] : []), ...root.children.filter(child => typeof child !== 'string').flatMap(child => nodes(child, tag))];

test('nested Mermaid fences remain one complete copyable MDX example', () => {
  const example = '<Diagram title="Review flow" summary="An author submits a page." engine="mermaid">\n\n```mermaid\nflowchart LR\n  author --> review\n```\n\n</Diagram>';
  const root = render('Example:\n\n````mdx\n' + example + '\n````\n\nAfter the example.');
  assert.deepEqual(nodes(root, 'pre').map(node => node.textContent), [example]);
  assert.equal(root.children.at(-1).textContent, 'After the example.');
});

test('only a matching fence character of sufficient length on its own line closes code', () => {
  for (const fence of ['````', '~~~~']) {
    const example = 'first\n```\n~~~\n' + fence + 'not a closing fence\nlast';
    assert.deepEqual(nodes(render(fence + 'text\n' + example + '\n' + fence + fence[0]), 'pre').map(node => node.textContent), [example]);
  }
});

test('indented fenced code stays within its ordered list item and preserves blank lines', () => {
  const root = render('1. Run this:\n\n    ```sh\n    first\n\n    second\n    ```\n\n2. Continue.');
  assert.equal(nodes(root, 'ol').length, 1);
  assert.equal(nodes(root, 'li').length, 2);
  assert.equal(nodes(nodes(root, 'li')[0], 'pre')[0].textContent, 'first\n\nsecond');
});

test('an unfinished fence keeps the remaining response as code', () => {
  assert.deepEqual(nodes(render('```sh\necho hello\n'), 'pre').map(node => node.textContent), ['echo hello']);
});
