import assert from 'node:assert/strict';
import test from 'node:test';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AddressInfo } from 'node:net';
import puppeteer from 'puppeteer';
import YAML from 'yaml';
import { compile } from './compiler.js';
import { serveSite } from './server.js';
import { parse, transformMdx } from './content.js';

const pair = (label: string, sync = '', second = 'Python', value = 'py') => `<Tabs label="${label}" ${sync ? `sync="${sync}"` : ''}>\n<Tab label="JavaScript" value="js">\n${label} JavaScript content.\n</Tab>\n<Tab label="${second}" value="${value}">\n${label} ${second} content.\n</Tab>\n</Tabs>`;

test('component controls preserve output, synchronize only matching groups, and work with keyboard and fallback', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-component-controls-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await cp(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../example-configs/minimal'), directory, { recursive: true });
  const configFile = path.join(directory, 'docs.config.yaml');
  const config = YAML.parse(await readFile(configFile, 'utf8'));
  config.site.basePath = '/docs';
  await writeFile(configFile, YAML.stringify(config));
  await writeFile(path.join(directory, 'content/example.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="480"><rect width="960" height="480" fill="green"/></svg>');
  const header = '---\nid: guide.welcome\ntitle: Component controls\nsummary: Exercise native and enhanced controls.\nslug: /\n---\n\n';
  const body = `<FileTree controls>\n<Folder name="project">\n<File name="README.md" />\n<Folder name="content" collapsed>\n<File name="guide.mdx" href="/docs/install" />\n</Folder>\n</Folder>\n</FileTree>\n\n<CollapsibleGroup>\n<Collapsible title="First detail">\nFirst complete body.\n</Collapsible>\n<Collapsible title="Second detail">\nSecond complete body.\n</Collapsible>\n</CollapsibleGroup>\n\n${pair('Install', 'language')}\n\n${pair('Use', 'language')}\n\n${pair('Other choices', 'language', 'Go', 'go')}\n\n${pair('Independent')}\n\n<Image src="./example.svg" alt="A green illustration" caption="Full image caption." expand />\n`;
  await writeFile(path.join(directory, 'content/welcome.mdx'), header + body);
  const output = path.join(directory, 'site');
  await compile(configFile, output);
  const markdown = await readFile(path.join(output, 'docs/index.md'), 'utf8');
  for (const value of ['README.md', 'guide.mdx', 'First complete body.', 'Second complete body.', 'Install Python content.', 'Use JavaScript content.', 'Other choices Go content.', 'Independent Python content.', 'Full image caption.', 'View original image']) assert.ok(markdown.includes(value), `Markdown retains ${value}`);
  assert.doesNotMatch(markdown, /Expand all|Collapse all|<CollapsibleGroup|<Tabs|<Image/);
  assert.match(markdown, /!\[A green illustration\]\(\/docs\/assets\/pages\/docs\/example.svg\)/);
  const server = await serveSite(output, '127.0.0.1', 0);
  const browser = await puppeteer.launch();
  t.after(async () => { await browser.close(); await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); });
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.goto(origin + '/docs/');
  await page.waitForSelector('.doc-tabs.is-enhanced');
  const selected = () => page.$$eval('.doc-tabs', roots => roots.map(root => root.querySelector('[aria-selected="true"]')?.textContent));
  const tabRoots = await page.$$('.doc-tabs');
  await (await tabRoots[0].$('[data-tab-value="py"]'))!.click();
  assert.deepEqual(await selected(), ['Python', 'Python', 'JavaScript', 'JavaScript']);
  const firstPython = await page.$('.doc-tabs [data-tab-value="py"]');
  await firstPython!.focus();
  await page.keyboard.press('ArrowLeft');
  assert.deepEqual(await selected(), ['JavaScript', 'JavaScript', 'JavaScript', 'JavaScript']);
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-tab-value')), 'js');
  await (await tabRoots[3].$('[data-tab-value="py"]'))!.click();
  assert.deepEqual(await selected(), ['JavaScript', 'JavaScript', 'JavaScript', 'Python']);
  const branches = await page.$$('.file-tree-branch');
  assert.equal(await branches[1].evaluate(node => (node as HTMLDetailsElement).open), false);
  const childSummary = await branches[1].$('summary');
  await childSummary!.focus(); await page.keyboard.press('ArrowRight');
  assert.equal(await branches[1].evaluate(node => (node as HTMLDetailsElement).open), true);
  await page.keyboard.press('ArrowLeft');
  assert.equal(await branches[1].evaluate(node => (node as HTMLDetailsElement).open), false);
  await page.keyboard.press('*');
  assert.equal(await branches[1].evaluate(node => (node as HTMLDetailsElement).open), true);
  await page.keyboard.press('r');
  assert.equal(await page.evaluate(() => document.activeElement?.textContent?.trim()), 'README.md');
  await page.keyboard.press('End');
  assert.equal(await page.evaluate(() => document.activeElement?.textContent?.trim()), 'guide.mdx');
  await page.click('[data-tree-expand]');
  assert.ok(await page.$$eval('.file-tree-branch', nodes => nodes.every(node => (node as HTMLDetailsElement).open)));
  await page.click('[data-tree-collapse]');
  assert.ok(await page.$$eval('.file-tree-branch', nodes => nodes.every(node => !(node as HTMLDetailsElement).open)));
  const summaries = await page.$$('.doc-collapsible-group > details > summary');
  await summaries[0].click(); await summaries[1].click();
  assert.equal(await page.$$eval('.doc-collapsible-group > details[open]', nodes => nodes.length), 2);
  assert.equal(await page.$eval('.doc-collapsible-group', node => { const [a,b] = node.children; return Math.round(b.getBoundingClientRect().top - a.getBoundingClientRect().bottom); }), 0);
  await page.click('[data-image-expand]');
  assert.ok(await page.$eval('dialog', node => (node as HTMLDialogElement).open));
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'Close image');
  await page.keyboard.press('Escape');
  assert.equal(await page.$eval('dialog', node => (node as HTMLDialogElement).open), false);
  assert.equal(await page.evaluate(() => document.activeElement?.hasAttribute('data-image-expand')), true);
  await page.setJavaScriptEnabled(false); await page.reload();
  assert.equal(await page.$$eval('.doc-tabpanel', nodes => nodes.filter(node => !(node as HTMLElement).hidden).length), 8);
  assert.equal(await page.$eval('[data-image-expand]', node => node.getAttribute('href')), '/docs/assets/pages/docs/example.svg');
  assert.equal(await page.$eval('.file-tree-controls', node => (node as HTMLElement).hidden), true);
  assert.equal(await page.$$eval('.file-tree-branch > summary', nodes => nodes.length), 2);
  assert.deepEqual(errors, []);
});

test('new component options reject ambiguous attributes and unsupported group children', () => {
  const page: any = { file: 'content/guide.mdx', frontmatter: { id: 'guide.example' }, variant: { channel: 'production', version: 'current', language: 'en' }, route: '/' };
  for (const [source, error] of [
    ['<CollapsibleGroup>\nText.\n</CollapsibleGroup>', /needs direct <Collapsible>/],
    ['<CollapsibleGroup single>\n<Collapsible title="One">\nBody.\n</Collapsible>\n</CollapsibleGroup>', /needs direct <Collapsible>/],
    ['<FileTree>\n<File name="x" collapsed />\n</FileTree>', /unsupported or duplicate attribute/],
    ['<FileTree controls="yes">\n<File name="x" />\n</FileTree>', /bare controls/],
    [pair('Invalid', 'bad name'), /sync needs a group name/],
    [pair('Duplicate', '', 'Another', 'js'), /unique tab values/],
    ['<Image src="https://example.test/a.png" />', /literal src\/alt/],
    ['<Image src="https://example.test/a.png" alt="Example" expand="yes" />', /bare expand/],
    ['<Image src="https://example.test/a.png" alt="Example" width="0" />', /width must be a positive/],
  ] as const) assert.throws(() => transformMdx(parse.parse(source), page, new Map()), error);
});
