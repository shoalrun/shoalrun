import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test, { type TestContext } from 'node:test';
import puppeteer from 'puppeteer';
import { compile } from './compiler.js';
import { serveSite } from './server.js';

async function fixture(t: TestContext) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-product-switcher-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'content'));
  const variants = [
    { product: 'payments', channel: 'production', version: 'v2', language: 'en' },
    { product: 'payments', channel: 'production', version: 'v3', language: 'en' },
    { product: 'reporting', channel: 'production', version: 'v1', language: 'en' },
    { product: 'private-product', channel: 'production', version: 'v8', language: 'en' },
  ];
  const settings = {
    schemaVersion: 1, site: { title: 'Product publications' } as Record<string, unknown>,
    profiles: { manifest: './skus.yaml' },
    publications: {
      defaults: { channel: 'production', language: 'en' }, channels: { production: {} },
      products: {
        payments: { label: 'Payments', pathPrefix: '/payments', defaultVersion: 'v3', versions: { v2: { pathPrefix: '/v2' }, v3: { pathPrefix: '/v3' } } },
        reporting: { label: 'Reports & insights', pathPrefix: '/reporting', defaultVersion: 'v1', versions: { v1: { pathPrefix: '/v1' } } },
        'private-product': { label: 'Private product', pathPrefix: '/private-product', defaultVersion: 'v8', versions: { v8: { pathPrefix: '/v8' } } },
      }, enabled: variants,
    },
    frontmatter: { defaults: { type: 'guide', language: 'en', access: { policy: 'public' } } },
    outputs: { html: { highlighting: { provider: 'none' }, shareImages: false } },
  };
  const page = (name: string, metadata: Record<string, unknown>) => writeFile(path.join(root, 'content', `${name}.mdx`), `---\n${JSON.stringify({ id: 'guide.start', title: 'Getting started', summary: 'Start using your product.', slug: '/start', ...metadata })}\n---\n\nProduct instructions.\n`);
  await page('shared', { publications: variants.map(({ language, ...variant }) => variant) });
  await page('special', { id: 'guide.special', slug: '/special', product: 'payments', channel: 'production', version: 'v3' });
  await writeFile(path.join(root, 'skus.yaml'), JSON.stringify({ schemaVersion: 1, features: {}, skus: {} }));
  const config = path.join(root, 'docs.config.yaml');
  const profile = path.join(root, 'customer.yaml');
  const save = () => writeFile(config, JSON.stringify(settings));
  await save();
  await writeFile(profile, JSON.stringify({ schemaVersion: 1, features: [] }));
  const output = path.join(root, 'dist');
  const build = () => compile(config, output, {}, { profile });
  const html = () => readFile(path.join(output, 'payments/v3/start/index.html'), 'utf8');
  return { root, settings, variants, page, save, profile, output, build, html };
}

function picker(html: string): string {
  const match = html.match(/<select class="publication-picker"[^>]*>[\s\S]*?<\/select>/);
  assert.ok(match, 'Publication dropdown is missing');
  return match[0];
}

test('publication dropdown replaces the edition badge and groups only published product releases', async t => {
  const f = await fixture(t);
  await f.build();
  const html = await f.html();
  const select = picker(html);
  assert.match(select, /aria-label="Publication"/);
  assert.match(select, /<optgroup label="Payments">/);
  assert.match(select, /<optgroup label="Reports &amp; insights">/);
  assert.match(select, /value="\/payments\/v3\/start" selected>Payments · production · v3<\/option>/);
  assert.match(select, /value="\/payments\/v2\/start">Payments · production · v2<\/option>/);
  assert.match(select, /value="\/reporting\/v1\/start">Reports &amp; insights · production · v1<\/option>/);
  assert.doesNotMatch(select, / · en/);
  assert.doesNotMatch(html, /class="edition"|class="publication-switcher"|onchange=/);
  const special = picker(await readFile(path.join(f.output, 'payments/v3/special/index.html'), 'utf8'));
  assert.match(special, /value="\/reporting\/v1\/start"/);
  await writeFile(f.profile, JSON.stringify({ schemaVersion: 1, features: [], publications: { enabled: [f.variants[1], f.variants[2]] } }));
  await f.build();
  const customer = picker(await f.html());
  assert.equal((customer.match(/<option /g) ?? []).length, 2);
  assert.doesNotMatch(customer, /Private product|private-product|payments\/v2/);
});

test('publication language labels follow rendered languages and explicit display overrides', async t => {
  const f = await fixture(t);
  const french = { ...f.variants[1], language: 'fr' };
  f.settings.publications.enabled.push(french);
  await f.page('french', { language: 'fr', publications: [{ product: 'payments', channel: 'production', version: 'v3' }] });
  await f.save();
  await f.build();
  assert.match(picker(await f.html()), /Payments · production · v3 · en<\/option>/);
  assert.match(picker(await f.html()), /Payments · production · v3 · fr<\/option>/);
  f.settings.site.publicationSelector = { showLanguage: false };
  await f.save();
  await f.build();
  assert.doesNotMatch(picker(await f.html()), / · (?:en|fr)<\/option>/);
  f.settings.site.publicationSelector = { showLanguage: true };
  f.settings.publications.enabled.pop();
  await f.save();
  await f.build();
  assert.match(picker(await f.html()), / · en<\/option>/);
  f.settings.site.publicationSelector = { showLanguage: 'yes' };
  await f.save();
  await assert.rejects(f.build(), /publicationSelector.*boolean/);
});

test('publication dropdown navigates between product releases in a browser and remains usable on narrow screens', async t => {
  const f = await fixture(t);
  // This test covers navigation, not Chrome's cross-document transition engine.
  // Keep browser errors observable while removing its intermittent aborted-transition errors.
  await writeFile(path.join(f.root, 'navigation-test.css'), '@view-transition{navigation:none}\n');
  f.settings.site.customCss = './navigation-test.css';
  await f.save();
  await writeFile(f.profile, JSON.stringify({ schemaVersion: 1, features: [], publications: { enabled: f.variants.slice(0, 3) } }));
  await f.build();
  const server = await serveSite(f.output, '127.0.0.1', 0);
  t.after(() => new Promise<void>(resolve => { server.closeAllConnections(); server.close(() => resolve()); }));
  const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const browser = await puppeteer.launch();
  t.after(() => browser.close());
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${origin}/payments/v3/special/`, { waitUntil: 'networkidle0' });
  const selectedLabel = () => page.$eval('[data-publication-switcher]', select => (select as HTMLSelectElement).selectedOptions[0].textContent);
  assert.equal(await selectedLabel(), 'Payments · production · v3');
  assert.deepEqual(await page.$$eval('select[aria-label="Publication"] optgroup', groups => groups.map(group => group.getAttribute('label'))), ['Payments', 'Reports & insights']);
  await page.focus('select[aria-label="Publication"]');
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'Publication');
  // The current page is payments-only, so selecting reporting opens its overview.
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0' }),
    page.select('[data-publication-switcher]', '/reporting/v1/start'),
  ]);
  assert.equal(new URL(page.url()).pathname, '/reporting/v1/start/');
  assert.equal(await selectedLabel(), 'Reports & insights · production · v1');
  assert.equal(await page.$eval('h1', heading => heading.textContent), 'Getting started');
  // Returning to a different payments release preserves the shared page identity.
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0' }),
    page.select('[data-publication-switcher]', '/payments/v2/start'),
  ]);
  assert.equal(new URL(page.url()).pathname, '/payments/v2/start/');
  assert.equal(await selectedLabel(), 'Payments · production · v2');
  await page.setViewport({ width: 375, height: 812 });
  const bounds = await page.$eval('[data-publication-switcher]', select => {
    const rect = select.getBoundingClientRect();
    return { left: rect.left, right: rect.right, width: rect.width, viewport: innerWidth };
  });
  assert.ok(bounds.width > 0 && bounds.left >= 0 && bounds.right <= bounds.viewport, JSON.stringify(bounds));
  assert.deepEqual(errors, []);
});
