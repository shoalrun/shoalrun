import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import puppeteer from 'puppeteer';
import { compile } from '../dist/compiler.js';
import { serveSite } from '../dist/server.js';

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-analytics-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'content'));
  await mkdir(path.join(root, 'config'));
  const config = {
    schemaVersion: 1, site: { title: 'Analytics fixture', origin: 'https://docs.example.test', basePath: '/docs' },
    frontmatter: { defaults: { type: 'reference', channel: 'production', version: 'current', language: 'en', access: { policy: 'public' } } },
    publications: { defaults: { channel: 'production', version: 'current', language: 'en' }, channels: { production: {} }, versions: { current: {} }, enabled: [{ channel: 'production', version: 'current', language: 'en' }] },
    outputs: { html: { shareImages: false } },
    readerFilters: { facets: { audience: { label: 'Audience', options: { developer: 'Developer', ui: 'UI' } } }, controls: { header: { facet: 'audience', display: 'select' } } },
    navigation: [{ id: 'guides', label: 'Guides', tab: true, landing: 'intro', items: [{ id: 'intro', doc: 'intro' }, { id: 'other', doc: 'other' }] }],
  };
  const body = `## Example\n\n<Tabs label="Client">\n<Tab label="First">\n\nFirst client.\n\n</Tab>\n<Tab label="Second">\n\nSecond client.\n\n</Tab>\n</Tabs>\n\n<Collapsible title="More detail">\n\nDisclosure body.\n\n</Collapsible>\n\n\`\`\`sh\necho SECRET_CODE_SAMPLE\n\`\`\`\n\n[Open other](doc:other)\n`;
  const walkthrough = '\n<Walkthrough title="Demo" layout="spotlight">\n<Step title="One">\n\nStart here.\n\n```js\nconst SECRET_CODE_SAMPLE = 1;\n```\n\n</Step>\n<Step title="Two">\n\nThen change it.\n\n```js\nconst SECRET_CODE_SAMPLE = 2;\n```\n\n</Step>\n</Walkthrough>\n';
  for (const id of ['intro', 'other']) await writeFile(path.join(root, 'content', `${id}.mdx`), `---\n${JSON.stringify({ id, title: id, slug: `/${id}`, summary: `${id} summary` })}\n---\n${body}${walkthrough}`);
  const file = path.join(root, 'docs.config.yaml'), site = path.join(root, 'site');
  const read = route => readFile(path.join(site, route.replace(/^\//, '')), 'utf8');
  const build = async analytics => { config.analytics = analytics; await writeFile(file, JSON.stringify(config)); return compile(file, site); };
  return { root, config, file, site, read, build };
}

test('builds omit analytics by default, copy the declared module without executing it, and retain Markdown', async t => {
  const f = await fixture(t);
  const disabled = await f.build(false);
  const original = await f.read('/docs/intro.md');
  assert.doesNotMatch(await f.read('/docs/intro/index.html'), /analytics-config|assets\/analytics/);
  await assert.rejects(f.read('/docs/assets/analytics.js'), /ENOENT/);
  // Resolve relative to the included setting, not the root config.
  const module = 'throw new Error("must not execute at build time");\nexport function track() {}\n';
  await writeFile(path.join(f.root, 'config', 'adapter.mjs'), module);
  await writeFile(path.join(f.root, 'config', 'analytics.yaml'), 'module: ./adapter.mjs\n');
  const enabled = await f.build({ $include: './config/analytics.yaml' });
  assert.equal(await f.read('/docs/assets/analytics-adapter.js'), module);
  assert.match(await f.read('/docs/intro/index.html'), /src="\/docs\/assets\/analytics.js"/);
  assert.equal(await f.read('/docs/intro.md'), original, 'instrumentation does not alter agent content');
  assert.deepEqual(enabled.documents.map(d => d.id), disabled.documents.map(d => d.id));
  assert.ok(enabled.dependencies.some(file => file.endsWith('adapter.mjs')));
  await f.build(false);
  await assert.rejects(f.read('/docs/assets/analytics-adapter.js'), /ENOENT/, 'turning analytics off removes its public adapter');
  await assert.rejects(f.build({ module: './missing.js' }), /ENOENT|missing/);
});

test('customer adapters receive intentional interactions, consent gates delivery, and failures leave content usable', async t => {
  const f = await fixture(t);
  await writeFile(path.join(f.root, 'adapter.js'), `
export function init({page, setEnabled}) {
  window.events = [];
  window.adapterPage = page;
  window.grant = () => setEnabled(true);
  if (window.pauseAnalytics) setEnabled(false);
  if (window.breakInit) throw new Error('SDK init failed');
  if (window.delayInit) return new Promise(resolve => { window.finishInit = resolve; });
}
export function track(event) {
  if (window.breakTrack === 'sync') throw new Error('SDK track failed');
  if (window.breakTrack === 'async') return Promise.reject(new Error('SDK track failed'));
  window.events.push(event);
}
`);
  await f.build({ module: './adapter.js' });
  const server = await serveSite(f.site, '127.0.0.1', 0);
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const browser = await puppeteer.launch({ headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setViewport({ width: 1800, height: 1000 });
  const errors = [], requests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => requests.push(request.url()));
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { if (window.breakClipboard) throw new Error('clipboard denied'); } } });
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  await page.goto(`${origin}/docs/intro?private_token=SECRET_QUERY#example`);
  await page.waitForFunction(() => window.shoalrunAnalytics?.enabled);
  assert.deepEqual(await page.evaluate(() => events.map(e => e.name)), ['page_view'], 'initial component selection and hash reveal are not interaction events');
  assert.equal(await page.evaluate(() => events[0].properties.pageId), 'intro');
  assert.equal(await page.evaluate(() => events[0].properties.pageUrl), '/docs/intro');
  assert.equal(await page.evaluate(() => events[0].properties.navigationSectionId), 'guides');
  await page.waitForSelector('.walkthrough.is-split');
  await page.click('.walkthrough-step-button:nth-child(1)');
  await page.focus('.walkthrough-step-button');
  await page.keyboard.press('ArrowDown');
  assert.equal(await page.evaluate(() => events.filter(e => e.name === 'walkthrough_step_change').length), 1);
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => events.filter(e => e.name === 'walkthrough_step_change').length), 1, 'reselecting a step does not double count');
  await page.click('.walkthrough-pane .code-copy');
  await page.waitForFunction(() => events.some(e => e.name === 'code_copy' && e.properties.stepIndex === 1 && e.properties.componentType === 'walkthrough'));
  await page.click('.doc-tablist a:nth-child(2)');
  await page.focus('.doc-tablist a:nth-child(2)');
  await page.keyboard.press('ArrowLeft');
  assert.equal(await page.evaluate(() => events.filter(e => e.name === 'content_tab_change').length), 2);
  await page.click('.doc-tablist a:first-child');
  assert.equal(await page.evaluate(() => events.filter(e => e.name === 'content_tab_change').length), 2, 'reselecting a tab does not double count');
  await page.focus('.doc-collapsible>summary');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => events.some(e => e.name === 'disclosure_toggle'));
  await page.click('.code-copy');
  await page.waitForFunction(() => events.some(e => e.name === 'code_copy'));
  await page.click('[data-copy-markdown]');
  await page.waitForFunction(() => events.some(e => e.name === 'markdown_copy'));
  await page.select('.mast [data-reader-facet] select', 'developer');
  assert.equal(await page.evaluate(() => events.filter(e => e.name === 'reader_filter_change').length), 1);
  await page.type('.site-search input', 'unfindable_SECRET_SEARCH');
  await page.waitForFunction(() => events.some(e => e.name === 'search_results' && e.properties.status === 'empty'));
  const searchProps = await page.evaluate(() => events.find(e => e.name === 'search_results').properties);
  assert.equal(searchProps.resultCount, 0);
  assert.equal(searchProps.queryLength, 'unfindable_SECRET_SEARCH'.length);
  await page.$eval('.site-search input', input => { input.value = 'other'; input.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.waitForSelector('.site-search-results a');
  // Observe the activation without leaving this page; the adapter does not prevent it.
  await page.evaluate(() => document.querySelector('.site-search-results a').addEventListener('click', e => e.preventDefault()));
  await page.focus('.site-search input');
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => events.filter(e => e.name === 'search_result_click').length), 1);
  await page.evaluate(() => { const link = document.querySelector('article a[href="/docs/other"]'); link.addEventListener('click', e => e.preventDefault()); link.click(); });
  assert.equal(await page.evaluate(() => events.filter(e => e.name === 'navigation_click').length), 1);
  const serialized = await page.evaluate(() => JSON.stringify(events));
  for (const secret of ['SECRET_CODE_SAMPLE', 'SECRET_QUERY', 'SECRET_SEARCH']) assert.ok(!serialized.includes(secret));
  assert.ok(requests.every(url => new URL(url).origin === origin), 'no vendor requests are made by Shoalrun');
  await page.evaluate(() => { window.breakClipboard = true; });
  const before = await page.evaluate(() => events.filter(e => e.name === 'code_copy').length);
  await page.click('.code-copy');
  await page.waitForFunction(() => document.querySelector('.code-copy').textContent === 'Try again');
  assert.equal(await page.evaluate(() => events.filter(e => e.name === 'code_copy').length), before, 'copy failures are not successes');
  await page.evaluate(() => {
    shoalrunAnalytics.setEnabled(false);
    shoalrunAnalytics.track('custom_event', { value: 'discarded' });
    shoalrunAnalytics.setEnabled(true);
    shoalrunAnalytics.track('custom_event', { pageId: 'spoofed', value: 7 });
  });
  assert.equal(await page.evaluate(() => events.filter(e => e.name === 'custom_event').length), 1);
  assert.equal(await page.evaluate(() => events.at(-1).properties.pageId), 'intro');
  assert.equal(await page.evaluate(() => shoalrunAnalytics.track('invalid event name')), false);
  await page.evaluate(() => shoalrunAnalytics.track('sanitized_event', { object: { hidden: 'secret' }, nullValue: null, invalid: Infinity, text: 'x'.repeat(300), values: [1, 'two', false, null] }));
  const sanitized = await page.evaluate(() => events.at(-1).properties);
  assert.equal(sanitized.text.length, 256);
  assert.deepEqual(sanitized.values, [1, 'two', false]);
  for (const key of ['object', 'nullValue', 'invalid']) assert.ok(!(key in sanitized));
  for (const mode of ['sync', 'async']) {
    await page.evaluate(mode => { window.breakTrack = mode; }, mode);
    await page.click('.doc-tablist a:nth-child(2)');
    await page.click('.doc-tablist a:first-child');
    assert.equal(await page.$eval('.doc-tablist a:first-child', e => e.getAttribute('aria-selected')), 'true');
  }
  assert.deepEqual(errors, []);
  const paused = await browser.newPage();
  await paused.evaluateOnNewDocument(() => { window.pauseAnalytics = true; });
  await paused.goto(`${origin}/docs/intro`);
  await paused.waitForFunction(() => typeof window.grant === 'function');
  assert.equal(await paused.evaluate(() => events.length), 0);
  await paused.click('.doc-tablist a:nth-child(2)');
  await paused.evaluate(() => grant());
  await paused.click('.doc-tablist a:first-child');
  assert.deepEqual(await paused.evaluate(() => events.map(e => e.name)), ['content_tab_change'], 'events before consent are neither delivered nor replayed');
  const broken = await browser.newPage();
  await broken.evaluateOnNewDocument(() => { window.breakInit = true; });
  await broken.goto(`${origin}/docs/intro`);
  await broken.waitForSelector('.doc-tabs.is-enhanced');
  await broken.click('.doc-tablist a:nth-child(2)');
  assert.equal(await broken.$eval('.doc-tablist a:nth-child(2)', e => e.getAttribute('aria-selected')), 'true');
  assert.equal(await broken.evaluate(() => events.length), 0);
  const delayed = await browser.newPage();
  await delayed.evaluateOnNewDocument(() => { window.delayInit = true; });
  await delayed.goto(`${origin}/docs/intro`);
  await delayed.waitForFunction(() => typeof window.finishInit === 'function');
  await delayed.click('.doc-tablist a:nth-child(2)');
  assert.equal(await delayed.evaluate(() => events.length), 0, 'SDK initialization never blocks content or buffers events');
  await delayed.evaluate(() => finishInit());
  await delayed.waitForFunction(() => shoalrunAnalytics.enabled);
  assert.deepEqual(await delayed.evaluate(() => events.map(e => e.name)), ['page_view']);
  for (const adapter of [null, 'export const unrelated = true;', 'export const init = 3; export function track() {}']) {
    const invalid = await browser.newPage();
    const failures = [];
    invalid.on('pageerror', error => failures.push(error.message));
    await invalid.setRequestInterception(true);
    invalid.on('request', request => request.url().endsWith('/analytics-adapter.js')
      ? request.respond({ status: adapter === null ? 404 : 200, contentType: 'text/javascript', body: adapter ?? '' }) : request.continue());
    await invalid.goto(`${origin}/docs/intro`);
    await invalid.waitForSelector('.doc-tabs.is-enhanced');
    await invalid.click('.doc-tablist a:nth-child(2)');
    assert.equal(await invalid.$eval('.doc-tablist a:nth-child(2)', e => e.getAttribute('aria-selected')), 'true');
    assert.equal(await invalid.evaluate(() => shoalrunAnalytics.enabled), false);
    assert.deepEqual(failures, []);
  }
});
