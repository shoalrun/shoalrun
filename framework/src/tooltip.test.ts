import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { compile } from './compiler.js';
import { serveSite } from './server.js';
import { parse, transformMdx, renderMarkdown, renderHtml } from './content.js';
import { publicTree } from './representation-tree.js';

const page: any = { file: '/tmp/tooltip.mdx', route: '/tooltip', frontmatter: { id: 'tooltip' }, variant: {} };
const source = 'Compare the <Tooltip label="build digest">A content fingerprint.</Tooltip> before refreshing.';
const lower = (value: string) => transformMdx(parse.parse(value), page, new Map());

test('tooltips support inline and block text, while short definitions retain native disclosures', () => {
  const tree = lower(source + '\n\n<InfoHint label="Canonical URL">\nThe preferred page address.\n</InfoHint>');
  const markdown = renderMarkdown(publicTree(tree, 'markdown', new Set()));
  const html = renderHtml(publicTree(tree, 'html', new Set()));
  assert.match(markdown, /Compare the build digest \(A content fingerprint\.\) before refreshing\./);
  assert.match(markdown, /Canonical URL: The preferred page address\./);
  assert.match(html, /data-tooltip/);
  assert.match(html, /<details class="doc-info-hint">/);
  assert.doesNotMatch(html, /aria-describedby|role="tooltip"/); // Added with the working trigger during enhancement.
  assert.match(renderMarkdown(publicTree(lower('<Tooltip label="Digest">\nA fingerprint.\n</Tooltip>'), 'markdown', new Set())), /Digest: A fingerprint\./);
  for (const invalid of ['<Tooltip>Text</Tooltip>', '<Tooltip label="">Text</Tooltip>', '<Tooltip label="Term" extra="x">Text</Tooltip>', '<Tooltip label={name}>Text</Tooltip>', '<Tooltip label="Term">[Link](https://example.com)</Tooltip>', '<Tooltip label="Term">**Rich** text</Tooltip>', '<Tooltip label="Term">\nFirst.\n\nSecond.\n</Tooltip>']) assert.throws(() => lower(invalid), /literal label|plain-text definition/);
});

test('tooltips open on focus and hover, remain hoverable, dismiss, support touch, and preserve no-script content', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-tooltip-'));
  let server: Awaited<ReturnType<typeof serveSite>> | undefined;
  let browser: import('puppeteer').Browser | undefined;
  try {
    await cp(new URL('../example-configs/minimal/', import.meta.url), directory, { recursive: true });
    await writeFile(path.join(directory, 'content/tooltip.mdx'), `---\nid: tooltip\ntitle: Tooltip checks\nsummary: Test tooltip interactions.\ntype: reference\nslug: /tooltip\naccess: { policy: public }\n---\n\n${source}\n\n<Tooltip label="build digest">\nA second explanation.\n</Tooltip>\n`);
    const output = path.join(directory, '.shoalrun/site');
    await compile(path.join(directory, 'docs.config.yaml'), output);
    assert.match(await readFile(path.join(output, 'tooltip/index.html'), 'utf8'), /src="\/assets\/tooltips.js"/);
    const markdown = await readFile(path.join(output, 'tooltip.md'), 'utf8');
    assert.match(markdown, /A content fingerprint/);
    assert.match(markdown, /A second explanation/);
    server = await serveSite(output, '127.0.0.1', 0);
    const origin = `http://127.0.0.1:${(server.address() as any).port}`;
    browser = await (await import('puppeteer')).default.launch();
    const page = await browser.newPage();
    const errors: string[] = []; page.on('pageerror', error => errors.push(String(error)));
    await page.goto(origin + '/tooltip');
    await page.waitForSelector('button.doc-tooltip-trigger');
    const trigger = (await page.$('button.doc-tooltip-trigger'))!;
    const id = await trigger.evaluate(node => node.getAttribute('aria-describedby'));
    assert.equal(await page.$$eval('[role="tooltip"]', nodes => new Set(nodes.map(node => node.id)).size), 2);
    await trigger.focus();
    await page.waitForSelector(`#${id}`, { visible: true });
    await page.keyboard.press('Escape');
    assert.equal(await page.$eval(`#${id}`, node => (node as HTMLElement).hidden), true);
    assert.equal(await trigger.evaluate(node => node === document.activeElement), true);
    await trigger.evaluate(node => (node as HTMLElement).blur());
    await page.mouse.move(0, 0); await trigger.hover();
    await page.waitForSelector(`#${id}`, { visible: true });
    await page.hover(`#${id}`);
    await new Promise(resolve => setTimeout(resolve, 180));
    assert.equal(await page.$eval(`#${id}`, node => (node as HTMLElement).hidden), false);
    await page.mouse.move(0, 0);
    await page.waitForSelector(`#${id}`, { hidden: true });
    await trigger.focus(); await page.keyboard.press('Tab');
    await page.waitForSelector(`#${id}`, { hidden: true });
    await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
    await page.reload(); await page.waitForSelector('button.doc-tooltip-trigger');
    const selector = 'button.doc-tooltip-trigger';
    const touchId = await page.$eval(selector, node => node.getAttribute('aria-describedby'));
    await page.tap(selector); await page.waitForSelector(`#${touchId}`, { visible: true });
    await page.tap(selector); await page.waitForSelector(`#${touchId}`, { hidden: true });
    await page.tap(selector); await page.waitForSelector(`#${touchId}`, { visible: true });
    await page.touchscreen.tap(5, 5); await page.waitForSelector(`#${touchId}`, { hidden: true });
    await page.$eval('[data-tooltip]', node => { (node as HTMLElement).style.cssText = 'position:fixed;right:0;bottom:0'; });
    await page.focus(selector);
    const box = await page.$eval(`#${touchId}`, node => { const r = node.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; });
    assert.ok(box.left >= 0 && box.right <= 375 && box.top >= 0 && box.bottom <= 812, JSON.stringify(box));
    await page.setJavaScriptEnabled(false); await page.reload();
    assert.equal(await page.$$('button.doc-tooltip-trigger').then(nodes => nodes.length), 0);
    assert.match(await page.$eval('article', node => node.textContent ?? ''), /build digest: A content fingerprint/);
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close();
    if (server) await new Promise<void>(resolve => server!.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
  }
});
