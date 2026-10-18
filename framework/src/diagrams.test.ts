import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { resolveDiagramTrees } from './diagrams.js';
import { diagramSvg } from './diagram-svg.js';
import { publicTree } from './representation-tree.js';
import { renderHtml } from './html-renderer.js';
import { resolvePalette } from './palettes.js';
import { fileURLToPath } from 'node:url';

const diagram = (source = 'flowchart LR\nAuthor --> Review --> Publish') => ({ type: 'docDiagram', engine: 'mermaid', title: 'Review flow', summary: 'Review before publishing.', source, file: 'example.mdx', width: 520 });

test('Pele renders without Chrome, reuses cached SVG, namespaces repeated instances, and keeps Markdown source', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'pele-diagrams-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const first = diagram(), second = diagram();
  const tree = { type: 'root', children: [first, second] };
  const assets = await resolveDiagramTrees([tree], directory, '/docs', await resolvePalette('ink', 'ink'));
  assert.equal(assets.length, 2);
  assert.ok(assets.every(asset => asset.route.startsWith('/docs/assets/diagrams/mermaid-')));
  assert.match(assets[0].svg, /--pele-fg:#121211/);
  assert.match(assets[1].svg, /--pele-fg:/);
  const html = renderHtml(publicTree(tree, 'html', new Set()));
  assert.equal((html.match(/data-renderer="pele"/g) ?? []).length, 2);
  assert.match(html, /max-width:520px/);
  assert.match(html, /<svg[^>]*role="img"[^>]*aria-label="Review flow"/);
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const ref of html.matchAll(/url\(#([^\)]+)\)/g)) assert.ok(ids.includes(ref[1]), `missing marker ${ref[1]}`);
  const markdown = publicTree(tree, 'markdown', new Set());
  assert.equal(markdown.children.filter((node: any) => node.type === 'code')[0].value, first.source);
  const cached = await readdir(directory);
  const again = await resolveDiagramTrees([{ type: 'root', children: [diagram()] }], directory, '/docs', await resolvePalette('ink', 'ink'));
  assert.deepEqual(again, assets);
  assert.deepEqual(await readdir(directory), cached);
  for (const file of cached) assert.match(await readFile(path.join(directory, file), 'utf8'), /pele-flowchart/);
});

test('unsupported or invalid Mermaid syntax fails with source and title', async () => {
  await assert.rejects(resolveDiagramTrees([diagram('not-a-diagram\nhello')]), /example.mdx: failed to render mermaid diagram "Review flow"/);
  await assert.rejects(resolveDiagramTrees([diagram('flowchart LR\nA --> [')]), /example.mdx:/);
});

test('diagram SVG rejects active content and external references', () => {
  for (const svg of ['<svg><script>alert(1)</script></svg>', '<svg onload="alert(1)"></svg>', '<svg><foreignObject>HTML</foreignObject></svg>', '<svg><use href="https://private.example/x"/></svg>', '<svg><path style="fill:url(https://private.example/x)"/></svg>']) {
    assert.throws(() => diagramSvg(svg, 'Unsafe', 'instance'), /Unsafe|External/);
  }
  const svg = '<svg><defs><marker id="tip"><path d="M0 0"/></marker></defs><path marker-end="url(#tip)"/></svg>';
  const a = JSON.stringify(diagramSvg(svg, 'First', 'first'));
  const b = JSON.stringify(diagramSvg(svg, 'Second', 'second'));
  assert.match(a, /url\(#first-tip\)/);
  assert.match(b, /url\(#second-tip\)/);
  assert.ok(!b.includes('first-tip'));
});

test('all gallery families and flowchart shape sheets compile through the supported SVG path', async () => {
  const examples = JSON.parse(await readFile(fileURLToPath(new URL('../examples/diagrams/gallery.json', import.meta.url)), 'utf8'));
  assert.equal(examples.length, 39);
  const tree = { type: 'root', children: examples.map((example: any) => ({ ...diagram(example.source), title: example.title, summary: example.summary })) };
  const assets = await resolveDiagramTrees([tree]);
  assert.equal(assets.length, 78);
  const html = renderHtml(publicTree(tree, 'html', new Set()));
  assert.equal((html.match(/data-renderer="pele"/g) ?? []).length, 39);
  assert.ok(!/<script|<foreignObject|<image\b/.test(html));
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
});

test('diagram labels remain text and authored URLs/images are not activated', async () => {
  const node = diagram('flowchart LR\nA["&lt;script&gt;alert(1)&lt;/script&gt;"] --> B[Safe]\nclick B "https://example.test"');
  const assets = await resolveDiagramTrees([node]);
  const html = renderHtml(publicTree({ type: 'root', children: [node] }, 'html', new Set()));
  assert.ok(!/<script|<a\b|<image\b|<foreignObject\b|onload=/i.test(html));
  assert.ok(assets.every(asset => !asset.svg.includes('href="https://example.test"')));
});
