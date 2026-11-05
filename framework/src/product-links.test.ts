import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test, { type TestContext } from 'node:test';
import { compile } from './compiler.js';

async function fixture(t: TestContext) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-product-links-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'content'));
  const variants = [
    { product: 'analytics', channel: 'production', version: 'v1' },
    { product: 'analytics', channel: 'production', version: 'v3' },
    { product: 'billing', channel: 'production', version: 'v1' },
  ];
  const config = path.join(root, 'docs.config.yaml');
  await writeFile(config, JSON.stringify({
    schemaVersion: 1, site: { title: 'Product link tests' },
    publications: {
      channels: { production: {} }, defaults: { channel: 'production', language: 'en' },
      products: {
        analytics: { pathPrefix: '/analytics', defaultVersion: 'v3', versions: { v1: { pathPrefix: '/v1' }, v3: { pathPrefix: '/v3' } } },
        billing: { pathPrefix: '/billing', defaultVersion: 'v1', versions: { v1: { pathPrefix: '/v1' } } },
      }, enabled: variants,
    },
    frontmatter: { defaults: { type: 'guide', channel: 'production', version: 'legacy', language: 'en', access: { policy: 'public' } } },
    outputs: { html: { highlighting: { provider: 'none' }, shareImages: false } },
    navigation: [{ id: 'target', doc: 'guide.target' }],
  }));
  const page = (name: string, body: string, metadata: Record<string, unknown>) => writeFile(path.join(root, 'content', `${name}.mdx`), `---\n${JSON.stringify({ id: `guide.${name}`, title: `Guide ${name}`, summary: `Instructions for ${name}.`, slug: `/${name}`, ...metadata })}\n---\n\n${body}\n`);
  await page('target', 'Target instructions.', { publications: variants });
  return { root, config, variants, page, output: path.join(root, 'dist') };
}

test('DocLink preserves the source product for inherited coordinates and requires explicit cross-product releases', async t => {
  const f = await fixture(t);
  await f.page('source', `[Local target](doc:guide.target)

<DocLink doc="guide.target" version="v1">Older analytics</DocLink>

<DocLink doc="guide.target" product="billing" version="v1">Billing target</DocLink>
`, { product: 'analytics' });
  const manifest = await compile(f.config, f.output);
  assert.equal(manifest.documents.find(document => document.id === 'guide.source')?.url, '/analytics/v3/source');
  const markdown = await readFile(path.join(f.output, 'analytics/v3/source.md'), 'utf8');
  assert.ok(markdown.includes('/analytics/v3/target.md'), markdown);
  assert.ok(markdown.includes('/analytics/v1/target.md'), markdown);
  assert.ok(markdown.includes('/billing/v1/target.md'), markdown);
  const html = await readFile(path.join(f.output, 'analytics/v3/source/index.html'), 'utf8');
  assert.match(html, /href="\/billing\/v1\/target\/?"/);
  await f.page('source', '<DocLink doc="guide.target" product="billing">Ambiguous release</DocLink>', { product: 'analytics' });
  await assert.rejects(compile(f.config), /cross-product DocLink needs an explicit version/);
  await f.page('source', '<DocLink doc="guide.target" product="billing" version="v3">Unavailable release</DocLink>', { product: 'analytics' });
  await assert.rejects(compile(f.config), /unknown DocLink target/);
});

test('ForPublication uses product-local version catalogs and does not resolve links in excluded branches', async t => {
  const f = await fixture(t);
  await f.page('shared', `Shared instructions.

<ForPublication product="analytics" version="v3">

AnalyticsV3Only

<DocLink doc="guide.target" version="v1">Earlier analytics</DocLink>

</ForPublication>

<ForPublication product="billing" version="v1">

BillingV1Only

[Billing target](doc:guide.target)

</ForPublication>
`, { publications: [f.variants[1], f.variants[2]] });
  await compile(f.config, f.output);
  const analytics = await readFile(path.join(f.output, 'analytics/v3/shared.md'), 'utf8');
  const billing = await readFile(path.join(f.output, 'billing/v1/shared.md'), 'utf8');
  assert.match(analytics, /AnalyticsV3Only/);
  assert.doesNotMatch(analytics, /BillingV1Only/);
  assert.ok(analytics.includes('/analytics/v1/target.md'), analytics);
  assert.match(billing, /BillingV1Only/);
  assert.doesNotMatch(billing, /AnalyticsV3Only|analytics\/v1/);
  assert.ok(billing.includes('/billing/v1/target.md'), billing);
  await f.page('shared', '<ForPublication product="billing" version="v3">\n\nUnknownBillingVersion\n\n</ForPublication>', { publications: [f.variants[1], f.variants[2]] });
  await assert.rejects(compile(f.config), /names unknown version v3/);
});
