import test from 'node:test';
import assert from 'node:assert/strict';
import { navigationCounts, navigationHeading } from './compiler-config.js';
import { buildHtmlPage, parse } from './content.js';
import type { Document, NavigationNode } from './content-source.js';

test('navigation counts default on and reject non-boolean settings', () => {
  for (const outputs of [undefined, {}, { html: {} }, { html: { navigation: {} } }]) {
    assert.equal(navigationCounts(outputs), true);
  }
  assert.equal(navigationCounts({ html: { navigation: { showCounts: false } } }), false);
  for (const showCounts of ['false', null, 0]) {
    assert.throws(() => navigationCounts({ html: { navigation: { showCounts } } }), /showCounts must be true or false/);
  }
  assert.throws(() => navigationCounts({ html: { navigation: false } }), /navigation must be a mapping/);
});

test('group counts can be omitted without removing nested or API navigation', () => {
  const doc = {
    file: 'page.md', route: '/page',
    frontmatter: { id: 'page', title: 'Page', summary: 'Summary', type: 'reference', access: { policy: 'public' } },
    variant: { channel: 'production', version: 'current', language: 'en' },
  } as Document;
  const nav: NavigationNode[] = [{ id: 'group', label: 'Guides', items: [
    { id: 'nested', label: 'API', items: [{ id: 'page', label: 'Get page', route: '/page', method: 'GET' }] },
  ] }];
  const tree = parse.parse('## Start\n\nPage content.');
  for (const layout of ['docs', 'wide', 'landing', 'splash'] as const) {
    doc.frontmatter.layout = layout;
    const page = (showCounts?: boolean) => buildHtmlPage(doc, tree, '/page.md', 'Site', nav, [], [], undefined, '', false, {}, undefined, undefined,
      { outputs: { html: { navigation: showCounts === undefined ? {} : { showCounts } } } });
    const hidden = page(false);
    assert.doesNotMatch(hidden, /class="nav-count"/);
    if (layout === 'docs' || layout === 'wide') {
      assert.match(page(), /class="nav-count">1/);
      assert.match(page(true), /class="nav-count">1/);
      assert.match(hidden, /<summary>Guides<\/summary>/);
      assert.match(hidden, /<summary>API<\/summary>/);
      assert.match(hidden, /aria-current="page"/);
      assert.match(hidden, /method-get/);
    }
  }
});


test('navigation heading can be hidden or renamed while the filter retains its accessible label', () => {
  const doc = { file: 'page.md', route: '/page', frontmatter: { id: 'page', title: 'Page', summary: 'Summary', type: 'reference' }, variant: { channel: 'production', version: 'current', language: 'en' } } as Document;
  const page = (heading?: unknown) => buildHtmlPage(doc, parse.parse('Body.'), '/page.md', 'Site', [{ id: 'page', label: 'Page', route: '/page' }], [], [], undefined, '', false, {}, undefined, undefined,
    { outputs: { html: { navigation: heading === undefined ? {} : { heading } } } });
  assert.match(page(), /<h2>Explore<\/h2>/);
  assert.doesNotMatch(page(false), /<h2>Explore<\/h2>/);
  assert.match(page(false), /<label for="nav-filter">Filter navigation<\/label>/);
  assert.match(page(false), /id="nav-filter" type="search"/);
  assert.match(page('Browse & learn'), /<h2>Browse &amp; learn<\/h2>/);
  for (const heading of [true, '', '  ', null, 3, {}]) assert.throws(() => navigationHeading({ html: { navigation: { heading } } }), /heading must be nonempty text or false/);
});
