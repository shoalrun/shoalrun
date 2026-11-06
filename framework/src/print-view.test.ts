import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFragment } from 'parse5';

function dom(node: any): any {
  return {
    nodeType: node.nodeName === '#text' ? 3 : node.tagName ? 1 : 11,
    localName: node.tagName, namespaceURI: node.namespaceURI,
    textContent: node.value ?? '', attributes: node.attrs ?? [],
    childNodes: (node.childNodes ?? []).map(dom),
    getAttribute: (name: string) => node.attrs?.find((attr: any) => attr.name === name)?.value ?? null,
    hasAttribute: (name: string) => node.attrs?.some((attr: any) => attr.name === name) ?? false
  };
}
function flatten(nodes: any[]): any[] { return nodes.flatMap(node => [node, ...flatten(node.children ?? [])]); }
const load = () => import(new URL('../assets/print-view.js', import.meta.url).href);

test('blank print windows grant styles and fonts to the explicit site origin', async () => {
  const { printPolicy } = await load();
  const policy = printPolicy('http://127.0.0.1:8896/help/page?private=token#heading');
  assert.match(policy, /(?:^|; )style-src http:\/\/127\.0\.0\.1:8896 'unsafe-inline';/);
  assert.match(policy, /(?:^|; )font-src http:\/\/127\.0\.0\.1:8896;/);
  assert.match(policy, /script-src 'none'; base-uri 'none'; form-action 'none'/);
  assert.doesNotMatch(policy, /'self'|private|token|heading|\/help/);
  assert.match(printPolicy('https://docs.example:8443/page'), /font-src https:\/\/docs\.example:8443;/);
  for (const base of ['about:blank', 'file:///private/data', 'data:text/html,bad', 'https://user:pass@example.com/']) assert.throws(() => printPolicy(base));
});

test('print content expands hidden alternatives and details without carrying browser controls or executable HTML', async () => {
  const { printNodes } = await load();
  const source = parseFragment(`<section class="reader-section" hidden data-reader-print-label="For Operators."><details><summary>Checklist</summary><p id="check">Essential instructions.</p></details></section><div class="doc-tablist"><a href="#check">Tab control</a></div><section class="doc-tabpanel" hidden aria-hidden="true"><h3>Other platform</h3><p>Alternative instructions.</p></section><script>bad()</script><button onclick="bad()">Control</button><iframe src="https://evil.example/"></iframe><p onclick="bad()"><a href="javascript:bad()">Unsafe link</a><a href="#check">Go to checklist</a><img src="./diagram.svg" alt="Diagram"></p>`);
  const nodes = source.childNodes.flatMap(node => printNodes(dom(node), 'https://docs.example/help/guide?private=token'));
  const all = flatten(nodes), text = all.map(node => node.text ?? '').join(' ');
  assert.match(text, /For Operators\./);
  assert.match(text, /Checklist.*Essential instructions/);
  assert.match(text, /Other platform.*Alternative instructions/);
  assert.doesNotMatch(text, /bad\(\)|Tab control|Control/);
  assert.ok(!all.some(node => ['script', 'button', 'iframe', 'details', 'summary'].includes(node.tag)));
  for (const node of all) for (const [name, value] of Object.entries(node.attrs ?? {})) {
    assert.ok(!/^on|^hidden$|^aria-hidden$/.test(name));
    assert.ok(!String(value).includes('javascript:'));
  }
  assert.ok(all.some(node => node.tag === 'a' && node.attrs.href === '#check' && !node.attrs.target));
  assert.ok(all.some(node => node.tag === 'img' && node.attrs.src === 'https://docs.example/help/diagram.svg'));
});

test('print nodes retain mathematical content and safe code color tokens', async () => {
  const { printNodes } = await load();
  const source = parseFragment('<math xmlns="http://www.w3.org/1998/Math/MathML"><msup><mi>x</mi><mn>2</mn></msup></math><pre><code><span style="color:var(--code-token-keyword)">return</span> 42;</code></pre><svg xmlns="http://www.w3.org/2000/svg"><use href="https://evil.example/track.svg#x"/><path d="M0 0L5 5" onclick="bad()"/></svg>');
  const all = flatten(source.childNodes.flatMap(node => printNodes(dom(node), 'https://docs.example/guide')));
  assert.ok(all.some(node => node.tag === 'msup' && node.namespace === 'http://www.w3.org/1998/Math/MathML'));
  assert.ok(all.some(node => node.tag === 'span' && node.attrs.style === 'color:var(--code-token-keyword)'));
  assert.ok(!all.some(node => Object.values(node.attrs ?? {}).some(value => String(value).includes('evil.example'))));
  assert.ok(all.some(node => node.tag === 'path' && node.attrs.d === 'M0 0L5 5' && !node.attrs.onclick));
});

test('print URLs reject active and local-file protocols while retaining usable document links', async () => {
  const { printUrl } = await load();
  for (const value of ['javascript:bad()', 'file:///private/data', 'data:text/html,bad', 'https://user:pass@example.com/']) assert.equal(printUrl(value, 'https://docs.example/help/guide'), undefined);
  assert.equal(printUrl('../start', 'https://docs.example/help/guide'), 'https://docs.example/start');
  assert.equal(printUrl('#section', 'https://docs.example/help/guide?private=token'), '#section');
});

test('SVG print attributes cannot hide external resource loaders with CSS escapes', async () => {
  const { printNodes } = await load();
  const source = parseFragment(String.raw`<svg><rect fill="u\72l(//example.invalid/pattern.svg#x)" stroke="url(//example.invalid/stroke.svg#x)"/><path fill="url(#local)" d="M0 0L5 5"/></svg>`);
  const all = flatten(source.childNodes.flatMap(node => printNodes(dom(node), 'https://docs.example/guide')));
  const rect = all.find(node => node.tag === 'rect');
  assert.equal(rect.attrs.fill, undefined);
  assert.equal(rect.attrs.stroke, undefined);
  assert.equal(all.find(node => node.tag === 'path').attrs.fill, 'url(#local)');
  assert.ok(!all.some(node => Object.values(node.attrs ?? {}).some(value => String(value).includes('example.invalid'))));
});

test('print images retain their CORS and referrer controls before src starts a request', async () => {
  const { printNodes, materialize } = await load();
  const source = parseFragment('<img src="https://images.example/pixel.png" referrerpolicy="NO-REFERRER" crossorigin="anonymous"><img src="/private.png" crossorigin="USE-CREDENTIALS" referrerpolicy="same-origin"><img src="/empty.png" crossorigin><img src="/invalid.png" crossorigin="invalid" referrerpolicy="invalid"><img src="/default.png">');
  const nodes = source.childNodes.flatMap(node => printNodes(dom(node), 'https://docs.example/guide'));
  assert.equal(nodes[0].attrs.referrerpolicy, 'no-referrer');
  assert.equal(nodes[0].attrs.crossorigin, 'anonymous');
  assert.equal(nodes[1].attrs.referrerpolicy, 'same-origin');
  assert.equal(nodes[1].attrs.crossorigin, 'use-credentials');
  assert.equal(nodes[2].attrs.crossorigin, 'anonymous');
  assert.equal(nodes[3].attrs.crossorigin, 'anonymous');
  assert.equal(nodes[3].attrs.referrerpolicy, undefined);
  assert.equal(nodes[4].attrs.crossorigin, undefined);
  const writes: string[] = [];
  const doc = { createElement: () => ({ setAttribute: (name: string) => writes.push(name), append() {} }) };
  materialize(doc, nodes[0]);
  assert.ok(writes.indexOf('crossorigin') < writes.indexOf('src'));
  assert.ok(writes.indexOf('referrerpolicy') < writes.indexOf('src'));
  assert.equal(writes.at(-1), 'src');
});
