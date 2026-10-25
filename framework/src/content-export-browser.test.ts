import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, mkdir, symlink, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import { exportContent } from './content-export.js';

test('a plain help drawer loads relocated fragments, images and links from an unrelated app route', async t => {
  const framework = fileURLToPath(new URL('..', import.meta.url));
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-help-app-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(path.join(framework, 'examples/help-drawer'), root, { recursive: true });
  await mkdir(path.join(root, 'node_modules/@shoalrun'), { recursive: true });
  await symlink(framework, path.join(root, 'node_modules/@shoalrun/cli'));
  const output = path.join(root, 'public/help');
  await exportContent(path.join(root, 'docs.config.yaml'), output, { target: 'app-help' });
  const server = createServer(async (request, response) => {
    const pathname = new URL(request.url!, 'http://localhost').pathname;
    const file = pathname.startsWith('/help/') ? path.join(output, pathname.slice('/help/'.length)) : pathname === '/app.js' ? path.join(root, 'app.js') : path.join(root, 'index.html');
    try {
      const types: Record<string, string> = { '.json': 'application/json', '.js': 'text/javascript', '.html': 'text/html', '.svg': 'image/svg+xml' };
      response.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'text/plain' }); response.end(await readFile(file));
    } catch { response.writeHead(404); response.end(); }
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise<void>(resolve => { server.closeAllConnections(); server.close(() => resolve()); }));
  const browser = await puppeteer.launch(); t.after(() => browser.close());
  const page = await browser.newPage();
  const appUrl = `http://127.0.0.1:${(server.address() as any).port}/settings/account`;
  await page.goto(appUrl, { waitUntil: 'networkidle0' });
  await page.click('[data-help="guide.keys"]');
  await page.waitForFunction(() => document.querySelector('#content h1')?.textContent === 'API keys');
  await page.waitForFunction(() => [...document.querySelectorAll('#content img')].length === 2 && [...document.querySelectorAll('#content img')].every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0));
  assert.match(await page.$eval('#content', element => element.textContent!), /Developers/);
  assert.match(await page.$eval('#content', element => element.textContent!), /Operators/);
  const billing = await page.$('#content a[data-export-link]'); assert.ok(billing); await billing.click();
  await page.waitForFunction(() => document.querySelector('#content h1')?.textContent === 'Billing');
  assert.equal(page.url(), appUrl, 'Internal help navigation stays inside the host app');
  assert.match(await page.$eval('#content', element => element.textContent!), /Read the total/);
  assert.match(await page.$eval('#content', element => element.textContent!), /Compare the allowance/);
  await page.click('#content a[data-export-link]');
  await page.waitForFunction(() => document.querySelector('#content h1')?.textContent === 'API keys');
  assert.equal(await page.$eval('#content a[href="https://docs.example.com/account"]', element => element.textContent), 'Full account guide');
  assert.equal(await page.$$eval('#content script, #content [data-component-module]', elements => elements.length), 0);
  const duplicates = await page.$$eval('[id]', elements => elements.map(element => element.id).filter((id, index, ids) => ids.indexOf(id) !== index));
  assert.deepEqual(duplicates, []);
});
