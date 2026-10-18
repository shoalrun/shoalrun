import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { resolveAnalytics } from './analytics.js';
import { buildHtmlPage, parse } from './content.js';
import type { Document } from './content-source.js';

test('analytics is opt-in and resolves only a declared browser module', () => {
  const config = path.resolve('project/config/settings.yaml');
  assert.equal(resolveAnalytics(undefined, config), undefined);
  assert.equal(resolveAnalytics(false, config), undefined);
  assert.equal(resolveAnalytics({ module: './events.mjs' }, config), path.resolve('project/config/events.mjs'));
  for (const value of [true, null, [], 'events.js', {}, { module: '' }, { module: 'https://example.test/events.js' }, { module: './events.ts' }, { module: './events.js', key: 'secret' }]) {
    assert.throws(() => resolveAnalytics(value, config), /analytics/);
  }
});

test('analytics context preserves page identity without introducing script markup', () => {
  const id = '</script><script>alert(1)</script>';
  const doc = { file: 'page.md', frontmatter: { id, title: 'Page', type: 'reference', summary: 'Summary', slug: '/page' },
    route: '/docs/page', markdownRoute: '/docs/page.md', variant: { channel: 'production', version: 'current', language: 'en' } } as Document;
  const html = buildHtmlPage(doc, parse.parse('Page content.'), '/docs/page.md', 'Site', [], [], [], undefined, '', false, {}, undefined, undefined,
    { analytics: { module: './adapter.js' }, site: { basePath: '/docs' } });
  const context = html.match(/id="analytics-config">([^]*?)<\/script>/)?.[1];
  assert.ok(context);
  assert.equal(JSON.parse(context).pageId, id);
  assert.ok(!context.includes('<script>'));
  assert.match(html, /src="\/docs\/assets\/analytics.js"/);
});
