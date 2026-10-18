import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sitemapFiles } from './sitemap.js';

test('sitemap emits sorted canonical URLs and only supplied modification dates', () => {
  const files = sitemapFiles('https://docs.example.com', [
    { route: '/z', updated: '2026-09-27' }, { route: '/a&b' }, { route: '/' }
  ]);
  const xml = files.get('/sitemap.xml')!;
  assert.equal(files.size, 1);
  assert.match(xml, /<loc>https:\/\/docs\.example\.com\/a&amp;b<\/loc>/);
  assert.equal((xml.match(/<lastmod>/g) ?? []).length, 1);
  assert.ok(xml.indexOf('docs.example.com/</loc>') < xml.indexOf('docs.example.com/a&amp;b'));
  assert.throws(() => sitemapFiles('https://docs.example.com', [{ route: '/same' }, { route: '/same' }]), /duplicate/);
});

test('large sitemap creates one index of URL sitemaps', () => {
  const files = sitemapFiles('https://docs.example.com', [
    { route: '/a' }, { route: '/b' }, { route: '/c' }
  ], { urls: 2 });
  assert.equal(files.size, 3);
  assert.match(files.get('/sitemap.xml')!, /<sitemapindex/);
  assert.match(files.get('/sitemap.xml')!, /sitemap-1\.xml/);
  assert.match(files.get('/sitemap-1.xml')!, /<urlset/);
  assert.match(files.get('/sitemap-2.xml')!, /<urlset/);
});
