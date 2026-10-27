import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import puppeteer from 'puppeteer';
import { compile } from './compiler.js';
import { initProject } from './init.js';
import { createSiteServer } from './server.js';
import { markdownTokens } from './markdown-size.js';
import { compactDiscoveryTokenLimit } from './compact-discovery.js';

test('showcase starter preserves content in both outputs and works across reader layouts', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-showcase-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await initProject(directory, 'showcase');
  const output = path.join(directory, 'site-dist');
  const manifest = await compile(path.join(directory, 'docs.config.yaml'), output);
  assert.equal(manifest.documents.length, 18);
  const reading = await readFile(path.join(output, 'handbook/reading.md'), 'utf8');
  for (const value of ['All parcel IDs', 'Group parcels', 'Keep the dispatch receipt', 'Changing a destination', 'Do not put real addresses', 'Regional', 'dispatchName']) assert.ok(reading.includes(value), value);
  const code = await readFile(path.join(output, 'handbook/code.md'), 'utf8');
  for (const value of ['JavaScript', 'Python', 'Reject invalid counts', 'receipt inspection']) assert.ok(code.includes(value), value);
  const visuals = await readFile(path.join(output, 'handbook/visuals.md'), 'utf8');
  for (const value of ['```mermaid', '```d2', 'collection', 'Reconcile the counts']) assert.ok(visuals.includes(value), value);
  const views = await readFile(path.join(output, 'handbook/personalization.md'), 'utf8');
  assert.match(views, /For Reader: Operations team/);
  assert.match(views, /For Reader: Developer/);
  // Follow topic indexes as well as the flat entry point; every page must retain
  // its actual full-page size and type after budget-driven splitting.
  const seen = new Set<string>();
  let catalog = '';
  const visit = async (url: string) => {
    if (seen.has(url)) return;
    seen.add(url);
    const content = await readFile(path.join(output, url), 'utf8');
    assert.ok(markdownTokens(content) <= compactDiscoveryTokenLimit, url);
    catalog += content;
    for (const match of content.matchAll(/\]\((\/\.well-known\/shoalrun\/discovery\/[^)]+)\)/g)) await visit(match[1]);
  };
  await visit('/llms.min.txt');
  for (const doc of manifest.documents) {
    assert.ok(catalog.includes(`](${doc.markdownUrl}): ${doc.type}; ${doc.markdownTokens} tokens.`), doc.id);
  }
  const server = await createSiteServer(output);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise<void>(resolve => { server.closeAllConnections(); server.close(() => resolve()); }));
  const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const browser = await puppeteer.launch();
  t.after(() => browser.close());
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(String(error)));
  for (const width of [1920, 390]) {
    await page.setViewport({ width, height: 1000 });
    for (const mode of ['light', 'dark']) {
      await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: mode }]);
      for (const route of ['reading', 'code', 'visuals', 'personalization', 'workflows', 'landing']) {
        await page.goto(`${origin}/handbook/${route}`, { waitUntil: 'networkidle0' });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${route} ${width} ${mode} overflows`);
        const smallControls = await page.$$eval('main button, main select, main label, .reader-filter-controls summary', nodes => nodes.filter(node => node.getClientRects().length && parseFloat(getComputedStyle(node).fontSize) < 12).map(node => node.textContent));
        assert.deepEqual(smallControls, [], `${route} has controls smaller than 12px`);
        if (process.env.SHOALRUN_SHOWCASE_SCREENSHOTS) {
          await mkdir(process.env.SHOALRUN_SHOWCASE_SCREENSHOTS, { recursive: true });
          await page.screenshot({ path: path.join(process.env.SHOALRUN_SHOWCASE_SCREENSHOTS, `${route}-${width}-${mode}.png`), fullPage: true });
        }
      }
    }
  }
  await page.setViewport({ width: 390, height: 1000 });
  await page.goto(`${origin}/handbook/reading`, { waitUntil: 'networkidle0' });
  const headerRows = await page.$$eval('.site-search, .mode-toggle, .header-actions', nodes => nodes.map(node => Math.round(node.getBoundingClientRect().top)));
  assert.ok(Math.max(...headerRows) - Math.min(...headerRows) < 8, 'short header controls share a mobile row');
  await page.type('.site-search input', 'dispatch');
  await page.waitForSelector('.site-search-results a');
  assert.ok(await page.$eval('.site-search-results', node => { const box = node.getBoundingClientRect(); return box.left >= 0 && box.right <= innerWidth; }), 'search results fit the mobile viewport');
  await page.setViewport({ width: 1920, height: 1000 });
  await page.goto(`${origin}/handbook/reading`, { waitUntil: 'networkidle0' });
  const measures = await page.$eval('main article', article => {
    const list = article.querySelector(':scope > ul')!;
    const paragraph = article.querySelector(':scope > p')!;
    return { list: getComputedStyle(list).maxWidth, paragraph: getComputedStyle(paragraph).maxWidth, table: article.querySelector('table')!.getBoundingClientRect().width, listWidth: list.getBoundingClientRect().width };
  });
  assert.equal(measures.list, measures.paragraph, 'ordinary list prose uses the paragraph measure');
  assert.ok(measures.table > measures.listWidth, 'tables can use the wider article');
  await page.type('.doc-table-filter input', 'Local');
  assert.equal(await page.$$eval('.doc-table tbody tr', rows => rows.filter(row => !row.hidden).length), 1);
  await page.goto(`${origin}/handbook/workflows`, { waitUntil: 'networkidle0' });
  await page.click('.cookbook-option input[value="artifacts"]');
  await page.waitForFunction(() => document.querySelector('.cookbook-chooser-result')?.textContent?.includes('Inspect the result'));
  await page.setJavaScriptEnabled(false);
  await page.goto(`${origin}/handbook/code`, { waitUntil: 'networkidle0' });
  assert.ok(await page.$eval('main', node => node.textContent!.includes('receipt.py') && node.textContent!.includes('receipt.mjs')));
  assert.deepEqual(errors, []);
});
