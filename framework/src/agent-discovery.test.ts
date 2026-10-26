import assert from 'node:assert/strict';
import test from 'node:test';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { resolveAgentDiscovery } from './agent-discovery.js';
import { compile } from './compiler.js';
import { serveSite } from './server.js';
import puppeteer from 'puppeteer';
import type { AddressInfo } from 'node:net';

test('agent discovery rejects invalid settings and empty link labels', () => {
  for (const config of [null, false, [], { mode: 'hidden' }, { mode: 1 },
    { label: '' }, { message: 42 }, { links: [] }, { links: { article: ' ' } },
    { links: { markdown: false } }, { links: { index: ' ' } }, { href: '/elsewhere' },
    { links: { destination: '/elsewhere' } }]) {
    assert.throws(() => resolveAgentDiscovery(config), /site\.agentDiscovery/);
  }
});

test('HTML agents can follow discovery links in every mode while keyboard users retain the skip link', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-agent-browser-'));
  const browser = await puppeteer.launch();
  try {
    await cp(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../example-configs/minimal'), directory, { recursive: true });
    const configFile = path.join(directory, 'docs.config.yaml');
    const config = YAML.parse(await readFile(configFile, 'utf8'));
    config.site.basePath = '/docs';
    const output = path.join(directory, 'site-dist');
    for (const mode of ['focus', 'visible', 'disclosure', 'off']) {
      config.site.agentDiscovery = { mode };
      await writeFile(configFile, YAML.stringify(config));
      await compile(configFile, output);
      const server = await serveSite(output, '127.0.0.1', 0);
      const page = await browser.newPage();
      try {
        const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
        const response = await page.goto(`${origin}/docs/`);
        assert.equal(response?.status(), 200);
        // Read the DOM without CSS visibility filtering, as an HTML-reading agent would.
        const discovery = await page.evaluate(() => {
          const block = document.querySelector('.agent-discovery');
          return {
            text: block?.textContent,
            width: block?.getBoundingClientRect().width,
            links: Array.from(block?.querySelectorAll('a') ?? [], link => link.getAttribute('href')),
            markdown: document.querySelector('link[rel="alternate"][type="text/markdown"]')?.getAttribute('href'),
            index: document.querySelector('link[rel="describedby"]')?.getAttribute('href'),
          };
        });
        if (mode === 'off') {
          assert.equal(discovery.text, undefined);
          assert.deepEqual(discovery.links, []);
        } else {
          assert.match(discovery.text ?? '', /For agents:?.*Skip to article.*Documentation index.*Markdown/);
          assert.deepEqual(discovery.links, ['#main', '/docs/llms.min.txt', '/docs/index.md']);
          assert.equal(discovery.width === 1, mode === 'focus');
        }
        // Follow actual generated URLs, including the metadata fallback when the block is off.
        const markdown = await fetch(new URL(discovery.markdown!, origin));
        assert.equal(markdown.status, 200);
        assert.match(markdown.headers.get('content-type') ?? '', /text\/markdown/);
        assert.match(markdown.headers.get('link') ?? '', /<\/docs>; rel="canonical"/);
        const markdownText = await markdown.text();
        assert.match(markdownText, /^# /m);
        assert.match(markdownText, /\/docs\/documents\.json/);
        assert.match(response?.headers().link ?? '', /rel="alternate"/);
        assert.equal(discovery.index, '/docs/llms.min.txt');
        assert.match(markdownText, /Documentation index: \[llms\.min\.txt\]\([^)]*\/docs\/llms\.min\.txt\)/);
        const index = await fetch(new URL(discovery.index!, origin));
        assert.equal(index.status, 200);
        assert.match(await index.text(), /\/docs\/index\.md/);
        if (mode === 'disclosure') {
          assert.equal(await page.$eval('.agent-discovery', block => (block as HTMLDetailsElement).open), false);
          await page.click('.agent-discovery summary');
          assert.equal(await page.$eval('.agent-discovery', block => (block as HTMLDetailsElement).open), true);
          await page.click('.agent-discovery a[href="#main"]');
          assert.equal(await page.evaluate(() => document.activeElement?.id), 'main');
          continue;
        }
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.activeElement?.textContent), 'Skip to content');
        if (mode !== 'off') {
          await page.keyboard.press('Tab');
          assert.equal(await page.evaluate(() => document.activeElement?.textContent), 'Skip to article');
          assert.ok(await page.$eval('.agent-discovery', block => block.getBoundingClientRect().width > 1));
        }
        await page.keyboard.press('Enter');
        assert.equal(await page.evaluate(() => document.activeElement?.id), 'main');
      } finally {
        await page.close();
        await new Promise<void>(resolve => server.close(() => resolve()));
      }
    }
  } finally {
    await browser.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test('agent blocks customize escaped text and mode while retaining generated links and the accessibility skip link', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-agent-discovery-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await cp(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../example-configs/minimal'), directory, { recursive: true });
  const configFile = path.join(directory, 'docs.config.yaml');
  const config = YAML.parse(await readFile(configFile, 'utf8'));
  config.site.basePath = '/docs';
  const output = path.join(directory, 'site-dist');
  const build = async () => {
    await writeFile(configFile, YAML.stringify(config));
    await compile(configFile, output);
    return readFile(path.join(output, 'docs/index.html'), 'utf8');
  };
  const original = await build();
  assert.match(original, /class="agent-discovery">For agents:/);
  const markdown = await readFile(path.join(output, 'docs/index.md'), 'utf8');
  config.site.agentDiscovery = { mode: 'visible', label: 'For tools & agents',
    message: '<script>example</script>',
    links: { article: 'Article', index: 'All docs', markdown: 'Plain text' } };
  const visible = await build();
  assert.match(visible, /class="agent-discovery agent-discovery-visible">For tools &amp; agents: &lt;script>example&lt;\/script>/);
  assert.match(visible, /href="#main">Article<\/a>/);
  assert.match(visible, /href="\/docs\/llms\.min\.txt">All docs<\/a>/);
  assert.match(visible, /href="\/docs\/index\.md">Plain text<\/a>/);
  assert.ok(visible.indexOf('class="skip"') < visible.indexOf('class="agent-discovery'));
  assert.ok(visible.indexOf('<main ') < visible.indexOf('<nav class="side"'));
  config.site.agentDiscovery.mode = 'off';
  const off = await build();
  assert.doesNotMatch(off, /class="agent-discovery/);
  assert.match(off, /<a class="skip" href="#main">Skip to content<\/a>/);
  assert.match(off, /rel="alternate" type="text\/markdown"/);
  assert.match(off, /rel="describedby" href="\/docs\/llms\.min\.txt"/);
  assert.equal(await readFile(path.join(output, 'docs/index.md'), 'utf8'), markdown);
  config.site.agentDiscovery = { mode: 'mistyped' };
  await assert.rejects(build, /site\.agentDiscovery\.mode/);
  assert.equal(await readFile(path.join(output, 'docs/index.html'), 'utf8'), off, 'invalid settings preserve the last successful build');
});
