import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, mkdir, readFile, readdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { compile } from './compiler.js';
import { exportContent, preparePdfExport } from './content-export.js';

async function fixture(t: any) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-facets-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'content'));
  const variant = { channel: 'production', version: 'current', language: 'en' };
  const config = path.join(root, 'docs.config.yaml');
  const settings: any = { schemaVersion: 1, site: { title: 'Facet sections', contentFilter: { audience: ['customer'] } }, publications: { channels: { production: {} }, versions: { current: {} }, defaults: variant, enabled: [variant] }, readerFilters: { facets: { audience: { label: 'Audience', options: { customer: 'Customers', internal: 'Internal', partner: 'Partners' } }, region: { label: 'Region', options: { eu: 'Europe', us: 'US' } } } }, outputs: { html: { highlighting: { provider: 'none' } } }, snippets: { InternalSnippetIdMarker: { file: './PrivateSnippetPathMarker.md' } } };
  const save = () => writeFile(config, JSON.stringify(settings));
  await save();
  await writeFile(path.join(root, 'PrivateSnippetPathMarker.md'), 'InternalSnippetBodyMarker');
  const page = (body: string, extra: any = {}, name = 'home') => writeFile(path.join(root, 'content', name + '.mdx'), `---\n${JSON.stringify({ id: 'guide.' + name, title: name, summary: 'Facet instructions.', type: 'guide', slug: name === 'home' ? '/' : '/' + name, ...variant, audiences: ['customer', 'internal'], readerFilters: { region: ['eu', 'us'] }, access: { policy: 'public' }, ...extra })}\n---\n${body}\n`);
  const output = path.join(root, 'site');
  return { root, config, settings, save, page, output, variant };
}
async function publicBytes(directory: string): Promise<string> {
  const chunks: string[] = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, item.name);
    chunks.push(item.name, item.isDirectory() ? await publicBytes(file) : await readFile(file, 'utf8'));
    if (item.isFile() && item.name.endsWith('.json')) {
      const decoded = (value: any): void => {
        if (!value || typeof value !== 'object') return;
        for (const [key, child] of Object.entries(value)) {
          if (key === 'base64' && typeof child === 'string') chunks.push(Buffer.from(child, 'base64').toString('utf8'));
          else decoded(child);
        }
      };
      try { decoded(JSON.parse(await readFile(file, 'utf8'))); } catch { /* non-JSON assets are scanned as raw bytes above */ }
    }
  }
  return chunks.join('\n');
}

test('one source produces a superset or facet-pruned output without profiles, stale assets, headings or snippet metadata', async t => {
  const f = await fixture(t);
  await writeFile(path.join(f.root, 'content', 'InternalImagePathMarker.svg'), '<svg xmlns="http://www.w3.org/2000/svg"><text>InternalImageBodyMarker</text></svg>');
  await f.page('SharedMarker\n\n<ForFacet audience="internal partner">\n\n## InternalHeadingMarker <Anchor id="internal-anchor-marker" />\n\nInternalBodyMarker\n\n<Snippet id="InternalSnippetIdMarker" />\n\n![InternalImageAltMarker](./InternalImagePathMarker.svg)\n\n</ForFacet>\n\n<ReaderSection audience="internal">\n\nReaderPresentationMarker\n\n</ReaderSection>');
  delete f.settings.site.contentFilter; await f.save();
  await compile(f.config, f.output);
  assert.match(await readFile(path.join(f.output, 'index.md'), 'utf8'), /InternalBodyMarker|InternalSnippetBodyMarker/);
  f.settings.site.contentFilter = { audience: ['customer'] }; await f.save();
  const result = await compile(f.config, f.output);
  const all = await publicBytes(f.output);
  assert.doesNotMatch(all, /Internal(?:Heading|Body|Snippet|Image)[A-Za-z]*Marker|PrivateSnippetPathMarker|internal-anchor-marker|content-selection/);
  assert.match(all, /SharedMarker/); assert.match(all, /ReaderPresentationMarker/);
  assert.equal(result.contentSelection.warnings[0].code, 'reader-section-build-facet');
  const receipt = JSON.parse(await readFile(path.join(f.root, '.shoalrun/content-selection.json'), 'utf8'));
  assert.deepEqual(receipt.selection, { audience: ['customer'] });
  assert.ok(receipt.decisions.some((row: any) => !row.included));
  assert.doesNotMatch(JSON.stringify(receipt), /InternalBodyMarker/);
  await assert.rejects(readFile(path.join(f.root, '.shoalrun/profile-selection.json')), /ENOENT/);
  delete f.settings.site.contentFilter; await f.save(); await compile(f.config, f.output);
  assert.equal(JSON.parse(await readFile(path.join(f.root, '.shoalrun/content-selection.json'), 'utf8')).selection, null);
});

test('section predicates AND facets and ancestors, OR choices, and pass facets absent from the build filter', async t => {
  const f = await fixture(t);
  await f.page('SharedMarker\n\n<ForFacet audience="customer partner" region="eu">\n\nMatchingMarker\n\n<ForFacet audience="internal">\n\nNestedExcludedMarker\n\n</ForFacet>\n\n</ForFacet>\n\n<ForFacet region="us">\n\nUnselectedFacetMarker\n\n</ForFacet>');
  await compile(f.config, f.output);
  let text = await readFile(path.join(f.output, 'index.md'), 'utf8');
  assert.match(text, /MatchingMarker/); assert.match(text, /UnselectedFacetMarker/); assert.doesNotMatch(text, /NestedExcludedMarker/);
  f.settings.site.contentFilter.region = ['eu']; await f.save();
  await compile(f.config, f.output);
  text = await readFile(path.join(f.output, 'index.md'), 'utf8');
  assert.doesNotMatch(text, /UnselectedFacetMarker|NestedExcludedMarker/);
  await f.page('UnmarkedPageMarker', { audiences: undefined }, 'unmarked');
  assert.ok(!(await compile(f.config, f.output)).documents.some(doc => doc.id === 'guide.unmarked'));
});

test('excluded guards validate conditions but never resolve missing ordinary dependencies', async t => {
  const f = await fixture(t);
  const hidden = '<ForFacet audience="internal">\n\n<Snippet id="missing" />\n\n<ApiSchema api="missing" schema="#/missing" />\n\n![Missing](./missing.png)\n\n[Missing](doc:missing)\n\n</ForFacet>';
  await f.page('SharedMarker\n\n' + hidden); await compile(f.config, f.output);
  for (const invalid of ['audience="typo"', 'typo="customer"', 'audience="customer customer"', 'audience=" "', 'audience={"customer"}', 'audience="customer" audience="internal"']) {
    await f.page(`<ForFacet audience="internal">\n\n<ForFacet ${invalid}>\n\nText\n\n</ForFacet>\n\n</ForFacet>`);
    await assert.rejects(compile(f.config, f.output), /ForFacet/);
  }
  delete f.settings.site.contentFilter; await f.save();
  await f.page('<ForFacet typo="customer">\n\nText\n\n</ForFacet>');
  await assert.rejects(compile(f.config, f.output), /ForFacet/);
});

test('facet and feature guards compose in either order while preserving validation beneath excluded guards', async t => {
  const f = await fixture(t);
  f.settings.profiles = { manifest: './features.json' }; await f.save();
  await writeFile(path.join(f.root, 'features.json'), JSON.stringify({ schemaVersion: 1, features: { paid: {} }, skus: {} }));
  const profile = path.join(f.root, 'profile.json'); await writeFile(profile, JSON.stringify({ schemaVersion: 1, features: [] }));
  await f.page('Shared\n\n<ForFeature allOf="paid">\n\n<ForFacet audience="customer">\n\nFeatureBlockedMarker\n\n</ForFacet>\n\n</ForFeature>\n\n<ForFacet audience="internal">\n\n<ForFeature allOf="paid">\n\nFacetBlockedMarker\n\n</ForFeature>\n\n</ForFacet>');
  await compile(f.config, f.output, {}, { profile });
  assert.doesNotMatch(await publicBytes(f.output), /FeatureBlockedMarker|FacetBlockedMarker/);
  await f.page('<ForFeature allOf="paid">\n\n<ForFacet audience="unknown">\n\nText\n\n</ForFacet>\n\n</ForFeature>');
  await assert.rejects(compile(f.config, f.output, {}, { profile }), /ForFacet/);
  await f.page('<ForFacet audience="internal">\n\n<ForFeature allOf="unknown">\n\nText\n\n</ForFeature>\n\n</ForFacet>');
  await assert.rejects(compile(f.config, f.output, {}, { profile }), /unknown feature/);
});

test('exports use their own section selection, isolated snippets prune dependencies, and PDF preparation inherits site selection', async t => {
  const f = await fixture(t);
  await f.page('Shared\n\n<ForFacet audience="internal">\n\nInternalExportMarker\n\n</ForFacet>');
  await writeFile(path.join(f.root, 'PrivateSnippetPathMarker.md'), 'SharedSnippet\n\n<ForFacet audience="internal">\n\n<ApiSchema api="missing" schema="#/missing" />\n\nInternalIsolatedMarker\n\n</ForFacet>');
  f.settings.exports = {
    customer: { contentFilter: { audience: ['customer'] } },
    snippet: { contentFilter: { audience: ['customer'] }, resources: [{ kind: 'snippet', id: 'help.instance', snippetId: 'InternalSnippetIdMarker', title: 'Help', summary: 'Shared help.' }] }
  }; await f.save();
  const customer = path.join(f.root, 'customer'); await exportContent(f.config, customer, { target: 'customer' });
  assert.doesNotMatch(await publicBytes(customer), /InternalExportMarker|InternalIsolatedMarker/);
  const snippet = path.join(f.root, 'snippet'); await exportContent(f.config, snippet, { target: 'snippet' });
  assert.doesNotMatch(await publicBytes(snippet), /InternalIsolatedMarker/); assert.match(await publicBytes(snippet), /SharedSnippet/);
  const pdf = await preparePdfExport(f.config);
  assert.doesNotMatch(JSON.stringify(pdf.input), /InternalExportMarker/);
  // A portable export without its own filter retains the existing independent selection.
  f.settings.snippets = {}; await f.save();
  const all = path.join(f.root, 'all'); await exportContent(f.config, all);
  assert.match(await publicBytes(all), /InternalExportMarker/);
});


test('excluded component invocations emit neither browser bundles nor component source paths, and retained ones still work', async t => {
  const f = await fixture(t);
  await mkdir(path.join(f.root, 'PrivateComponentPathMarker'));
  await writeFile(path.join(f.root, 'PrivateComponentPathMarker/manifest.json'), JSON.stringify({ apiVersion: 1, components: { InternalWidget: { module: './content.mjs', browser: './browser.js' } } }));
  await writeFile(path.join(f.root, 'PrivateComponentPathMarker/content.mjs'), 'export default { children: "required", content({children}) { return children; } };');
  await writeFile(path.join(f.root, 'PrivateComponentPathMarker/browser.js'), 'export function enhance() { document.title += "PrivateBrowserBodyMarker"; }');
  f.settings.components = ['./PrivateComponentPathMarker/manifest.json']; await f.save();
  await f.page('SharedWidgetMarker\n\n<ForFacet audience="internal">\n\n<InternalWidget>\n\nPrivateWidgetBodyMarker\n\n</InternalWidget>\n\n</ForFacet>');
  const restricted = await compile(f.config, f.output);
  assert.doesNotMatch(await publicBytes(f.output), /Private(?:ComponentPath|BrowserBody|WidgetBody)Marker/);
  assert.ok(restricted.dependencies.some(file => file.includes('PrivateComponentPathMarker')));
  delete f.settings.site.contentFilter; await f.save(); await compile(f.config, f.output);
  const complete = await publicBytes(f.output);
  assert.match(complete, /PrivateBrowserBodyMarker/);
  assert.match(complete, /PrivateWidgetBodyMarker/);
});

test('isolated authoring validation uses the selected sections and becomes stale when the filter changes', async t => {
  const { validateAuthoringChanges, authoringValidationStatus } = await import('./authoring-validation.js');
  const f = await fixture(t);
  await f.page('SharedPreviewMarker\n\n<ForFacet audience="internal">\n\n## PrivatePreviewHeadingMarker\n\nPrivatePreviewBodyMarker\n\n</ForFacet>');
  const report = await validateAuthoringChanges(f.config, { files: ['content/home.mdx'] });
  t.after(() => rm(report.artifacts.directory, { recursive: true, force: true }));
  assert.equal(report.status, 'ok', JSON.stringify(report.findings));
  assert.match(await publicBytes(report.artifacts.site), /SharedPreviewMarker/);
  assert.doesNotMatch(await publicBytes(report.artifacts.site), /PrivatePreview(?:Heading|Body)Marker/);
  assert.equal((await authoringValidationStatus(report.artifacts.report)).current, true);
  delete f.settings.site.contentFilter; await f.save();
  assert.equal((await authoringValidationStatus(report.artifacts.report)).current, false);
});

test('the packaged audience example builds both the complete and customer documentation', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-facet-example-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(new URL('../example-configs/facet-sections/', import.meta.url), root, { recursive: true });
  for (const config of ['docs', 'customer']) {
    const output = path.join(root, 'dist', config);
    await compile(path.join(root, config + '.config.yaml'), output);
    const markdown = await readFile(path.join(output, 'index.md'), 'utf8');
    assert.match(markdown, /Review a bill/); assert.match(markdown, /Get help/);
    assert.equal(markdown.includes('Check the retry queue'), config === 'docs');
    assert.equal((await readFile(path.join(output, 'search-index.json'), 'utf8')).includes('replaying a failed billing job'), config === 'docs');
  }
});


test('publication ancestors affect section receipts and excluded descendants still validate', async t => {
  const f = await fixture(t);
  f.settings.publications.versions.other = { pathPrefix: '/other' }; await f.save();
  await f.page('Shared\n\n<ForPublication version="other">\n\n<ForFacet audience="customer">\n\nWrongPublicationMarker\n\n</ForFacet>\n\n</ForPublication>');
  const built = await compile(f.config, f.output);
  assert.doesNotMatch(await publicBytes(f.output), /WrongPublicationMarker/);
  const decisions = built.contentSelection.decisions;
  assert.equal(decisions.length, 1);
  assert.equal(decisions[0].included, false);
  assert.equal(decisions[0].reason, 'ancestor-excluded');
  await f.page('<ForPublication version="other">\n\n<ForFacet audience="typo">\n\nInvalid\n\n</ForFacet>\n\n</ForPublication>');
  await assert.rejects(compile(f.config, f.output), /ForFacet/);
});

test('canonical fragment fallback refuses an export tree that differs from the website section selection', async t => {
  const f = await fixture(t);
  f.settings.site.origin = 'https://docs.example.com';
  f.settings.exports = { section: { resources: [{ kind: 'section', documentId: 'guide.home', sectionId: 'shared' }] } }; await f.save();
  await f.page('## Shared\n\n[Operations](#operations)\n\n<ForFacet audience="internal">\n\n## Operations\n\nInternalCanonicalMarker\n\n</ForFacet>', { standaloneSections: [{ id: 'shared', context: 'section' }] });
  await assert.rejects(exportContent(f.config, path.join(f.root, 'portable'), { target: 'section' }), /Cannot verify canonical anchor.*different site and export/);
  f.settings.exports.manual = { documents: ['guide.home', 'guide.other'], contentFilter: { audience: ['internal'] } }; await f.save();
  await f.page('## Shared\n\n[Operations](/other#operations)');
  await f.page('Shared destination.\n\n<ForFacet audience="internal">\n\n## Operations\n\nInternalCanonicalMarker\n\n</ForFacet>', {}, 'other');
  await assert.rejects(preparePdfExport(f.config, { target: 'manual', pdfLinks: 'canonical' }), /Cannot verify canonical anchor.*different site and export/);
  // A matched selection can verify a shared fragment outside the exported section.
  f.settings.exports.section.contentFilter = { audience: ['customer'] }; await f.save();
  await f.page('## Shared\n\n[Help](#help)\n\n## Help\n\nShared help.\n\n<ForFacet audience="internal">\n\nInternalCanonicalMarker\n\n</ForFacet>', { standaloneSections: [{ id: 'shared', context: 'section' }] });
  await exportContent(f.config, path.join(f.root, 'matched'), { target: 'section' });
  assert.match(await publicBytes(path.join(f.root, 'matched')), /https:\/\/docs.example.com\/#help/);
});


test('customer rebuild removes canaries from MCP copies and decoded endpoint PDF assets below a base path', async t => {
  const f = await fixture(t);
  f.settings.site.basePath = '/manual';
  f.settings.mcp = { enabled: true, access: 'public', publication: f.variant };
  f.settings.outputs.html.pdf = { mode: 'endpoint' };
  await writeFile(path.join(f.root, 'content', 'PrivateRuntimeImageMarker.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="30"><text x="1" y="20">PrivateRuntimeAssetMarker</text></svg>');
  await writeFile(path.join(f.root, 'PrivateSnippetPathMarker.md'), 'PrivateRuntimeSnippetMarker');
  await f.page('SharedRuntimeMarker\n\n<ForFacet audience="internal">\n\n## PrivateRuntimeHeadingMarker\n\nPrivateRuntimeBodyMarker\n\n<Snippet id="InternalSnippetIdMarker" />\n\n![PrivateRuntimeAltMarker](./PrivateRuntimeImageMarker.svg)\n\n</ForFacet>', { slug: '/guide' });
  delete f.settings.site.contentFilter; await f.save();
  await compile(f.config, f.output);
  const complete = await publicBytes(f.output);
  for (const marker of ['PrivateRuntimeBodyMarker', 'PrivateRuntimeSnippetMarker', 'PrivateRuntimeAssetMarker']) assert.ok(complete.includes(marker), marker);
  const runtime = JSON.parse(await readFile(path.join(f.output, 'pdf-runtime.json'), 'utf8'));
  assert.equal(Object.keys(runtime.pages).length, 1);
  f.settings.site.contentFilter = { audience: ['customer'] }; await f.save();
  await compile(f.config, f.output);
  const customer = await publicBytes(f.output);
  assert.doesNotMatch(customer, /PrivateRuntime[A-Za-z]*Marker|InternalSnippetIdMarker|PrivateSnippetPathMarker/);
  assert.match(customer, /SharedRuntimeMarker/);
  const mcpMarkdown = await readFile(path.join(f.output, '__shoalrun/mcp-data/manual/guide.md'), 'utf8');
  assert.match(mcpMarkdown, /SharedRuntimeMarker/); assert.doesNotMatch(mcpMarkdown, /PrivateRuntime/);
  const pdfFiles = await readdir(path.join(f.output, '__shoalrun/pdf-data'));
  assert.equal(pdfFiles.length, 1);
  const prepared = JSON.parse(await readFile(path.join(f.output, '__shoalrun/pdf-data', pdfFiles[0]), 'utf8'));
  assert.match(prepared.html, /SharedRuntimeMarker/); assert.doesNotMatch(prepared.html, /PrivateRuntime/);
  for (const asset of prepared.assets) assert.doesNotMatch(Buffer.from(asset.base64, 'base64').toString('utf8'), /PrivateRuntime/);
});

test('interleaved audience builds and product-scoped exports cannot contaminate sibling outputs or snippet metadata', async t => {
  const f = await fixture(t);
  const releases = ['alpha', 'beta'].map(product => ({ product, channel: 'production', version: 'v1' }));
  f.settings.publications = { channels: { production: {} }, defaults: { channel: 'production', language: 'en' }, products: Object.fromEntries(releases.map(({ product }) => [product, { pathPrefix: '/' + product, defaultVersion: 'v1', versions: { v1: { pathPrefix: '/v1' } } }])), enabled: releases };
  await writeFile(path.join(f.root, 'PrivateSnippetPathMarker.md'), 'PrivateProductSnippetMarker');
  await f.page(`SharedProductMarker

<ForFacet audience="internal">

PrivateProductAudienceMarker

<ForPublication product="beta">

PrivateBetaMarker

<Snippet id="InternalSnippetIdMarker" />

</ForPublication>

</ForFacet>

<ForFacet audience="customer">

CustomerAudienceMarker

</ForFacet>

<ForFacet audience="partner">

PartnerAudienceMarker

</ForFacet>`, { version: undefined, channel: undefined, publications: releases, audiences: ['customer', 'internal', 'partner'] });
  const configs = new Map<string, string>();
  for (const audience of ['customer', 'internal', 'partner']) {
    const file = path.join(f.root, audience + '.config.yaml');
    await writeFile(file, JSON.stringify({ ...f.settings, site: { ...f.settings.site, contentFilter: { audience: [audience] } }, exports: Object.fromEntries(releases.map(publication => [publication.product, { publication: { ...publication, language: 'en' }, contentFilter: { audience: [audience] } }])) }));
    configs.set(audience, file);
  }
  const customerOutput = path.join(f.root, 'customer-site'); const internalOutput = path.join(f.root, 'internal-site');
  await Promise.all([compile(configs.get('customer')!, customerOutput), compile(configs.get('internal')!, internalOutput)]);
  const customerBefore = await publicBytes(customerOutput);
  assert.doesNotMatch(customerBefore, /PrivateProduct[A-Za-z]*Marker|PrivateBetaMarker|PartnerAudienceMarker/);
  const manifest = JSON.parse(await readFile(path.join(internalOutput, 'documents.json'), 'utf8'));
  assert.deepEqual(manifest.documents.find((doc: any) => doc.variant.product === 'alpha').snippets, []);
  assert.deepEqual(manifest.documents.find((doc: any) => doc.variant.product === 'beta').snippets, ['InternalSnippetIdMarker']);
  assert.doesNotMatch(await readFile(path.join(internalOutput, 'alpha/v1.md'), 'utf8'), /PrivateBetaMarker|PrivateProductSnippetMarker/);
  assert.match(await readFile(path.join(internalOutput, 'beta/v1.md'), 'utf8'), /PrivateBetaMarker/);
  const reused = path.join(f.root, 'reused-site'); const reusedExport = path.join(f.root, 'reused-export');
  for (const audience of ['internal', 'customer', 'partner', 'customer']) {
    const config = configs.get(audience)!;
    const built = await compile(config, reused);
    const bytes = await publicBytes(reused);
    assert.equal(bytes.includes('PrivateProductAudienceMarker'), audience === 'internal');
    assert.equal(bytes.includes('CustomerAudienceMarker'), audience === 'customer');
    assert.equal(bytes.includes('PartnerAudienceMarker'), audience === 'partner');
    assert.deepEqual(built.contentSelection.selection, { audience: [audience] });
    for (const product of ['beta', 'alpha']) {
      await exportContent(config, reusedExport, { target: product });
      const exported = await publicBytes(reusedExport);
      assert.equal(exported.includes('PrivateProductAudienceMarker'), audience === 'internal');
      assert.equal(exported.includes('PrivateBetaMarker'), audience === 'internal' && product === 'beta');
      assert.equal(exported.includes('CustomerAudienceMarker'), audience === 'customer');
      assert.equal(exported.includes('PartnerAudienceMarker'), audience === 'partner');
      const receipt = JSON.parse(await readFile(path.join(f.root, '.shoalrun/content-selection.json'), 'utf8'));
      assert.equal(receipt.target.name, product); assert.deepEqual(receipt.selection, { audience: [audience] });
    }
    assert.equal(await publicBytes(customerOutput), customerBefore);
  }
});
