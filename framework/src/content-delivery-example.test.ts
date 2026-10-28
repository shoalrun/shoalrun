import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, rm, symlink } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer';

test('content delivery example serves its public client and mounts page, section, and repeated snippet resources', async t => {
  const framework = process.env.SHOALRUN_TEST_PACKAGE ?? fileURLToPath(new URL('..', import.meta.url));
  const { exportContent } = await import(pathToFileURL(path.join(framework, 'dist/content-export.js')).href);
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-delivery-example-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(path.join(framework, 'examples/content-delivery'), root, { recursive: true });
  await mkdir(path.join(root, 'node_modules/@shoalrun'), { recursive: true });
  await symlink(framework, path.join(root, 'node_modules/@shoalrun/cli'));
  await exportContent(path.join(root, 'docs.config.yaml'), path.join(root, 'public/help/releases/demo'), { target: 'app-help' });
  const child = spawn(process.execPath, [path.join(root, 'preview.mjs'), '--port', '0'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(async () => { if (child.pid && child.exitCode === null && child.signalCode === null) { const closed = once(child, 'exit'); child.kill('SIGTERM'); await closed; } });
  const url = await new Promise<string>((resolve, reject) => {
    let output = '', error = '';
    const timeout = setTimeout(() => reject(new Error(`Example preview did not start: ${error}`)), 10_000);
    child.stderr.on('data', chunk => { error += chunk; });
    child.once('error', reason => { clearTimeout(timeout); reject(reason); });
    child.once('exit', code => { clearTimeout(timeout); reject(new Error(`Example preview exited ${code}: ${error}`)); });
    child.stdout.on('data', chunk => {
      output += chunk;
      const match = /http:\/\/127\.0\.0\.1:\d+\/settings\/billing/.exec(output);
      if (match) { clearTimeout(timeout); resolve(match[0]); }
    });
  });
  const origin = new URL(url).origin;
  assert.equal((await fetch(origin + '/shoalrun/content-delivery.js')).status, 200);
  for (const route of ['/node_modules/@shoalrun/cli/package.json', '/shoalrun/cli.js', '/docs.config.yaml']) assert.equal((await fetch(origin + route)).status, 404);
  const browser = await puppeteer.launch(); t.after(() => browser.close());
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(String(error)));
  for (const delivery of ['static', 'rest']) {
  const viewUrl = delivery === 'rest' ? url + '?delivery=rest' : url;
  await page.goto(viewUrl, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => ['plan-note', 'invoice-note'].every(id => document.getElementById(id)?.textContent?.includes('30 days')));
  assert.deepEqual(await page.$$eval('[id]', nodes => nodes.map(node => node.id).filter((id, index, ids) => ids.indexOf(id) !== index)), []);
  assert.equal(await page.evaluate(() => ['plan-note', 'invoice-note'].every(id => {
    const container = document.getElementById(id)!;
    return [...container.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')].every(link => {
      const target = document.getElementById(decodeURIComponent(link.hash.slice(1)));
      return target !== null && container.contains(target);
    });
  })), true, 'each snippet instance owns its footnote references and backreferences');
  await page.click('#page-help');
  await page.waitForFunction(() => document.querySelector('#help-content h1')?.textContent === 'Billing help');
  assert.match(await page.$eval('#help-content', node => node.textContent!), /Find an invoice/);
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'page-help');
  await page.click('#section-help');
  await page.waitForFunction(() => document.querySelector('#help-content')?.textContent?.includes('Request a refund'));
  assert.doesNotMatch(await page.$eval('#help-content', node => node.textContent!), /Find an invoice|Use this guide/);
  const overview = await page.$('#help-content a[data-export-link]'); assert.ok(overview); await overview.click();
  await page.waitForFunction(() => document.querySelector('#help-content h1')?.textContent === 'Billing help');
  assert.equal(page.url(), viewUrl);
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'section-help');
  assert.deepEqual(await page.$$eval('[id]', nodes => nodes.map(node => node.id).filter((id, index, ids) => ids.indexOf(id) !== index)), []);
  }
  assert.deepEqual(errors, []);
});
