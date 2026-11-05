import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import fs from 'node:fs';
import { EventEmitter } from 'node:events';
import { syncBuiltinESMExports } from 'node:module';
import { startDev } from './dev.js';

test('declared page edits rebuild even when native watchers deliver no notifications', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-dev-poll-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const fixture = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../example-configs/minimal');
  await cp(fixture, directory, { recursive: true });
  const watcher = t.mock.method(fs, 'watch', () => Object.assign(new EventEmitter(), { close() {} }) as fs.FSWatcher);
  syncBuiltinESMExports();
  t.after(() => { watcher.mock.restore(); syncBuiltinESMExports(); });
  const server = await startDev(path.join(directory, 'docs.config.yaml'), path.join(directory, 'site'), '127.0.0.1', 0);
  t.after(() => new Promise<void>(resolve => server.close(() => resolve())));
  const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const file = path.join(directory, 'content/welcome.mdx');
  await writeFile(file, `${await readFile(file, 'utf8')}\nChanged without a native notification.\n`);
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    if ((await (await fetch(origin)).text()).includes('Changed without a native notification.')) return;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  assert.fail('Declared page change was lost without a native notification');
});

test('dev server closes with a live reload connection open', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-dev-close-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const example = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../example/docs.config.yaml');
  const server = await startDev(example, path.join(directory, 'site'), '127.0.0.1', 0);
  const port = (server.address() as { port: number }).port;
  const response = await fetch(`http://127.0.0.1:${port}/__shoalrun/reload`);
  assert.equal(response.headers.get('content-type'), 'text/event-stream');
  const reader = response.body!.getReader();
  assert.match(new TextDecoder().decode((await reader.read()).value), /connected/);

  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())),
      new Promise<never>((_resolve, reject) => { timeout = setTimeout(() => reject(new Error('Dev server did not close with a live reload client')), 2000); }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
  assert.equal((await reader.read()).done, true);
});

test('customer preview watches external edition inputs, removes excluded output, and exposes stale failures', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-dev-profile-'));
  const project = path.join(directory, 'project');
  const customer = path.join(directory, 'customer');
  await mkdir(path.join(project, 'content'), { recursive: true });
  await mkdir(customer);
  const config = path.join(project, 'docs.config.yaml');
  const manifestFile = path.join(customer, 'skus.yaml');
  const profile = path.join(customer, 'edition.yaml');
  const favicon = path.join(customer, 'brand.svg');
  const icon = (title: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><title>${title}</title><rect width="16" height="16"/></svg>`;
  await writeFile(favicon, icon('FirstBrand'));
  const publication = { channel: 'production', version: 'current', language: 'en' };
  const versioned = { ...publication, version: 'v1' };
  await writeFile(config, JSON.stringify({
    schemaVersion: 1,
    profiles: { manifest: '../customer/skus.yaml', pruneNavigation: true },
    site: { title: 'Customer documentation', contentDir: 'content' },
    publications: { defaults: publication, channels: { production: {} }, versions: { current: {}, v1: { pathPrefix: '/v1' } }, enabled: [publication, versioned] },
    frontmatter: { defaults: { type: 'guide', language: 'en', access: { policy: 'public' } } },
    navigation: [{ id: 'home', doc: 'guide.home' }, { id: 'a', doc: 'guide.a' }, { id: 'b', doc: 'guide.b' }],
    outputs: { html: { highlighting: { provider: 'none' }, shareImages: false } },
  }));
  const manifest = (grants: string[]) => JSON.stringify({ schemaVersion: 1, features: { a: {}, b: {} }, skus: { suite: { revisions: { current: { features: grants } } } } });
  await writeFile(manifestFile, manifest(['a']));
  const selection = (version = 'current', asset = 'brand.svg') => JSON.stringify({ schemaVersion: 1, skus: [{ id: 'suite', revision: 'current' }], site: { favicon: asset }, publications: { enabled: [{ ...publication, version }] } });
  await writeFile(profile, selection());
  const page = async (name: string, body: string, extra = {}) => writeFile(path.join(project, 'content', `${name}.mdx`), `---\n${JSON.stringify({ id: `guide.${name}`, title: `Guide ${name}`, summary: `Instructions for ${name}.`, slug: name === 'home' ? '/' : `/${name}`, publications: [publication, versioned].map(({ channel, version }) => ({ channel, version })), ...extra })}\n---\n\n${body}\n`);
  await page('home', 'SharedInstructions\n\n<ForFeature allOf="a">\n\nFeatureASection\n\n</ForFeature>\n\n<ForFeature allOf="b">\n\nFeatureBSection\n\n</ForFeature>');
  await page('a', 'FeatureAPage', { requires: { allOf: ['a'] } });
  await page('b', 'FeatureBPage\n\n![B asset](./b-only.svg)', { requires: { allOf: ['b'] } });
  await writeFile(path.join(project, 'content', 'b-only.svg'), '<svg xmlns="http://www.w3.org/2000/svg"><title>FeatureBAsset</title></svg>');
  const output = path.join(project, 'dist');
  const server = await startDev(config, output, '127.0.0.1', 0, { profile });
  t.after(async () => { await new Promise<void>(resolve => server.close(() => resolve())); await rm(directory, { recursive: true, force: true }); });
  const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const pageText = async (route = '/') => (await fetch(origin + route)).text();
  const waitFor = async (check: () => Promise<boolean>, label: string) => {
    for (const deadline = Date.now() + 12_000; Date.now() < deadline; await new Promise(resolve => setTimeout(resolve, 100))) if (await check()) return;
    assert.fail(label);
  };
  assert.match(await pageText(), /Customer preview: edition.yaml/);
  assert.match(await pageText(), /FeatureASection/);
  assert.doesNotMatch(await pageText(), /FeatureBSection/);
  assert.equal((await fetch(origin + '/b.md')).status, 404);
  assert.match(await pageText('/favicon.svg'), /FirstBrand/);
  await writeFile(favicon, icon('SecondBrand'));
  await waitFor(async () => (await pageText('/favicon.svg')).includes('SecondBrand'), 'External customer asset did not rebuild the edition');
  // Editing an external manifest changes the selected feature set without restarting.
  await writeFile(manifestFile, manifest(['b']));
  await waitFor(async () => (await pageText()).includes('FeatureBSection'), 'External SKU manifest did not rebuild the customer edition');
  assert.equal((await fetch(origin + '/a.md')).status, 404);
  assert.match(await pageText('/b.md'), /FeatureBPage/);
  const firstBuild = JSON.parse(await readFile(path.join(output, 'documents.json'), 'utf8')).buildId;
  // An editor's atomic profile replacement must also trigger the watch.
  await writeFile(profile + '.next', selection('v1'));
  await rename(profile + '.next', profile);
  await waitFor(async () => (await fetch(origin + '/v1/b.md')).status === 200, 'External profile replacement did not switch publication versions');
  assert.equal((await fetch(origin + '/b.md')).status, 404);
  assert.match(await pageText('/v1/'), /FeatureBSection/);
  assert.match(await pageText('/v1/'), /update\.routes.*update\.home/);
  const successful = JSON.parse(await readFile(path.join(output, 'documents.json'), 'utf8'));
  assert.notEqual(successful.buildId, firstBuild);
  assert.deepEqual(successful.documents.map((document: { url: string }) => document.url).sort(), ['/v1', '/v1/b']);
  // The failed edition is not substituted with an unrestricted build. New tabs see the failure too.
  await writeFile(profile, '{invalid');
  await waitFor(async () => (await pageText('/v1/')).includes('id="shoalrun-build-status" role="alert"'), 'Fresh page did not disclose failed profile rebuild');
  assert.match(await pageText('/v1/'), /role="alert"/);
  assert.match(await pageText('/v1/'), /Customer preview: edition.yaml/);
  assert.equal(JSON.parse(await readFile(path.join(output, 'documents.json'), 'utf8')).buildId, successful.buildId);
  const controller = new AbortController();
  const events = await fetch(origin + '/__shoalrun/reload', { signal: controller.signal });
  const reader = events.body!.getReader();
  assert.match(new TextDecoder().decode((await reader.read()).value), /event: failed/);
  controller.abort();
  await writeFile(profile, selection('v1'));
  await waitFor(async () => !(await pageText('/v1/')).includes('id="shoalrun-build-status" role="alert"'), 'Valid profile did not recover from failed rebuild');
  await writeFile(manifestFile, manifest(['a']));
  await waitFor(async () => (await fetch(origin + '/v1/a.md')).status === 200, 'Recovered preview did not keep watching external grants');
  assert.equal((await fetch(origin + '/v1/b.md')).status, 404);
  const search = await readFile(path.join(output, 'search-index.json'), 'utf8');
  assert.doesNotMatch(search, /FeatureBPage|FeatureBSection/);
  const svgFiles = (await readdir(output, { recursive: true })).filter(file => file.endsWith('.svg'));
  for (const file of svgFiles) assert.doesNotMatch(await readFile(path.join(output, file), 'utf8'), /FeatureBAsset/);
  const lastSuccessful = JSON.parse(await readFile(path.join(output, 'documents.json'), 'utf8')).buildId;
  // A newly declared asset and its parent directory do not exist yet. Creating
  // only that explicit asset must recover without another profile edit.
  await writeFile(profile, selection('v1', 'new-brand/fresh.svg'));
  await waitFor(async () => (await pageText('/v1/')).includes('id="shoalrun-build-status" role="alert"'), 'Missing external asset did not disclose failure');
  assert.equal(JSON.parse(await readFile(path.join(output, 'documents.json'), 'utf8')).buildId, lastSuccessful);
  assert.match(await pageText('/favicon.svg'), /SecondBrand/);
  await mkdir(path.join(customer, 'new-brand'));
  await writeFile(path.join(customer, 'new-brand/fresh.svg'), icon('FreshBrand'));
  await waitFor(async () => (await pageText('/favicon.svg')).includes('FreshBrand') && !(await pageText('/v1/')).includes('id="shoalrun-build-status" role="alert"'), 'Creating the declared external asset did not repair preview');
  // A malformed asset target exists but is not a regular file. Replacing only
  // that target must also recover while the profile stays unchanged.
  await mkdir(path.join(customer, 'broken.svg'));
  await writeFile(profile, selection('v1', 'broken.svg'));
  await waitFor(async () => (await pageText('/v1/')).includes('id="shoalrun-build-status" role="alert"'), 'Invalid external asset did not disclose failure');
  assert.match(await pageText('/favicon.svg'), /FreshBrand/);
  await rm(path.join(customer, 'broken.svg'), { recursive: true });
  await writeFile(path.join(customer, 'broken.svg'), icon('RepairedBrand'));
  await waitFor(async () => (await pageText('/favicon.svg')).includes('RepairedBrand') && !(await pageText('/v1/')).includes('id="shoalrun-build-status" role="alert"'), 'Repairing the declared external asset did not recover preview');
});

test('dev rebuilds when an included file outside the project changes', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-dev-external-'));
  const project = path.join(directory, 'project');
  const fixture = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../example-configs/minimal');
  await cp(fixture, project, { recursive: true });
  const config = path.join(project, 'docs.config.yaml');
  const original = await readFile(config, 'utf8');
  await writeFile(config, original.replace('site:\n  title: Acme handbook', 'site:\n  $include: ../site.yaml'));
  const shared = path.join(directory, 'site.yaml');
  await writeFile(shared, 'title: First handbook\n');
  const server = await startDev(config, path.join(project, 'dist'), '127.0.0.1', 0);
  t.after(async () => { await new Promise<void>(resolve => server.close(() => resolve())); await rm(directory, { recursive: true, force: true }); });
  const port = (server.address() as { port: number }).port;
  const page = async () => (await fetch(`http://127.0.0.1:${port}/`)).text();
  assert.match(await page(), /First handbook/);
  await writeFile(shared, 'title: Second handbook\n');
  for (const deadline = Date.now() + 8000; Date.now() < deadline; await new Promise(resolve => setTimeout(resolve, 100))) {
    if ((await page()).includes('Second handbook')) return;
  }
  assert.fail('External config change did not rebuild the site');
});
