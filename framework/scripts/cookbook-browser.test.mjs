import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import { compile } from '../dist/compiler.js';
import { serveSite } from '../dist/server.js';

const fixture = fileURLToPath(new URL('../example-configs/notifications/docs.config.yaml', import.meta.url));
test('cookbook choices preserve selection, export instructions, print, and support accessible code copying', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-cookbook-browser-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await compile(fixture, directory);
  const server = await serveSite(directory, '127.0.0.1', 0);
  t.after(() => new Promise(resolve => server.close(resolve)));
  const browser = await puppeteer.launch({ headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async value => { window.copied = value; } } });
    URL.createObjectURL = blob => { window.downloaded = blob.text(); return 'blob:preview'; };
    HTMLAnchorElement.prototype.click = function () { window.savedFilename = this.download; };
    window.print = () => { window.printed = document.querySelector('.cookbook-print-sheet')?.textContent; window.dispatchEvent(new Event('afterprint')); };
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  await page.goto(`${origin}/cookbooks/welcome-email?keep=1`);
  await page.waitForSelector('.cookbook-chooser-controls:not([hidden])');
  await page.focus('input[value="accepted"]');
  await page.keyboard.press('ArrowDown');
  await page.waitForSelector('.cookbook-assembled-recipe .code-copy');
  assert.equal(await page.$eval('input[value="delivered"]', input => input.checked), true);
  assert.equal(await page.$eval('input[value="accepted"]', input => input.checked), false);
  assert.match(await page.$eval('.cookbook-chooser-result', result => result.textContent), /Use MESSAGE_ID from Queue the welcome email/);
  const shared = await page.$eval('.cookbook-share', link => link.href);
  assert.equal(new URL(shared).searchParams.get('keep'), '1');
  assert.equal(new URL(shared).searchParams.get('cookbook.welcome-email.0'), 'delivered');
  await page.click('.cookbook-chooser-result .code-copy');
  assert.match(await page.evaluate(() => window.copied), /--request POST/);
  await page.click('.cookbook-download');
  await page.waitForFunction(() => window.savedFilename);
  assert.match(await page.evaluate(() => window.downloaded), /MESSAGE_ID/);
  assert.equal(await page.evaluate(() => window.savedFilename), 'welcome-email-delivered.md');
  await page.click('.cookbook-print');
  assert.match(await page.evaluate(() => window.printed), /Check delivery for that message/);
  assert.equal(await page.$('.cookbook-print-sheet'), null);
  await page.goto(shared);
  await page.waitForSelector('.cookbook-assembled-recipe .code-copy');
  assert.equal(await page.$eval('input[value="delivered"]', input => input.checked), true);
  const axe = await readFile(new URL('../node_modules/axe-core/axe.min.js', import.meta.url), 'utf8');
  await page.addScriptTag({ content: axe });
  for (const mode of ['light', 'dark']) {
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: mode }]);
    const violations = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations.map(item => `${item.id}: ${item.nodes.map(node => node.target).join(', ')}`));
    assert.deepEqual(violations, [], mode);
  }
  await page.setViewport({ width: 320, height: 900 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= 320), true);
  if (process.env.SHOALRUN_COOKBOOK_SCREENSHOT) {
    await page.setViewport({ width: 1200, height: 1000 });
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
    await page.screenshot({ path: process.env.SHOALRUN_COOKBOOK_SCREENSHOT, fullPage: true });
  }
  assert.deepEqual(errors, []);
});
