import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { compile } from './compiler.js';
import { queryBuiltSite } from './search-query.js';

const build = (config: string, output: string, sourceCommit?: string) =>
  compile(config, output, sourceCommit ? { sourceCommit } : {}, { apiReview: 'report' });

function git(directory: string, ...args: string[]): string {
  const result = spawnSync('git', ['-c', 'user.name=Shoalrun Test', '-c', 'user.email=test@example.test', '-c', 'commit.gpgsign=false', ...args], { cwd: directory, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

function page(id: string, slug: string, channel: string, version: string, body: string): string {
  return `---\nid: ${id}\ntitle: ${id}\nsummary: ${id}\ntype: guide\nslug: ${slug}\nchannel: ${channel}\nversion: ${version}\nlanguage: en\naccess: { policy: public }\n---\n${body}\n`;
}

test('different Git branches build independent docs domains with their own commit records', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-branches-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const repository = path.join(root, 'repo');
  await mkdir(path.join(repository, 'content'), { recursive: true });
  const configFile = path.join(repository, 'docs.config.yaml');
  const pageFile = path.join(repository, 'content/home.mdx');
  const writeBranch = async (channel: string, origin: string, body: string) => {
    await writeFile(configFile, JSON.stringify({
      schemaVersion: 1, site: { title: 'Branch docs', origin },
      publications: { defaults: { channel, version: 'current', language: 'en' }, channels: { [channel]: {} }, versions: { current: {} }, enabled: [{ channel, version: 'current', language: 'en' }] },
      outputs: { html: { highlighting: { provider: 'none' } } }
    }));
    await writeFile(pageFile, page('guide.home', '/', channel, 'current', body));
  };
  git(repository, 'init', '-q', '-b', 'main');
  await writeBranch('production', 'https://docs.example.com', 'Production branch content.');
  git(repository, 'add', '.');
  git(repository, 'commit', '-qm', 'Publish production docs');
  const productionCommit = git(repository, 'rev-parse', 'HEAD');
  git(repository, 'switch', '-qc', 'sandbox');
  await writeBranch('sandbox', 'https://sandbox-docs.example.com', 'Sandbox branch content.');
  git(repository, 'add', '.');
  git(repository, 'commit', '-qm', 'Publish sandbox docs');
  const sandboxCommit = git(repository, 'rev-parse', 'HEAD');

  const sandboxOutput = path.join(root, 'sandbox-output');
  const sandbox = await build(configFile, sandboxOutput, sandboxCommit);
  assert.deepEqual(sandbox.documents.map(doc => [doc.variant.channel, doc.url]), [['sandbox', '/']]);
  const sandboxHtml = await readFile(path.join(sandboxOutput, 'index.html'), 'utf8');
  assert.match(sandboxHtml, /Sandbox branch content/);
  assert.match(sandboxHtml, /https:\/\/sandbox-docs\.example\.com/);
  assert.doesNotMatch(sandboxHtml, /Production branch content|https:\/\/docs\.example\.com/);
  assert.equal(JSON.parse(await readFile(path.join(sandboxOutput, 'build-info.json'), 'utf8')).sourceCommit, sandboxCommit);

  git(repository, 'switch', '-q', 'main');
  const productionOutput = path.join(root, 'production-output');
  const production = await build(configFile, productionOutput, productionCommit);
  assert.deepEqual(production.documents.map(doc => [doc.variant.channel, doc.url]), [['production', '/']]);
  const productionHtml = await readFile(path.join(productionOutput, 'index.html'), 'utf8');
  assert.match(productionHtml, /Production branch content/);
  assert.match(productionHtml, /https:\/\/docs\.example\.com/);
  assert.doesNotMatch(productionHtml, /Sandbox branch content|sandbox-docs\.example\.com/);
  assert.equal(JSON.parse(await readFile(path.join(productionOutput, 'build-info.json'), 'utf8')).sourceCommit, productionCommit);
  assert.notEqual(productionCommit, sandboxCommit);
});

test('one build keeps prod/sbx and v1/v2 pages, links, search, and API contracts in their publication', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-versions-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'content'));
  const variants = [
    { channel: 'production', version: 'v1', marker: 'ProductionOne' },
    { channel: 'production', version: 'v2', marker: 'ProductionTwo' },
    { channel: 'sandbox', version: 'v1', marker: 'SandboxOne' },
    { channel: 'sandbox', version: 'v2', marker: 'SandboxTwo' }
  ];
  const source = (marker: string) => `openapi: 3.1.0\ninfo: { title: ${marker}, version: '1' }\npaths:\n  /items:\n    get:\n      operationId: listItems\n      summary: ${marker} endpoint\n      responses:\n        '200': { description: ${marker} response }\n`;
  for (const variant of variants) {
    const suffix = `${variant.channel}-${variant.version}`;
    await writeFile(path.join(root, `${suffix}.yaml`), source(variant.marker));
    await writeFile(path.join(root, 'content', `${suffix}.mdx`), page('guide.start', '/start', variant.channel, variant.version, `${variant.marker} guide. [API reference](doc:reference.catalog.listItems)`));
  }
  await writeFile(path.join(root, 'content', 'shared.mdx'), `---\nid: guide.shared\ntitle: Shared guide\nsummary: One guide across all publications.\ntype: guide\nslug: /shared\npublications:\n${variants.map(({ channel, version }) => `  - { channel: ${channel}, version: ${version} }`).join('\n')}\nlanguage: en\naccess: { policy: public }\n---\nShared instructions. [API reference](doc:reference.catalog.listItems)\n`);
  await writeFile(path.join(root, 'content', 'partial.mdx'), page('guide.partial', '/partial', 'production', 'v1', 'This page has one published variant.'));
  const configFile = path.join(root, 'docs.config.yaml');
  await writeFile(configFile, JSON.stringify({
    schemaVersion: 1, site: { title: 'Versioned docs' },
    publications: {
      defaults: { channel: 'production', version: 'v1', language: 'en' },
      channels: { production: {}, sandbox: { pathPrefix: '/sandbox' } },
      versions: { v1: { pathPrefix: '/v1' }, v2: { pathPrefix: '/v2' } },
      enabled: variants.map(({ channel, version }) => ({ channel, version, language: 'en' }))
    },
    apis: { catalog: {
      source: { kind: 'file', path: './production-v1.yaml' },
      publications: variants.slice(1).map(({ channel, version }) => ({ channel, version, source: { kind: 'file', path: `./${channel}-${version}.yaml` } })),
      generateReferences: true
    } },
    navigation: [{ id: 'start', doc: 'guide.start' }],
    outputs: { html: { highlighting: { provider: 'none' }, search: { provider: 'lexical' } } }
  }));
  const output = path.join(root, 'site');
  const manifest = await build(configFile, output);
  assert.equal(manifest.documents.length, 13);
  const compact = await readFile(path.join(output, 'llms.min.txt'), 'utf8');
  for (const { channel, version } of variants) assert.ok(compact.includes(`(${channel}/${version}/en)`), 'compact entries identify each publication');
  assert.match(compact, /Choose the matching channel\/version\/language/);
  for (const { channel, version, marker } of variants) {
    const variant = `${channel}|${version}|en`;
    const prefix = `${channel === 'sandbox' ? '/sandbox' : ''}/${version}`;
    const guide = manifest.documents.find(doc => doc.id === 'guide.start' && `${doc.variant.channel}|${doc.variant.version}|${doc.variant.language}` === variant);
    const reference = manifest.documents.find(doc => doc.id === 'reference.catalog.listItems' && `${doc.variant.channel}|${doc.variant.version}|${doc.variant.language}` === variant);
    assert.equal(guide?.url, `${prefix}/start`);
    assert.ok(reference?.url.startsWith(`${prefix}/reference/catalog/`));
    const guideHtml = await readFile(path.join(output, `${prefix}/start/index.html`), 'utf8');
    const sharedHtml = await readFile(path.join(output, `${prefix}/shared/index.html`), 'utf8');
    const referenceHtml = await readFile(path.join(output, `${reference!.url}/index.html`), 'utf8');
    const referenceMarkdown = await readFile(path.join(output, `${reference!.url}.md`), 'utf8');
    assert.match(guideHtml, /<nav class="publication-switcher" aria-label="Switch documentation version">/);
    assert.match(referenceHtml, /<nav class="publication-switcher" aria-label="Switch documentation version">/);
    for (const alternate of variants) {
      const alternateUrl = `${alternate.channel === 'sandbox' ? '/sandbox' : ''}/${alternate.version}/start`;
      assert.ok(guideHtml.includes(`href="${alternateUrl}"`));
    }
    assert.match(guideHtml, new RegExp(`<a href="${guide!.url}" aria-current="page">`));
    assert.ok(guideHtml.includes(`href="${reference!.url}"`));
    assert.ok(sharedHtml.includes(`href="${reference!.url}"`));
    assert.match(guideHtml, new RegExp(`${marker} guide`));
    assert.match(referenceMarkdown, new RegExp(`${marker} endpoint`));
    for (const other of variants.filter(other => other.marker !== marker)) {
      assert.doesNotMatch(guideHtml, new RegExp(`${other.marker} guide`));
      assert.doesNotMatch(referenceMarkdown, new RegExp(`${other.marker} endpoint`));
    }
    const search = await queryBuiltSite(output, marker, { channel, version, language: 'en' });
    assert.equal(search.publication.channel, channel);
    assert.equal(search.publication.version, version);
    assert.ok(search.results.some(result => result.url === guide!.url));
    assert.ok(search.results.every(result => result.url.startsWith(prefix)));
  }
  const partial = await readFile(path.join(output, 'v1/partial/index.html'), 'utf8');
  assert.match(partial, /publication-switcher/);
  assert.match(partial, /page unavailable; open overview/);
  assert.match(partial, /href="\/v2\/start"/);
  await assert.rejects(queryBuiltSite(output, 'guide'), /multiple publications/);
});

test('one source page can publish in selected versions with version-specific sections', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-shared-versions-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'content'));
  const configFile = path.join(root, 'docs.config.yaml');
  await writeFile(configFile, JSON.stringify({
    schemaVersion: 1, site: { title: 'Shared docs' },
    publications: {
      defaults: { channel: 'production', version: 'v1', language: 'en' },
      channels: { production: {} },
      versions: { v1: { pathPrefix: '/v1' }, v2: { pathPrefix: '/v2' }, v3: { pathPrefix: '/v3' } },
      enabled: [{ channel: 'production', version: 'v1', language: 'en' }, { channel: 'production', version: 'v2', language: 'en' }]
    },
    outputs: { html: { highlighting: { provider: 'none' }, search: { provider: 'lexical' } } }
  }));
  const shared = `---\nid: guide.start\ntitle: Start here\nsummary: Shared instructions.\ntype: guide\nslug: /start\npublications:\n  - { channel: production, version: v1 }\n  - { channel: production, version: v2 }\n  - { channel: production, version: v3 }\nlanguage: en\naccess: { policy: public }\n---\n\nShared setup.\n\n<ForPublication version="v1">\n\nUse the LegacyKey.\n\n</ForPublication>\n\n<ForPublication version="v2">\n\nUse the ModernKey. [Advanced setup](doc:guide.advanced)\n\n</ForPublication>\n`;
  await writeFile(path.join(root, 'content/start.mdx'), shared);
  await writeFile(path.join(root, 'content/advanced.mdx'), page('guide.advanced', '/advanced', 'production', 'v2', 'Only in v2.'));
  const output = path.join(root, 'site');
  const manifest = await build(configFile, output);
  assert.deepEqual(manifest.documents.filter(doc => doc.id === 'guide.start').map(doc => doc.url), ['/v1/start', '/v2/start']);
  assert.deepEqual(manifest.documents.filter(doc => doc.id === 'guide.advanced').map(doc => doc.url), ['/v2/advanced']);
  for (const version of ['v1', 'v2']) {
    const html = await readFile(path.join(output, version, 'start/index.html'), 'utf8');
    const markdown = await readFile(path.join(output, version, 'start.md'), 'utf8');
    assert.match(html, /Shared setup/);
    assert.match(markdown, /Shared setup/);
    assert.ok(html.includes('href="/v1/start"'));
    assert.ok(html.includes('href="/v2/start"'));
    assert.ok(!html.includes('href="/v3/start"'));
    assert.equal(html.includes('LegacyKey'), version === 'v1');
    assert.equal(html.includes('ModernKey'), version === 'v2');
    assert.equal(markdown.includes('LegacyKey'), version === 'v1');
    assert.equal(markdown.includes('ModernKey'), version === 'v2');
    assert.equal(markdown.includes('/v2/advanced'), version === 'v2');
    const search = await queryBuiltSite(output, version === 'v1' ? 'LegacyKey' : 'ModernKey', { channel: 'production', version, language: 'en' });
    assert.ok(search.results.some(result => result.url === `/${version}/start`));
  }
  const advanced = await readFile(path.join(output, 'v2/advanced/index.html'), 'utf8');
  assert.match(advanced, /production · v1 · page unavailable; open overview/);
  await assert.rejects(readFile(path.join(output, 'v1/advanced/index.html'), 'utf8'));
  await writeFile(path.join(root, 'content/start.mdx'), shared.replace('  - { channel: production, version: v3 }', '  - { channel: production, version: v2 }'));
  await assert.rejects(build(configFile, path.join(root, 'invalid')), /duplicate channel\/version pairs/i);
  await writeFile(path.join(root, 'content/start.mdx'), shared.replace('ForPublication version="v1"', 'ForPublication version="missing"'));
  await assert.rejects(build(configFile, path.join(root, 'invalid')), /unknown version missing/i);
});

test('version menu links matching pages from another domain or URL prefix', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-external-versions-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const sandboxRoot = path.join(root, 'sandbox');
  const productionRoot = path.join(root, 'production');
  await mkdir(path.join(sandboxRoot, 'content'), { recursive: true });
  await mkdir(path.join(productionRoot, 'content'), { recursive: true });
  const config = (channel: string) => ({
    schemaVersion: 1, site: { title: `${channel} docs` },
    publications: { defaults: { channel, version: 'v1', language: 'en' }, channels: { [channel]: {} }, versions: { v1: {} }, enabled: [{ channel, version: 'v1', language: 'en' }] },
    outputs: { html: { highlighting: { provider: 'none' } } }
  });
  const sandboxConfig = path.join(sandboxRoot, 'docs.config.yaml');
  await writeFile(sandboxConfig, JSON.stringify(config('sandbox')));
  await writeFile(path.join(sandboxRoot, 'content/start.mdx'), page('guide.start', '/start', 'sandbox', 'v1', 'Sandbox page.'));
  const sandboxOutput = path.join(sandboxRoot, 'site');
  await build(sandboxConfig, sandboxOutput);

  const productionConfig = path.join(productionRoot, 'docs.config.yaml');
  const settings: any = config('production');
  settings.publications.externalSites = [{ label: 'Sandbox docs', baseUrl: 'https://sandbox-docs.example.com' }];
  await writeFile(productionConfig, JSON.stringify(settings));
  await writeFile(path.join(productionRoot, 'content/start.mdx'), page('guide.start', '/start', 'production', 'v1', 'Production page.'));
  await writeFile(path.join(productionRoot, 'content/only.mdx'), page('guide.only', '/only', 'production', 'v1', 'Production only.'));
  const productionOutput = path.join(productionRoot, 'site');
  await build(productionConfig, productionOutput);
  let html = await readFile(path.join(productionOutput, 'start/index.html'), 'utf8');
  assert.match(html, /<nav class="publication-switcher"/);
  assert.match(html, /href="https:\/\/sandbox-docs\.example\.com\/">Sandbox docs<\/a>/);
  assert.match(await readFile(path.join(productionOutput, 'only/index.html'), 'utf8'), /href="https:\/\/sandbox-docs\.example\.com\/"/);

  settings.publications.externalSites[0] = { label: 'Sandbox', baseUrl: 'https://sandbox-docs.example.com', manifest: '../sandbox/site/documents.json' };
  await writeFile(productionConfig, JSON.stringify(settings));
  const built = await build(productionConfig, productionOutput);
  html = await readFile(path.join(productionOutput, 'start/index.html'), 'utf8');
  assert.match(html, /href="https:\/\/sandbox-docs\.example\.com\/start">Sandbox · v1<\/a>/);
  assert.match(html, /href="\/start" aria-current="page">production · v1<\/a>/);
  assert.ok(built.dependencies.includes(path.join(sandboxOutput, 'documents.json')));
  assert.doesNotMatch(await readFile(path.join(productionOutput, 'only/index.html'), 'utf8'), /publication-switcher/);

  settings.publications.externalSites[0] = { label: 'Sandbox', baseUrl: 'https://preview.example.com/docs/sandbox', manifest: '../sandbox/site/documents.json' };
  await writeFile(productionConfig, JSON.stringify(settings));
  await build(productionConfig, productionOutput);
  html = await readFile(path.join(productionOutput, 'start/index.html'), 'utf8');
  assert.match(html, /href="https:\/\/preview\.example\.com\/docs\/sandbox\/start"/);

  const externalManifest = path.join(sandboxOutput, 'documents.json');
  const malformed = JSON.parse(await readFile(externalManifest, 'utf8'));
  malformed.documents[0].url = '//other.example.com/start';
  await writeFile(externalManifest, JSON.stringify(malformed));
  await assert.rejects(build(productionConfig, productionOutput), /manifest has an invalid document identity, publication, or URL/);

  settings.publications.externalSites[0] = { label: 'Sandbox', baseUrl: 'javascript:alert(1)', manifest: '../sandbox/site/documents.json' };
  await writeFile(productionConfig, JSON.stringify(settings));
  await assert.rejects(build(productionConfig, productionOutput), /baseUrl must be an HTTP\(S\) URL/);
});
