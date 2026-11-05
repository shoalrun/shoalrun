import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import puppeteer from 'puppeteer';
import { compile } from './compiler.js';
import { createSiteServer } from './server.js';

test('availability labels share the release-version style and wrap beside dates on narrow screens and remain readable in both color modes', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-availability-browser-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(path.join(directory, 'content'));
  await writeFile(path.join(directory, 'content/support.mdx'), `---
id: support
title: Feature availability
summary: Version support for this feature.
slug: /support
updated: 2026-11-04
verified: 2026-11-04
availability: { since: 0.1.0-alpha.13, through: 0.1.0-alpha.18 }
---
These example boundaries show the first and last supported versions.
`);
  const file = path.join(directory, 'docs.config.yaml');
  await writeFile(file, JSON.stringify({
    schemaVersion: 1, site: { title: 'Shoalrun' }, theme: { mode: 'system' },
    frontmatter: { defaults: { type: 'guide', summary: 'Support', channel: 'production', version: 'current', access: { policy: 'public' } } },
    publications: { defaults: { channel: 'production', version: 'current', language: 'en' }, channels: { production: {} }, versions: { current: {} }, enabled: [{ channel: 'production', version: 'current' }] },
    outputs: { html: { highlighting: { provider: 'none' } } },
  }));
  const output = path.join(directory, 'site');
  await compile(file, output);
  const server = await createSiteServer(output);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise<void>(resolve => { server.closeAllConnections(); server.close(() => resolve()); }));
  const browser = await puppeteer.launch();
  t.after(() => browser.close());
  const page = await browser.newPage();
  const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  // Keep temporary visual evidence for review; it is never part of the package.
  const screenshots = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-availability-visual-'));
  t.diagnostic(`Availability visual evidence: ${screenshots}`);
  for (const mode of ['light', 'dark']) {
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: mode }]);
    for (const width of [1280, 375]) {
      await page.setViewport({ width, height: 850 });
      await page.goto(`${origin}/support`, { waitUntil: 'networkidle0' });
      const layout = await page.evaluate(() => {
        const row = document.querySelector('.page-meta')!;
        const labels = [...document.querySelectorAll<HTMLElement>('.page-version[data-availability]')];
        return {
          dateStyle: { font: getComputedStyle(document.querySelector('.page-date')!).fontFamily, fontSize: getComputedStyle(document.querySelector('.page-date')!).fontSize, color: getComputedStyle(document.querySelector('.page-date')!).color },
          colorScheme: getComputedStyle(document.documentElement).colorScheme,
          display: getComputedStyle(row).display,
          wraps: getComputedStyle(row).flexWrap,
          pageFits: document.documentElement.scrollWidth <= window.innerWidth,
          labels: labels.map(label => ({ text: label.textContent, fits: label.getBoundingClientRect().right <= window.innerWidth, font: getComputedStyle(label).fontFamily, fontSize: getComputedStyle(label).fontSize, border: getComputedStyle(label).borderWidth, color: getComputedStyle(label).color, background: getComputedStyle(label).backgroundColor })),
        };
      });
      assert.equal(layout.colorScheme, mode);
      assert.equal(layout.display, 'flex');
      assert.equal(layout.wraps, 'wrap');
      assert.equal(layout.pageFits, true);
      assert.deepEqual(layout.labels.map(label => label.text), ['Since 0.1.0-alpha.13', 'Through 0.1.0-alpha.18']);
      for (const label of layout.labels) {
        assert.equal(label.fits, true);
        assert.equal(label.border, '0px');
        assert.equal(label.font, layout.dateStyle.font);
        assert.equal(label.fontSize, layout.dateStyle.fontSize);
        assert.equal(label.color, layout.dateStyle.color);
        assert.equal(label.background, 'rgba(0, 0, 0, 0)');
        assert.notEqual(label.color, label.background);
      }
      await page.screenshot({ path: path.join(screenshots, `${mode}-${width}.png`) });
    }
  }
});
