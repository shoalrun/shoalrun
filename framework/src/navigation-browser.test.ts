import assert from 'node:assert/strict';
import test from 'node:test';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
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
  const body = '\n## First topic\n\nRead this topic and [install Acme](doc:guide.install).\n\n' + 'A paragraph of documentation that keeps the article long enough to check reading position.\n\n'.repeat(30) + '\n## Second topic\n\nMore instructions.\n';
  const welcome = path.join(directory, 'content/welcome.mdx');
  await writeFile(welcome, (await readFile(welcome, 'utf8')) + body);
  for (const layout of ['wide', 'landing', 'splash']) await writeFile(path.join(directory, `content/${layout}.mdx`), `---\nid: ${layout}\ntitle: ${layout}\nsummary: Read the layout example.\nslug: /${layout}\nlayout: ${layout}\n---\n${body}`);
  const extraPages = Array.from({ length: 30 }, (_, index) => `topic-${index}`);
  for (const id of extraPages) await writeFile(path.join(directory, `content/${id}.mdx`), `---\nid: ${id}\ntitle: A longer navigation label for ${id}\nsummary: Read this topic.\nslug: /${id}\n---\nA short topic.\n`);
  const source = await readFile(config, 'utf8');
  const apiConfig = source.slice(source.indexOf('\napis:'));
  await writeFile(config, source.slice(0, source.indexOf('\nnavigation:')) + `
navigation:
  - id: guides
    label: Guides
    tab: true
    landing: guide.welcome
    items:
      - { id: welcome, doc: guide.welcome }
      - { id: install, doc: guide.install }
${extraPages.map(id => `      - { id: ${id}, doc: ${id} }`).join('\n')}
  - id: reference
    label: API and reference
    tab: true
    landing: wide
    items:
      - { id: wide, doc: wide }
` + apiConfig);
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
  const screenshot = async (name: string) => {
    if (!process.env.SHOALRUN_NAVIGATION_SCREENSHOTS) return;
    await mkdir(process.env.SHOALRUN_NAVIGATION_SCREENSHOTS, { recursive: true });
    await page.screenshot({ path: path.join(process.env.SHOALRUN_NAVIGATION_SCREENSHOTS, `${name}.png`) });
  };
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto(`${origin}/docs/`, { waitUntil: 'networkidle0' });
  assert.deepEqual(await page.$$eval('.layout > *', nodes => nodes.map(node => node.classList.contains('content') ? 'main' : node.classList.contains('page-rail') ? 'rail' : 'side')), ['main', 'rail', 'side']);
  assert.ok(await page.evaluate(() => document.querySelector('.side')!.getBoundingClientRect().right < document.querySelector('main')!.getBoundingClientRect().left));
  const mainTop = await page.$eval('main', node => node.getBoundingClientRect().top);
  await page.focus('.page-shortcuts a');
  assert.equal(await page.$eval('main', node => node.getBoundingClientRect().top), mainTop, 'skip links never shift the layout');
  assert.ok(await page.$eval('.page-shortcuts a', node => node.getBoundingClientRect().left >= 0));
  await jump('docs-navigation');
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement?.textContent), 'Back to article');
  await page.keyboard.press('Enter');
  assert.equal(await active(), 'main');
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => !!document.activeElement?.closest('main')), true, 'returning to the article resumes its keyboard order');
  await page.goto(`${origin}/docs/`, { waitUntil: 'networkidle0' });
  await screenshot('desktop');

  await page.setViewport({ width: 390, height: 844 });
  await page.waitForFunction(() => !!document.querySelector('.mobile-outline-slot .page-toc'));
  assert.equal(await page.$eval('.toc-disclosure', node => (node as HTMLDetailsElement).open), false);
  assert.ok(await page.$eval('.mobile-menu', node => node.getBoundingClientRect().height >= 44));
  assert.equal(await page.$$eval('dialog .section-nav, dialog .side', nodes => nodes.length), 2, 'section choices and page tree share one Menu');
  assert.equal(await page.$('header + .section-nav'), null);
  assert.ok(await page.evaluate(() => {
    const outline = document.querySelector('.page-toc')!.getBoundingClientRect();
    const article = document.querySelector('main article')!.getBoundingClientRect();
    return outline.bottom <= article.top && document.documentElement.scrollWidth <= innerWidth;
  }));
  await page.goto(`${origin}/docs/`, { waitUntil: 'networkidle0' });
  await screenshot('mobile');
  // Opening via a keyboard shortcut mid-article must not discard reading position.
  await page.evaluate(() => scrollTo(0, 550));
  const readingY = await page.evaluate(() => scrollY);
  await page.evaluate(() => (document.querySelector('.mobile-menu') as HTMLElement).focus({ preventScroll: true }));
  await page.keyboard.press('Enter');
  await page.waitForSelector('dialog[open]');
  assert.equal(await page.evaluate(() => scrollY), readingY);
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'Close navigation');
  await page.keyboard.down('Shift'); await page.keyboard.press('Tab'); await page.keyboard.up('Shift');
  assert.equal(await page.evaluate(() => !!document.activeElement?.closest('dialog')), true, 'reverse Tab stays inside the modal');
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => !!document.activeElement?.closest('dialog')), true);
  await screenshot('mobile-menu');
  await page.focus('#nav-filter');
  await page.keyboard.type('install');
  assert.equal(await page.$$eval('.nav-entry:not([hidden])', nodes => nodes.length), 1);
  await page.keyboard.press('Escape');
  assert.equal(await page.$eval('#nav-filter', node => (node as HTMLInputElement).value), '');
  assert.equal(await page.$eval('dialog', node => (node as HTMLDialogElement).open), true);
  await page.keyboard.press('Escape');
  assert.equal(await page.$eval('dialog', node => (node as HTMLDialogElement).open), false);
  assert.equal(await page.evaluate(() => document.activeElement?.className), 'mobile-menu');
  assert.equal(await page.evaluate(() => scrollY), readingY);
  assert.equal(await page.$eval('html', node => node.classList.contains('navigation-open')), false);
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => !!document.activeElement?.closest('dialog')), false, 'closed navigation is absent from Tab order');

  await page.evaluate(() => scrollTo(0, 0));
  await page.click('.mobile-menu');
  await page.click('button[aria-label="Close navigation"]');
  assert.equal(await page.evaluate(() => document.activeElement?.className), 'mobile-menu');
  await page.click('.mobile-menu');
  await page.mouse.click(385, 400);
  assert.equal(await page.$eval('dialog', node => (node as HTMLDialogElement).open), false, 'backdrop closes the drawer');

  await page.click('.toc-disclosure summary');
  await page.click('.toc-disclosure li:last-child a');
  assert.equal(await active(), 'second-topic');
  assert.equal(await page.$eval('.toc-disclosure', node => (node as HTMLDetailsElement).open), false);
  assert.ok(await page.$eval('#second-topic', node => node.getBoundingClientRect().top < innerHeight));
  await page.evaluate(() => scrollTo(0, 0));
  await page.click('.toc-disclosure summary');
  await page.keyboard.press('Escape');
  assert.equal(await page.$eval('.toc-disclosure', node => (node as HTMLDetailsElement).open), false);

  // Resize an open drawer with focus in its filter, then shrink again.
  await page.click('.mobile-menu');
  await page.focus('#nav-filter');
  await page.setViewport({ width: 1440, height: 1000 });
  await page.waitForFunction(() => !!document.querySelector('.layout > .side'));
  assert.equal(await active(), 'nav-filter');
  assert.equal(await page.$eval('dialog', node => (node as HTMLDialogElement).open), false);
  assert.equal(await page.$eval('html', node => node.classList.contains('navigation-open')), false);
  assert.ok(await page.$eval('.section-nav', node => !node.closest('dialog')));
  await page.setViewport({ width: 390, height: 844 });
  await page.waitForSelector('dialog[open]');
  assert.equal(await active(), 'nav-filter', 'shrinking preserves focused navigation inside the open drawer');
  await page.focus('button[aria-label="Close navigation"]');
  await page.setViewport({ width: 1440, height: 1000 });
  await page.waitForFunction(() => !!document.querySelector('.layout > .side'));
  assert.equal(await active(), 'docs-navigation', 'desktop resize never leaves focus in a hidden dialog');
  await jump('page-outline');
  await page.setViewport({ width: 320, height: 640 });
  await page.waitForFunction(() => !!document.querySelector('.mobile-outline-slot .page-toc'));
  assert.equal(await active(), 'page-outline');
  assert.equal(await page.$eval('.toc-disclosure', node => (node as HTMLDetailsElement).open), true);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.click('.mobile-menu');
  assert.ok(await page.$eval('dialog', node => node.scrollWidth <= node.clientWidth), 'long labels fit narrow screens');
  await page.keyboard.press('Escape');

  for (const doc of manifest.documents.filter(doc => !doc.id.startsWith('topic-'))) {
    const raw = await readFile(path.join(output, doc.url.replace(/^\//, ''), 'index.html'), 'utf8');
    if (raw.includes('id="docs-navigation"')) assert.ok(raw.indexOf('<main ') < raw.indexOf('id="docs-navigation"'), doc.id);
    await page.goto(origin + doc.url, { waitUntil: 'networkidle0' });
    assert.ok(await page.evaluate(() => {
      const ids = [...document.querySelectorAll('[id]')].map(node => node.id);
      return new Set(ids).size === ids.length && [...document.querySelectorAll('.page-shortcuts a')].every(node => document.getElementById((node as HTMLAnchorElement).hash.slice(1))) && !document.querySelector('[tabindex]:not([tabindex="0"]):not([tabindex="-1"])');
    }), doc.id);
    if (['landing', 'splash'].includes(doc.id)) assert.equal(await page.$('.mobile-menu'), null);
    if (doc.id === 'wide' || doc.id === 'guide.install') assert.equal(await page.$('.page-toc'), null);
  }
  assert.ok(manifest.documents.some(doc => doc.type === 'api-reference'));
  await page.setJavaScriptEnabled(false);
  await page.goto(`${origin}/docs/`, { waitUntil: 'networkidle0' });
  assert.equal(await page.$('dialog'), null);
  await page.click('.mobile-menu');
  assert.equal(await active(), 'docs-navigation');
  assert.equal(await page.$eval('.nav-disclosure', node => (node as HTMLDetailsElement).open), true);
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement?.tagName), 'SUMMARY');
  await page.keyboard.press('Enter');
  assert.equal(await page.$eval('.nav-disclosure', node => (node as HTMLDetailsElement).open), false);
  await page.keyboard.press('Enter');
  await page.focus('#docs-navigation .region-return');
  await page.keyboard.press('Enter');
  assert.equal(await active(), 'main');
  await jump('page-outline');
  assert.deepEqual(errors, []);
});
