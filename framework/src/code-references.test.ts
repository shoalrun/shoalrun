import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { validateCodeReference, readCodeReference } from './code-reference-model.js';
import { compile } from './compiler.js';
import { queryBuiltSite } from './search-query.js';
import { exportContent, preparePdfExport } from './content-export.js';

const snapshot = () => ({ schemaVersion: 1, kind: 'shoalrun-code-reference', programmingLanguage: 'python', producer: { name: 'test', version: '1' }, symbols: [
  { id: 'sample', name: 'sample', kind: 'module', description: 'Utilities for examples.', seeAlso: ['sample.greet'] },
  { id: 'sample.greet', parent: 'sample', name: 'greet', kind: 'function', summary: 'Greet a reader.', signatures: ['def greet(name: str) -> str'], description: 'Return a friendly greeting. [Module][module]\n\n[module]: symbol:sample\n\n<Include file="secret.txt" />\n\n{process.env.SECRET}\n\n<script>alert(1)</script>', parameters: [{ name: 'name', type: 'str', description: 'Name to greet.' }], returns: { type: 'str', description: 'Greeting text.' }, examples: [{ code: 'greet("reader")' }] },
  { id: 'sample._secret', parent: 'sample', name: '_secret', kind: 'function', visibility: 'private', description: 'HiddenMarker' }
] });

test('converter schema rejects duplicates, dangling/cyclic ownership, unknown executable data and unsafe source paths', () => {
  assert.equal(validateCodeReference(snapshot()).symbols.length, 3);
  for (const mutate of [
    (s: any) => s.symbols.push(s.symbols[0]),
    (s: any) => s.symbols[0].parent = 'missing',
    (s: any) => s.symbols[0].parent = 'sample.greet',
    (s: any) => s.symbols[0].tree = { type: 'mdx' },
    (s: any) => s.symbols[0].source = { path: '../secret.py' }
  ]) { const value = snapshot(); mutate(value); assert.throws(() => validateCodeReference(value)); }
  const kotlin = snapshot(); kotlin.programmingLanguage = 'kotlin'; assert.equal(validateCodeReference(kotlin).programmingLanguage, 'kotlin');
});

test('code references use native pages, Markdown, discovery and content exports without evaluating imported MDX', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-code-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'content'));
  await writeFile(path.join(root, 'snapshot.json'), JSON.stringify(snapshot()));
  await writeFile(path.join(root, 'secret.txt'), 'NeverPublishThisSecret');
  const config = path.join(root, 'docs.config.yaml');
  const settings = { schemaVersion: 1, site: { title: 'Code reference demo' }, publications: { channels: { production: {} }, versions: { v1: {} }, defaults: { channel: 'production', version: 'v1', language: 'en' }, enabled: [{ channel: 'production', version: 'v1', language: 'en' }] }, outputs: { html: { highlighting: { provider: 'none' } } }, codeReferences: { sdk: { source: { kind: 'file', path: './snapshot.json' }, symbols: { 'sample': { documentId: 'reference.module', slug: '/reference/sample' }, 'sample.greet': { documentId: 'reference.greet', slug: '/reference/greet' } } } }, navigation: [{ id: 'reference', label: 'Reference', items: [{ id: 'module', doc: 'reference.module' }, { id: 'greet', doc: 'reference.greet' }] }] };
  await writeFile(config, JSON.stringify(settings));
  const output = path.join(root, 'site');
  const result = await compile(config, output);
  assert.equal(result.documents.length, 2);
  const markdown = await readFile(path.join(output, 'reference/greet.md'), 'utf8');
  const html = await readFile(path.join(output, 'reference/greet/index.html'), 'utf8');
  assert.match(markdown, /\| Parameter/);
  assert.match(html, /code-reference-table/);
  assert.match(html, /class="code-reference-table-scroll" role="region" aria-label="Parameters" tabindex="0"/);
  const moduleText = await readFile(path.join(output, 'reference/sample.md'), 'utf8');
  assert.match(moduleText, /\*\*Module\*\* `sample`/);
  assert.match(moduleText, /## Functions/);
  assert.doesNotMatch(moduleText, /## Methods/);
  assert.match(html, /code-reference-signature/);
  assert.match(markdown, /def greet/); assert.match(markdown, /Name to greet/);
  assert.match(markdown, /\/reference\/sample/);
  assert.doesNotMatch(markdown + html, /NeverPublishThisSecret|HiddenMarker|<script>alert|<Include/);
  assert.match(html, /Code API reference/);
  const search = await queryBuiltSite(output, 'greeting');
  assert.ok(search.results.some(result => result.url.includes('/reference/greet')));
  const pdf = await preparePdfExport(config);
  assert.equal(pdf.manifest.documents.length, 2);
  assert.match(JSON.stringify(pdf.input), /Name to greet/);
  assert.match(await readFile(path.join(output, 'llms.txt'), 'utf8'), /greet/);
  const exported = path.join(root, 'export');
  await exportContent(config, exported);
  const manifest = JSON.parse(await readFile(path.join(exported, 'manifest.json'), 'utf8'));
  const resources = manifest.resources.filter((r: any) => r.ref.kind === 'page');
  assert.equal(resources.length, 2);
  const exportedPage = resources.find((r: any) => r.ref.documentId === 'reference.greet');
  assert.match(await readFile(path.join(exported, exportedPage.representations.markdown.path), 'utf8'), /def greet/);
  const unsafe = snapshot(); unsafe.symbols[0].description = '[oops](javascript:alert)';
  await writeFile(path.join(root, 'snapshot.json'), JSON.stringify(unsafe));
  await assert.rejects(compile(config, output), /unsupported code reference prose URL/);
});

test('code reference input containment follows real paths', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-code-root-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'project'));
  await writeFile(path.join(root, 'outside.json'), JSON.stringify(snapshot()));
  await symlink(path.join(root, 'outside.json'), path.join(root, 'project', 'link.json'));
  await assert.rejects(readCodeReference(path.join(root, 'project', 'link.json'), path.join(root, 'project')), /escapes/);
});

test('product publications and feature grants prune generated references before search, discovery and delivery', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-code-profiles-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'content'));
  const v1 = { product: 'sdk', channel: 'production', version: 'v1', language: 'en' };
  const v2 = { ...v1, version: 'v2' };
  const data = snapshot(); data.symbols[1].description = 'OnlyInVersionOne';
  await writeFile(path.join(root, 'v1.json'), JSON.stringify(data));
  data.symbols[1].description = 'OnlyInVersionTwo';
  await writeFile(path.join(root, 'v2.json'), JSON.stringify(data));
  await writeFile(path.join(root, 'features.json'), JSON.stringify({ schemaVersion: 1, features: { advanced: {} }, skus: {} }));
  const profile = path.join(root, 'profile.json');
  await writeFile(profile, JSON.stringify({ schemaVersion: 1, features: [], publications: { enabled: [v2] } }));
  const settings: any = { schemaVersion: 1, site: { title: 'Scoped code references' }, profiles: { manifest: './features.json', pruneNavigation: true }, publications: { channels: { production: {} }, products: { sdk: { pathPrefix: '/sdk', defaultVersion: 'v2', versions: { v1: { pathPrefix: '/v1' }, v2: { pathPrefix: '/v2' } } } }, defaults: { product: 'sdk', channel: 'production', language: 'en' }, enabled: [v1, v2] }, outputs: { html: { highlighting: { provider: 'none' } } }, codeReferences: { sdk: { publications: [v1, v2].map(v => ({ ...v, source: { kind: 'file', path: `./${v.version}.json` } })), metadata: { shared: true }, symbols: { 'sample.greet': { metadata: { requires: { allOf: ['advanced'] } } } } } } };
  const config = path.join(root, 'docs.config.yaml');
  await writeFile(config, JSON.stringify(settings));
  const output = path.join(root, 'site');
  const result = await compile(config, output, {}, { profile });
  assert.equal(result.documents.length, 1);
  assert.equal(result.documents[0].variant.version, 'v2');
  for (const file of ['llms.txt', 'search-index.json', 'documents.sync.json']) {
    assert.doesNotMatch(await readFile(path.join(output, file), 'utf8'), /OnlyInVersionOne|OnlyInVersionTwo|HiddenMarker/);
  }
  const exported = path.join(root, 'export');
  await exportContent(config, exported, { profile });
  const manifest = JSON.parse(await readFile(path.join(exported, 'manifest.json'), 'utf8'));
  assert.equal(manifest.resources.length, 1);
  assert.equal(manifest.publication.version, 'v2');
  await writeFile(profile, JSON.stringify({ schemaVersion: 1, features: ['advanced'], publications: { enabled: [v2] } }));
  const granted = await compile(config, output, {}, { profile });
  assert.equal(granted.documents.length, 2);
  const method = granted.documents.find(doc => doc.id.endsWith('sample.greet'))!;
  assert.match(await readFile(path.join(output, method.markdownUrl), 'utf8'), /OnlyInVersionTwo/);
  assert.doesNotMatch(await readFile(path.join(output, method.markdownUrl), 'utf8'), /OnlyInVersionOne/);
  // Enforced requirements must participate in selection as they do for authored pages.
  settings.codeReferences.sdk.metadata = {};
  settings.frontmatter = { enforced: { requires: { allOf: ['advanced'] } } };
  await writeFile(config, JSON.stringify(settings));
  await writeFile(profile, JSON.stringify({ schemaVersion: 1, features: [], publications: { enabled: [v2] } }));
  assert.equal((await compile(config, output, {}, { profile })).documents.length, 0);
});

test('typed reference pages preserve explicit type targets, field facts, class declarations and safe source URLs across delivery', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-code-types-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'content'));
  const data = { ...snapshot(), symbols: [
    { id: 'sdk.Widget', name: 'Widget', kind: 'class', summary: 'A widget model.', description: 'A widget model.', signatures: ['class Widget(Base)'], bases: ['Base'], constructorSignature: 'Widget(name: str)', source: { path: 'sdk/models.py', line: 12 } },
    { id: 'sdk.Widget.parent', name: 'parent', parent: 'sdk.Widget', kind: 'attribute', annotation: 'Widget | None', required: false, default: 'None', typeReferences: { Widget: 'sdk.Widget' } },
    { id: 'sdk.Base', name: 'Base', kind: 'class' },
    { id: 'other.Widget', name: 'Widget', kind: 'class' },
    { id: 'sdk.list_widgets', name: 'list_widgets', kind: 'function', returns: { type: 'list[Widget]' }, typeReferences: { Widget: 'sdk.Widget' } }
  ] };
  const config = path.join(root, 'docs.config.yaml');
  const settings: any = { schemaVersion: 1, site: { title: 'Typed references' }, publications: { defaults: { channel: 'production', version: 'v1', language: 'en' }, channels: { production: {} }, versions: { v1: {} }, enabled: [{ channel: 'production', version: 'v1', language: 'en' }] }, outputs: { html: { highlighting: { provider: 'none' } } }, codeReferences: { sdk: { source: { kind: 'file', path: './snapshot.json' }, sourceLink: { baseUrl: 'https://github.com/example/sdk/blob/pinned/src' }, symbols: { 'sdk.Widget': { slug: '/widget' }, 'sdk.Widget.parent': { slug: '/parent' }, 'sdk.list_widgets': { slug: '/list' } } } } };
  await writeFile(path.join(root, 'snapshot.json'), JSON.stringify(data));
  await writeFile(config, JSON.stringify(settings));
  const output = path.join(root, 'site');
  await compile(config, output);
  const model = await readFile(path.join(output, 'widget.md'), 'utf8');
  assert.match(model, /Widget\(name: str\)/);
  assert.match(model, /Optional/); assert.match(model, /`None`/);
  assert.match(model, /https:\/\/github.com\/example\/sdk\/blob\/pinned\/src\/sdk\/models.py#L12/);
  assert.equal(model.match(/A widget model\./g)?.length, 1);
  const method = await readFile(path.join(output, 'list.md'), 'utf8');
  assert.match(method, /\[`Widget`\]\(\/widget.md\)/);
  const delivery = path.join(root, 'export');
  await exportContent(config, delivery);
  const manifest = JSON.parse(await readFile(path.join(delivery, 'manifest.json'), 'utf8'));
  const call = manifest.resources.find((r: any) => r.ref.documentId.endsWith('sdk.list_widgets'));
  assert.ok(call.representations.markdown.links.some((link: any) => link.ref?.documentId.endsWith('sdk.Widget')));
  settings.codeReferences.sdk.exclude = ['sdk.Widget'];
  await writeFile(config, JSON.stringify(settings));
  await compile(config, output);
  const pruned = await readFile(path.join(output, 'list.md'), 'utf8');
  assert.match(pruned, /Widget/); assert.doesNotMatch(pruned, /\[`Widget`\]/);
  settings.codeReferences.sdk.sourceLink.baseUrl = 'javascript:alert(1)';
  await writeFile(config, JSON.stringify(settings));
  await assert.rejects(compile(config, output), /Source links need an HTTPS/);
});

test('configurable class/module layouts and complete pages retain symbol URLs and scope inline content', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-code-layouts-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'content'));
  const data = { ...snapshot(), symbols: [
    { id: 'sample', name: 'sample', kind: 'module', description: 'Module introduction.' },
    { id: 'sample.Model', parent: 'sample', name: 'Model', kind: 'class', description: 'Class introduction.' },
    { id: 'sample.Model.get', parent: 'sample.Model', name: 'get', kind: 'method', description: 'MethodDetailMarker', returns: { type: 'Model' }, typeReferences: { Model: 'sample.Model' } },
    { id: 'sample.helper', parent: 'sample', name: 'helper', kind: 'function', description: 'FunctionDetailMarker', seeAlso: ['sample.Model.get'] },
    { id: 'sample.extra', parent: 'sample', name: 'extra', kind: 'function', description: 'RestrictedDetailMarker' },
    { id: 'sample._private', parent: 'sample', name: '_private', kind: 'class', visibility: 'private', description: 'PrivateDetailMarker' }
  ] };
  await writeFile(path.join(root, 'snapshot.json'), JSON.stringify(data));
  await writeFile(path.join(root, 'features.json'), JSON.stringify({ schemaVersion: 1, features: { advanced: {} }, skus: {} }));
  const profile = path.join(root, 'profile.json');
  await writeFile(profile, JSON.stringify({ schemaVersion: 1, features: [] }));
  const config = path.join(root, 'docs.config.yaml');
  const settings: any = { schemaVersion: 1, site: { title: 'Reference layouts' }, profiles: { manifest: './features.json' }, publications: { defaults: { channel: 'production', version: 'v1', language: 'en' }, channels: { production: {} }, versions: { v1: {} }, enabled: [{ channel: 'production', version: 'v1', language: 'en' }] }, outputs: { html: { highlighting: { provider: 'none' } } }, codeReferences: { sdk: { layout: 'classes', source: { kind: 'file', path: './snapshot.json' }, metadata: { shared: true }, singlePage: { documentId: 'reference.complete', slug: '/reference/all', title: 'Complete SDK' }, symbols: { sample: { slug: '/module' }, 'sample.Model': { slug: '/model' }, 'sample.Model.get': { slug: '/get' }, 'sample.extra': { metadata: { requires: { allOf: ['advanced'] } } } } } } };
  const output = path.join(root, 'site');
  await writeFile(config, JSON.stringify(settings));
  const manifest = await compile(config, output, {}, { profile });
  assert.equal(manifest.documents.length, 5);
  const model = await readFile(path.join(output, 'model.md'), 'utf8');
  assert.match(model, /MethodDetailMarker/);
  assert.match(model, /## sample.Model.get/);
  const module = await readFile(path.join(output, 'module.md'), 'utf8');
  assert.match(module, /FunctionDetailMarker/);
  assert.doesNotMatch(module, /## sample.Model.get/);
  assert.match(await readFile(path.join(output, 'get.md'), 'utf8'), /MethodDetailMarker/);
  const complete = await readFile(path.join(output, 'reference/all.md'), 'utf8');
  assert.match(complete, /MethodDetailMarker/); assert.match(complete, /FunctionDetailMarker/);
  assert.doesNotMatch(complete, /RestrictedDetailMarker|PrivateDetailMarker/);
  const html = await readFile(path.join(output, 'reference/all/index.html'), 'utf8');
  assert.match(html, /href="\/reference\/all#sample-model-get"/);
  assert.match(html, /id="sample-model-get"/);
  const delivered = path.join(root, 'export');
  await exportContent(config, delivered, { profile });
  const exported = JSON.parse(await readFile(path.join(delivered, 'manifest.json'), 'utf8'));
  const full = exported.resources.find((r: any) => r.ref.documentId === 'reference.complete');
  for (const format of ['html', 'markdown']) {
    assert.ok(full.representations[format].links.some((link: any) => link.ref?.documentId === 'reference.complete'));
    assert.doesNotMatch(await readFile(path.join(delivered, full.representations[format].path), 'utf8'), /RestrictedDetailMarker|PrivateDetailMarker/);
  }
  const pdf = await preparePdfExport(config, { profile, documents: ['reference.complete'] });
  assert.match(JSON.stringify(pdf.input), /MethodDetailMarker/);
  assert.doesNotMatch(JSON.stringify(pdf.input), /RestrictedDetailMarker|PrivateDetailMarker/);
  // Opt out of individual resources without losing selected symbol content.
  settings.codeReferences.sdk.symbolPages = false;
  await writeFile(config, JSON.stringify(settings));
  const compact = await compile(config, output, {}, { profile });
  assert.deepEqual(compact.documents.map((doc: any) => doc.id), ['reference.complete']);
  assert.match(await readFile(path.join(output, 'reference/all.md'), 'utf8'), /MethodDetailMarker/);
  assert.doesNotMatch(await readFile(path.join(output, 'reference/all.md'), 'utf8'), /RestrictedDetailMarker|PrivateDetailMarker/);
  for (const old of ['module.md', 'model.md', 'get.md', 'get/index.html']) await assert.rejects(readFile(path.join(output, old)), /ENOENT/);
  const compactSearch = JSON.parse(await readFile(path.join(output, 'search-index.json'), 'utf8'));
  assert.deepEqual(compactSearch.documents.map((doc: any) => doc.id), ['reference.complete']);
  assert.doesNotMatch(await readFile(path.join(output, 'llms.txt'), 'utf8'), /\/get\.md/);
  await exportContent(config, delivered, { profile });
  const compactExport = JSON.parse(await readFile(path.join(delivered, 'manifest.json'), 'utf8'));
  assert.deepEqual(compactExport.resources.map((r: any) => r.ref.documentId), ['reference.complete']);
  const compactFull = compactExport.resources[0];
  for (const format of ['html', 'markdown']) {
    const body = await readFile(path.join(delivered, compactFull.representations[format].path), 'utf8');
    assert.match(body, /MethodDetailMarker/);
    assert.doesNotMatch(body, /RestrictedDetailMarker|PrivateDetailMarker/);
    assert.ok(compactFull.representations[format].links.every((link: any) => !link.ref || link.ref.documentId === 'reference.complete'));
  }
  const compactPdf = await preparePdfExport(config, { profile, documents: ['reference.complete'] });
  assert.match(JSON.stringify(compactPdf.input), /MethodDetailMarker/);
  assert.doesNotMatch(JSON.stringify(compactPdf.input), /RestrictedDetailMarker|PrivateDetailMarker/);
  settings.codeReferences.sdk.singlePage = false;
  await writeFile(config, JSON.stringify(settings));
  await assert.rejects(compile(config, output, {}, { profile }), /requires a singlePage definition/);
  settings.codeReferences.sdk.symbolPages = true;
  settings.codeReferences.sdk.layout = 'modules';
  settings.codeReferences.sdk.singlePage = false;
  await writeFile(config, JSON.stringify(settings));
  const moduleLayout = await compile(config, output, {}, { profile });
  assert.equal(moduleLayout.documents.length, 4);
  assert.match(await readFile(path.join(output, 'module.md'), 'utf8'), /MethodDetailMarker/);
  assert.doesNotMatch(await readFile(path.join(output, 'model.md'), 'utf8'), /## sample.Model.get/);
  await assert.rejects(readFile(path.join(output, 'reference/all/index.html')), /ENOENT/);
  settings.codeReferences.sdk.layout = 'symbols';
  await writeFile(config, JSON.stringify(settings));
  await compile(config, output, {}, { profile });
  assert.doesNotMatch(await readFile(path.join(output, 'module.md'), 'utf8'), /## sample.helper|## sample.Model.get/);
  assert.doesNotMatch(await readFile(path.join(output, 'model.md'), 'utf8'), /## sample.Model.get/);
  // The same complete-page identity is safe across independently bound releases.
  const first = structuredClone(data);
  first.symbols.find(symbol => symbol.id === 'sample.Model.get')!.description = 'VersionOneOnly';
  const second = structuredClone(data);
  second.symbols.find(symbol => symbol.id === 'sample.Model.get')!.description = 'VersionTwoOnly';
  await writeFile(path.join(root, 'v1.json'), JSON.stringify(first));
  await writeFile(path.join(root, 'v2.json'), JSON.stringify(second));
  delete settings.codeReferences.sdk.source;
  settings.codeReferences.sdk.layout = 'modules';
  settings.codeReferences.sdk.singlePage = { documentId: 'reference.complete', slug: '/reference/all' };
  settings.codeReferences.sdk.symbolPages = false;
  settings.codeReferences.sdk.publications = ['v1', 'v2'].map(version => ({ channel: 'production', version, language: 'en', source: { kind: 'file', path: `./${version}.json` } }));
  settings.publications.versions.v2 = { pathPrefix: '/v2' };
  settings.publications.enabled.push({ channel: 'production', version: 'v2', language: 'en' });
  await writeFile(config, JSON.stringify(settings));
  await compile(config, output, {}, { profile });
  for (const [prefix, included, excluded] of [['', 'VersionOneOnly', 'VersionTwoOnly'], ['v2/', 'VersionTwoOnly', 'VersionOneOnly']]) {
    const body = await readFile(path.join(output, prefix, 'reference/all.md'), 'utf8');
    assert.ok(body.includes(included)); assert.ok(!body.includes(excluded));
  }
  settings.codeReferences.sdk.symbolPages = true;
  settings.codeReferences.sdk.singlePage.slug = '/module';
  await writeFile(config, JSON.stringify(settings));
  await assert.rejects(compile(config, output, {}, { profile }), /route collision/);
});
