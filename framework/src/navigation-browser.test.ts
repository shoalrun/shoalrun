import assert from 'node:assert/strict';
import test from 'node:test';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import { compile } from './compiler.js';
import { createSiteServer } from './server.js';

test('content-first navigation supports keyboard jumps, mobile flow, resize and native fallback', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-navigation-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await cp(fileURLToPath(new URL('../example-configs/minimal', import.meta.url)), directory, { recursive: true });
  const config = path.join(directory, 'docs.config.yaml');
  await writeFile(config, (await readFile(config, 'utf8')).replace('  title: Acme handbook', '  title: Acme handbook\n  basePath: /docs') + `
apis:
  demo:
    source: { kind: file, path: ./api.yaml }
    generateReferences: { pathPrefix: /reference }
`);
  await writeFile(path.join(directory, 'api.yaml'), `openapi: 3.1.0
info: { title: Example API, version: '1' }
paths:
  /items:
    get:
      operationId: listItems
      summary: List items
      responses:
        '200':
          description: Items found
          content:
            application/json:
              schema: { type: string }
              example: Found
`);
  const body = '\n## First topic\n\nRead this topic and [install Acme](doc:guide.install).\n\n## Second topic\n\nMore instructions.\n';
  const welcome = path.join(directory, 'content/welcome.mdx');
  await writeFile(welcome, (await readFile(welcome, 'utf8')) + body);
  for (const layout of ['wide', 'landing', 'splash']) await writeFile(path.join(directory, `content/${layout}.mdx`), `---\nid: ${layout}\ntitle: ${layout}\nsummary: Read the layout example.\nslug: /${layout}\nlayout: ${layout}\n---\n${body}`);
  const output = path.join(directory, 'site');
  const manifest = await compile(config, output, undefined, { apiReview: 'report' });
  const server = await createSiteServer(output);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise<void>(resolve => { server.closeAllConnections(); server.close(() => resolve()); }));
  const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const browser = await puppeteer.launch();
  t.after(() => browser.close());
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(String(error)));
  const active = () => page.evaluate(() => document.activeElement?.id);
  const jump = async (id: string) => {
    await page.focus(`.page-shortcuts a[href="#${id}"]`);
    await page.keyboard.press('Enter');
    assert.equal(await active(), id);
  };
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto(`${origin}/docs/`, { waitUntil: 'networkidle0' });
  assert.deepEqual(await page.$$eval('.layout > *', nodes => nodes.map(node => node.classList.contains('content') ? 'main' : node.classList.contains('page-rail') ? 'rail' : 'side')), ['main', 'rail', 'side']);
  assert.ok(await page.evaluate(() => document.querySelector('.side')!.getBoundingClientRect().right < document.querySelector('main')!.getBoundingClientRect().left));
  await jump('docs-navigation');
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement?.textContent), 'Back to article');
  await page.keyboard.press('Enter');
  assert.equal(await active(), 'main');
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement?.textContent), 'Read as Markdown');

  await page.setViewport({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => {
    const main = document.querySelector('main')!.getBoundingClientRect();
    const rail = document.querySelector('.page-rail')!.getBoundingClientRect();
    const side = document.querySelector('.side')!.getBoundingClientRect();
    return main.bottom <= rail.top && rail.bottom <= side.top && document.documentElement.scrollWidth <= innerWidth;
  }));
  await jump('docs-navigation');
  assert.equal(await page.$eval('.nav-disclosure', node => (node as HTMLDetailsElement).open), true);
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement?.tagName), 'SUMMARY');
  await page.keyboard.down('Shift'); await page.keyboard.press('Tab'); await page.keyboard.up('Shift');
  assert.ok(await page.evaluate(() => !document.activeElement?.closest('.side')), 'reverse traversal exits the navigation region');
  await jump('docs-navigation');
  await page.focus('#nav-filter');
  await page.keyboard.type('install');
  await page.keyboard.press('Escape');
  assert.equal(await page.$eval('#nav-filter', node => (node as HTMLInputElement).value), '');
  assert.equal(await active(), 'nav-filter');
  await page.keyboard.press('Escape');
  assert.equal(await page.$eval('.nav-disclosure', node => (node as HTMLDetailsElement).open), false);
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('href')), '#docs-navigation');
  await jump('page-outline');
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement?.textContent), 'On this page');
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('href')), '#page-outline');

  await page.setViewport({ width: 1440, height: 1000 });
  await page.waitForFunction(() => (document.querySelector('.nav-disclosure') as HTMLDetailsElement).open);
  await page.focus('#nav-filter');
  assert.equal(await active(), 'nav-filter');
  await page.setViewport({ width: 390, height: 844 });
  assert.equal(await active(), 'nav-filter');
  assert.equal(await page.$eval('.nav-disclosure', node => (node as HTMLDetailsElement).open), true, 'resize keeps focused descendants visible');

  await page.focus('.nav-disclosure > summary');
  await page.setViewport({ width: 1440, height: 1000 });
  assert.equal(await page.evaluate(() => document.activeElement === document.querySelector('.nav-disclosure > summary') && document.activeElement!.getBoundingClientRect().height > 0), true, 'focused mobile toggle remains visible on desktop');
  await page.setViewport({ width: 390, height: 844 });

  for (const doc of manifest.documents) {
    await page.goto(origin + doc.url, { waitUntil: 'domcontentloaded' });
    assert.ok(await page.evaluate(() => {
      const ids = [...document.querySelectorAll('[id]')].map(node => node.id);
      return new Set(ids).size === ids.length && [...document.querySelectorAll('.page-shortcuts a')].every(node => document.getElementById((node as HTMLAnchorElement).hash.slice(1))) && !document.querySelector('[tabindex]:not([tabindex="0"]):not([tabindex="-1"])');
    }), doc.id);
    if (['landing', 'splash'].includes(doc.id)) assert.equal(await page.$('.page-shortcuts'), null);
    if (doc.id === 'wide') assert.equal(await page.$('a[href="#page-outline"]'), null);
    assert.ok(await page.evaluate(() => !document.querySelector('.side') || !!(document.querySelector('main')!.compareDocumentPosition(document.querySelector('.side')!) & Node.DOCUMENT_POSITION_FOLLOWING)), doc.id);
  }
  assert.ok(manifest.documents.some(doc => doc.type === 'api-reference'));
  await page.setJavaScriptEnabled(false);
  await page.goto(`${origin}/docs/`, { waitUntil: 'networkidle0' });
  assert.equal(await page.$eval('.nav-disclosure', node => (node as HTMLDetailsElement).open), true);
  await jump('docs-navigation');
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement?.tagName), 'SUMMARY');
  await page.keyboard.press('Enter');
  assert.equal(await page.$eval('.nav-disclosure', node => (node as HTMLDetailsElement).open), false);
  await page.keyboard.press('Enter');
  await page.click('#docs-navigation .region-return');
  assert.equal(await active(), 'main');
  assert.deepEqual(errors, []);
});
