import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, readdir, rm, symlink } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { compile } from './compiler.js';
import { exportContent } from './content-export.js';
import { loadConfig } from './config.js';
import { authoringValidationStatus, validateAuthoringChanges } from './authoring-validation.js';
import { writeAuthoringBaseline } from './authoring-snapshot.js';
import { generatedOperationIdentity } from './api-identity.js';
import { featureRequirements, matchesFeatures } from './deployment-profile.js';

const json = (value: unknown) => JSON.stringify(value, null, 2) + '\n';
const publication = { channel: 'production', version: 'current', language: 'en' };
const execFile = promisify(execFileCallback);
const cli = fileURLToPath(new URL('./cli.js', import.meta.url));
async function fixture(t: TestContext) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-profile-project-'));
  // Independent mount: deliberately not a child or sibling of the project root.
  const mount = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-profile-mount-'));
  t.after(async () => { await rm(root, { recursive: true, force: true }); await rm(mount, { recursive: true, force: true }); });
  const project = path.join(root, 'workspace', 'docs');
  await mkdir(path.join(project, 'content'), { recursive: true });
  const config = path.join(project, 'docs.config.yaml');
  const settings = {
    schemaVersion: 1, profiles: { manifest: './skus.yaml', pruneNavigation: true },
    site: { title: 'Shared documentation', contentDir: 'content', origin: 'https://docs.example.com' },
    publications: { defaults: publication, channels: { production: {} }, versions: { current: {}, v1: { pathPrefix: '/v1' } }, enabled: [publication, { ...publication, version: 'v1' }] },
    frontmatter: { defaults: { type: 'guide', ...publication, access: { policy: 'public' } } },
    navigation: [{ id: 'home', doc: 'guide.home' }, { id: 'products', label: 'Products', items: ['a', 'b', 'both', 'classic', 'old'].map(id => ({ id, doc: `guide.${id}` })) }],
    outputs: { html: { highlighting: { provider: 'none' }, shareImages: false } },
    audit: { links: true, api: true, focusedContracts: true }
  };
  const manifest = { schemaVersion: 1, features: { a: {}, b: {}, classic: { lifecycle: 'retired' } }, skus: { suite: { revisions: { '2025': { features: ['a', 'classic'] }, '2026': { features: ['a', 'b'] } } } } };
  await writeFile(config, json(settings));
  await writeFile(path.join(project, 'skus.yaml'), json(manifest));
  const page = async (id: string, body: string, extra: Record<string, unknown> = {}) => writeFile(path.join(project, 'content', `${id}.mdx`), `---\n${json({ id: `guide.${id}`, title: `Guide ${id}`, summary: `Instructions for ${id}.`, slug: id === 'home' ? '/' : `/${id}`, ...extra })}---\n\n${body}\n`);
  await page('home', 'SharedInstructions\n\n<ForFeature allOf="a">\n\n## Selected instructions <Anchor id="a-instructions" />\n\nFeatureASection [A guide](doc:guide.a)\n\n</ForFeature>\n\n<ForFeature allOf="b">\n\nFeatureBSection\n\n![B image](./b-only.svg)\n\n</ForFeature>');
  await writeFile(path.join(project, 'content/b-only.svg'), '<svg xmlns="http://www.w3.org/2000/svg"><title>FeatureBAsset</title></svg>');
  await page('a', 'FeatureAOnly', { requires: { allOf: ['a'] } });
  await page('b', 'FeatureBOnly', { requires: { anyOf: ['b'] } });
  await page('both', 'IntegrationBothOnly', { requires: { allOf: ['a', 'b'] } });
  await page('classic', 'GrandfatheredClassicOnly', { requires: { allOf: ['classic'] } });
  await page('old', 'OldVersionOnly', { version: 'v1', requires: { allOf: ['classic'] } });
  const profile = async (name: string, value: Record<string, unknown>) => {
    const directory = path.join(mount, name);
    await mkdir(directory, { recursive: true });
    const file = path.join(directory, 'profile.yaml');
    await writeFile(file, json({ schemaVersion: 1, ...value }));
    return file;
  };
  return { root, mount, project, config, settings, manifest, page, profile };
}
async function files(directory: string): Promise<Array<[string, Buffer]>> {
  const result: Array<[string, Buffer]> = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await files(file));
    else result.push([file, await readFile(file)]);
  }
  return result;
}

test('independent deployment profiles resolve SKU revisions and direct legacy grants across every emitted file', async t => {
  const f = await fixture(t);
  for (const [name, profile, expected, excluded] of [
    ['empty', { features: [] }, ['home'], ['FeatureAOnly', 'FeatureASection', 'FeatureBOnly', 'FeatureBSection', 'FeatureBAsset', 'IntegrationBothOnly', 'GrandfatheredClassicOnly', 'OldVersionOnly']],
    ['a', { features: ['a'] }, ['home', 'a'], ['FeatureBOnly', 'FeatureBSection', 'FeatureBAsset', 'IntegrationBothOnly', 'GrandfatheredClassicOnly', 'OldVersionOnly']],
    ['b', { features: ['b'] }, ['home', 'b'], ['FeatureAOnly', 'FeatureASection', 'IntegrationBothOnly', 'GrandfatheredClassicOnly', 'OldVersionOnly']],
    ['bundle', { skus: [{ id: 'suite', revision: '2026' }] }, ['home', 'a', 'b', 'both'], ['GrandfatheredClassicOnly', 'OldVersionOnly']],
    ['legacy', { features: ['classic'], publications: { enabled: [publication] } }, ['home', 'classic'], ['FeatureAOnly', 'FeatureBOnly', 'OldVersionOnly']]
  ] as const) {
    const profileFile = await f.profile(name, profile);
    const output = path.join(f.root, 'dist', name);
    const manifest = await compile(f.config, output, {}, { profile: profileFile });
    assert.deepEqual(manifest.documents.map(doc => doc.id).sort(), expected.map(id => `guide.${id}`).sort());
    for (const [file, bytes] of await files(output)) {
      const body = bytes.toString('utf8');
      for (const marker of excluded) assert.ok(!body.includes(marker), `${name}: ${file} contains ${marker}`);
      assert.ok(!body.includes(profileFile), file);
      assert.ok(!body.includes('profile-selection'), file);
      assert.ok(!body.includes('sku:suite'), file);
      assert.ok(!body.includes('"grants"'), file);
    }
    const exported = path.join(f.root, 'exports', name);
    await exportContent(f.config, exported, { profile: profileFile, publication });
    for (const [file, bytes] of await files(exported)) for (const marker of excluded) assert.ok(!bytes.toString('utf8').includes(marker), `${file}: ${marker}`);
  }
  assert.equal(await readFile(f.config, 'utf8'), json(f.settings));
});

test('historical SKU definitions and grandfathered features remain additive and independent of publications', async t => {
  const f = await fixture(t);
  const profile = await f.profile('historical', { skus: [{ id: 'suite', revision: '2025' }], features: ['a', 'classic'] });
  const loaded = await loadConfig(f.config, { profile });
  assert.deepEqual([...loaded.deployment!.context.grants!].sort(), ['a', 'classic']);
  assert.deepEqual(loaded.deployment!.context.provenance.classic, ['sku:suite@2025', 'direct']);
  const built = await compile(f.config, path.join(f.root, 'historical'), {}, { profile });
  assert.ok(built.documents.some(doc => doc.id === 'guide.old' && doc.variant.version === 'v1'));
  const before = [...loaded.deployment!.context.grants!];
  f.manifest.skus.suite.revisions['2026'].features = ['b'];
  await writeFile(path.join(f.project, 'skus.yaml'), json(f.manifest));
  assert.deepEqual([...(await loadConfig(f.config, { profile })).deployment!.context.grants!], before);
});

test('missing, unknown, malformed, or overbroad profiles fail without replacing valid output', async t => {
  const f = await fixture(t);
  const profile = await f.profile('valid', { features: ['a'] });
  const output = path.join(f.root, 'edition');
  await compile(f.config, output, {}, { profile });
  const previous = await readFile(path.join(output, 'documents.json'));
  await assert.rejects(compile(f.config, output), /requires an explicit --profile/);
  for (const invalid of [
    { features: ['unknown'] }, { skus: [{ id: 'suite', revision: 'latest' }] },
    { skus: [{ id: 'suite' }] }, { features: [], site: { contentDir: '/elsewhere' } },
    { features: [], extends: ['./other.yaml'] }, { features: [], components: [] },
    { features: [], publications: { enabled: [{ ...publication, version: 'unapproved' }] } }, {}
  ]) {
    const bad = await f.profile('bad', invalid);
    await assert.rejects(compile(f.config, output, {}, { profile: bad }));
    assert.deepEqual(await readFile(path.join(output, 'documents.json')), previous);
  }
  await f.page('home', 'Shared\n\n<ForFeature allOf="b">\n\n[Missing](doc:does.not.exist)\n\n<Snippet id="does.not.exist" />\n\n</ForFeature>');
  await compile(f.config, output, {}, { profile });
  await f.page('home', '[Excluded](doc:guide.b)');
  await assert.rejects(compile(f.config, output, {}, { profile }), /guide.b/);
  await f.page('home', 'Shared');
  f.settings.navigation.push({ id: 'typo', doc: 'guide.typo' });
  await writeFile(f.config, json(f.settings));
  await assert.rejects(compile(f.config, output, {}, { profile }), /guide.typo/);
});

test('conditions validate every branch, preserve explicit anchors, and require explicit context', async t => {
  const f = await fixture(t);
  const profile = await f.profile('a', { features: ['a'] });
  const built = await compile(f.config, path.join(f.root, 'edition'), {}, { profile });
  assert.ok((await readFile(path.join(f.root, 'edition/index.html'), 'utf8')).includes('a-instructions'));
  const context = (await loadConfig(f.config, { profile })).deployment!.context;
  assert.equal(matchesFeatures({ allOf: ['a'], anyOf: ['b'] }, context, 'both-clauses'), false);
  assert.equal(matchesFeatures({ allOf: ['a'], anyOf: ['a', 'b'] }, context, 'both-clauses'), true);
  for (const invalid of [{}, { allOf: [] }, { anyOf: ['missing'] }, { not: ['a'] }]) assert.throws(() => featureRequirements(invalid, context, 'fixture'));
  await f.page('home', '<ForFeature allOf="b">\n\n<ForFeature anyOf="unknown">\n\nText\n\n</ForFeature>\n\n</ForFeature>');
  await assert.rejects(compile(f.config, undefined, {}, { profile }), /unknown feature unknown/);
  assert.ok(built.profileSelection?.features.includes('a'));
});

test('mounted branding inputs are captured for validation and preview, with freshness and no sibling discovery', async t => {
  const f = await fixture(t);
  const profile = await f.profile('one', { features: ['a'], site: { title: 'Example Partner Docs', favicon: './brand/icon.svg', logo: './brand/logo.svg' }, publications: { enabled: [publication] } });
  await mkdir(path.join(path.dirname(profile), 'brand'));
  const icon = path.join(path.dirname(profile), 'brand/icon.svg');
  await writeFile(path.join(path.dirname(profile), 'brand/logo.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="32"><rect width="48" height="32" fill="navy" /></svg>');
  await writeFile(icon, '<svg xmlns="http://www.w3.org/2000/svg"><title>PartnerIcon</title></svg>');
  await f.profile('unrelated', { features: ['b'], variables: { customer: 'UNRELATED_CUSTOMER_MARKER' } });
  const baseline = path.join(f.project, '.shoalrun/baseline.json');
  await writeAuthoringBaseline(f.config, baseline, { profile });
  const report = await validateAuthoringChanges(f.config, { files: ['content/home.mdx'], profile });
  assert.equal(report.status, 'ok', json(report.findings));
  t.after(() => rm(report.artifacts.directory, { recursive: true, force: true }));
  assert.ok(report.profile);
  assert.equal(Object.keys(report.profile.sources).length, 3);
  assert.ok(!json(report.inputs).includes('unrelated'));
  const html = await readFile(path.join(report.artifacts.site, 'index.html'), 'utf8');
  assert.ok(html.includes('Example Partner Docs'));
  assert.ok(html.includes('brand-logo.svg'));
  assert.ok((await readFile(path.join(report.artifacts.site, 'assets/brand-logo.svg'), 'utf8')).includes('navy'));
  assert.ok((await readFile(path.join(report.artifacts.site, 'favicon.svg'), 'utf8')).includes('PartnerIcon'));
  assert.equal((await authoringValidationStatus(report.artifacts.report)).current, true);
  await writeFile(icon, '<svg xmlns="http://www.w3.org/2000/svg"><title>ChangedIcon</title></svg>');
  assert.equal((await authoringValidationStatus(report.artifacts.report)).current, false);
  const changed = await validateAuthoringChanges(f.config, { baselineFile: baseline, profile });
  t.after(() => rm(changed.artifacts.directory, { recursive: true, force: true }));
  assert.equal(changed.status, 'ok', json(changed.findings));
  assert.ok(changed.changed.some(input => input.file.endsWith('brand/icon.svg')));
  await writeFile(profile, json({ schemaVersion: 1, features: [] }));
  assert.equal((await authoringValidationStatus(changed.artifacts.report)).current, false);
  const removedReference = await validateAuthoringChanges(f.config, { baselineFile: baseline, profile });
  t.after(() => rm(removedReference.artifacts.directory, { recursive: true, force: true }));
  assert.equal(removedReference.status, 'ok', json(removedReference.findings));
  assert.ok(!removedReference.changed.some(input => input.file.includes('brand/') && input.operation === 'deleted'));
  const tampered = JSON.parse(json(removedReference));
  tampered.profile.sources[tampered.profile.file] = path.join(f.mount, 'unrelated/profile.yaml');
  const tamperedReport = path.join(f.project, '.shoalrun/tampered-report.json');
  await writeFile(tamperedReport, json(tampered));
  await assert.rejects(authoringValidationStatus(tamperedReport), /identity does not match/);
});

test('profile API references and embeds obey feature selection and full-source publication is refused', async t => {
  const f = await fixture(t);
  const profile = await f.profile('a', { features: ['a'] });
  const api = { openapi: '3.1.0', info: { title: 'Example API', version: '1' }, paths: {
    '/a': { get: { operationId: 'getA', summary: 'OperationAMarker', 'x-shoalrun-requires': { allOf: ['a'] }, responses: { '200': { description: 'A success' } } } },
    '/b': { get: { operationId: 'getB', summary: 'OperationBExcludedMarker', 'x-shoalrun-requires': { allOf: ['b'] }, responses: { '200': { description: 'B success' } } } }
  } };
  await writeFile(path.join(f.project, 'api.json'), json(api));
  const config: any = { ...f.settings, apis: { sample: { source: { kind: 'file', path: './api.json', focused: true }, generateReferences: true } } };
  await writeFile(f.config, json(config));
  const output = path.join(f.root, 'api-edition');
  const built = await compile(f.config, output, {}, { profile, apiReview: 'report' });
  assert.equal(built.documents.filter(doc => doc.type === 'api-reference').length, 1); // The source is bound to the default publication.
  for (const [file, bytes] of await files(output)) assert.ok(!bytes.toString('utf8').includes('OperationBExcludedMarker'), file);
  const excludedOperation = generatedOperationIdentity('sample', 'getB', '/reference/sample').id;
  await f.page('home', `<ApiSchema operation="${excludedOperation}" kind="response" status="200" mediaType="application/json" />`);
  await assert.rejects(compile(f.config, output, {}, { profile }), /excluded from this profile/);
  await f.page('home', 'Shared');
  config.apis.sample.source.publish = true;
  await writeFile(f.config, json(config));
  await assert.rejects(compile(f.config, output, {}, { profile }), /cannot publish a full OpenAPI source/);
});

test('the public CLI builds, exports, inspects, and validates the same external profile', async t => {
  const f = await fixture(t);
  const profile = await f.profile('deployment', { features: ['classic'], publications: { enabled: [publication] } });
  const invoke = async (...args: string[]) => JSON.parse((await execFile(process.execPath, [cli, ...args], { cwd: f.project })).stdout);
  assert.equal((await invoke('build', f.config, path.join(f.root, 'cli-site'), '--profile', profile)).documents, 2);
  assert.equal((await invoke('export', f.config, '--out', path.join(f.root, 'cli-export'), '--profile', profile)).documents, 2);
  assert.equal((await invoke('docs', 'project', '--config', f.config, '--profile', profile)).status, 'ok');
  const report = await invoke('docs', 'validate', '--config', f.config, '--file', 'content/home.mdx', '--profile', profile);
  t.after(() => rm(report.artifacts.directory, { recursive: true, force: true }));
  assert.equal(report.status, 'ok');
  assert.equal((await invoke('docs', 'validation-status', report.artifacts.report)).current, true);
  const baseline = path.join(f.project, '.shoalrun/edition-baseline.json');
  await invoke('docs', 'baseline', '--config', f.config, '--out', baseline, '--profile', profile);
  await writeFile(profile, json({ schemaVersion: 1, features: ['classic'], site: { title: 'Updated Example Edition' }, publications: { enabled: [publication] } }));
  const scoped = await invoke('docs', 'validate', '--config', f.config, '--baseline', baseline, '--profile', profile);
  t.after(() => rm(scoped.artifacts.directory, { recursive: true, force: true }));
  assert.equal(scoped.status, 'ok');
  assert.ok(scoped.findings.some((finding: any) => finding.code === 'validation.profile-excluded' && finding.file === 'content/old.mdx'));
  const output = path.join(f.root, 'cli-vercel');
  assert.equal((await invoke('vercel', 'build', f.config, output, '--profile', profile)).documents, 2);
  const metadata = await readFile(path.join(output, 'static/documents.json'), 'utf8');
  assert.ok(!metadata.includes('profile.yaml'));
});

test('conditional snippets retain export context and unused browser assets are omitted', async t => {
  const f = await fixture(t);
  await writeFile(path.join(f.project, 'snippet.mdx'), '<ForFeature allOf="b">\n\nSnippetBExcluded\n\n</ForFeature>\n\nSharedSnippetText');
  const settings: any = { ...f.settings, snippets: { 'help.shared': { file: './snippet.mdx' } }, exports: { help: { resources: [{ kind: 'snippet', id: 'shared', snippetId: 'help.shared', title: 'Shared help', summary: 'Shared instructions.' }], publication } } };
  await mkdir(path.join(f.project, 'components'));
  await writeFile(path.join(f.project, 'components/manifest.json'), json({ apiVersion: 1, components: { EditionWidget: { module: './content.mjs', browser: './browser.js' } } }));
  await writeFile(path.join(f.project, 'components/content.mjs'), 'export default { children: "required", content({children}) { return children; } };');
  await writeFile(path.join(f.project, 'components/browser.js'), 'export function enhance() { document.title += "ExcludedBrowserMarker"; }');
  settings.components = ['./components/manifest.json'];
  await writeFile(f.config, json(settings));
  await f.page('home', '<Snippet id="help.shared" />\n\n<ForFeature allOf="b">\n\n<EditionWidget>\n\nWidgetBExcluded\n\n</EditionWidget>\n\n</ForFeature>');
  const profile = await f.profile('a', { features: ['a'] });
  const output = path.join(f.root, 'site');
  await compile(f.config, output, {}, { profile });
  for (const [file, bytes] of await files(output)) assert.ok(!/SnippetBExcluded|WidgetBExcluded|ExcludedBrowserMarker/.test(bytes.toString('utf8')), file);
  const exported = path.join(f.root, 'snippet-export');
  await exportContent(f.config, exported, { profile, target: 'help' });
  for (const [file, bytes] of await files(exported)) assert.ok(!bytes.toString('utf8').includes('SnippetBExcluded'), file);
});

test('strict classification rejects unmarked pages before selection and preserves prior output', async t => {
  const f = await fixture(t);
  const profile = await f.profile('empty', { features: [] });
  const output = path.join(f.root, 'strict-edition');
  await compile(f.config, output, {}, { profile });
  const previous = await readFile(path.join(output, 'documents.json'));
  await writeFile(f.config, json({ ...f.settings, profiles: { ...f.settings.profiles, requireClassification: true },
    frontmatter: { defaults: { ...f.settings.frontmatter.defaults, requires: { allOf: ['b'] } } } }));
  await assert.rejects(compile(f.config, output, {}, { profile }), /home.mdx.*unclassified content.*inherited defaults do not count/);
  assert.deepEqual(await readFile(path.join(output, 'documents.json')), previous);
  await assert.rejects(exportContent(f.config, path.join(f.root, 'strict-export'), { profile, publication }), /home.mdx.*unclassified content/);
  const review = await validateAuthoringChanges(f.config, { files: ['content/home.mdx'], profile });
  t.after(() => rm(review.artifacts.directory, { recursive: true, force: true }));
  assert.equal(review.status, 'failed');
  assert.match(json(review.findings), /unclassified content/);
});

test('strict shared pages keep gated sections and follow grants in builds and exports', async t => {
  const f = await fixture(t);
  await writeFile(f.config, json({ ...f.settings, profiles: { ...f.settings.profiles, requireClassification: true } }));
  await f.page('home', 'SharedInstructions\n\n<ForFeature allOf="a">\n\nFeatureASection\n\n</ForFeature>', { shared: true });
  for (const [name, features, expected] of [
    ['empty', [], ['home']], ['a', ['a'], ['a', 'home']], ['b', ['b'], ['b', 'home']], ['both', ['a', 'b'], ['a', 'b', 'both', 'home']]
  ] as const) {
    const profile = await f.profile(name, { features });
    const output = path.join(f.root, `strict-${name}`);
    const built = await compile(f.config, output, {}, { profile });
    assert.deepEqual(built.documents.map(doc => doc.id).sort(), expected.map(id => `guide.${id}`).sort());
    const html = await readFile(path.join(output, 'index.html'), 'utf8');
    assert.ok(html.includes('SharedInstructions'));
    assert.equal(html.includes('FeatureASection'), features.includes('a' as never));
    const exported = path.join(f.root, `strict-export-${name}`);
    await exportContent(f.config, exported, { profile, publication });
    const content = (await files(exported)).map(([, bytes]) => bytes.toString('utf8')).join('\n');
    assert.equal(content.includes('FeatureASection'), features.includes('a' as never));
  }
});

test('strict classification checks shared enabled publications even when the profile narrows them', async t => {
  const f = await fixture(t);
  const profile = await f.profile('current', { features: [], publications: { enabled: [publication] } });
  await writeFile(f.config, json({ ...f.settings, profiles: { ...f.settings.profiles, requireClassification: true } }));
  await f.page('home', 'Shared', { shared: true });
  await f.page('draft', 'Unclassified draft', { access: { policy: 'draft' } });
  await f.page('disabled', 'Disabled publication', { channel: 'sandbox' });
  await compile(f.config, undefined, {}, { profile });
  await f.page('old', 'Unclassified older instructions', { version: 'v1' });
  await assert.rejects(compile(f.config, undefined, {}, { profile }), /old.mdx.*unclassified content/);
});

test('classification declarations reject defaults, conflicts, and malformed settings', async t => {
  const f = await fixture(t);
  const profile = await f.profile('a', { features: ['a'] });
  for (const extra of [{ shared: false }, { shared: 'true' }, { shared: true, requires: { allOf: ['a'] } }]) {
    await f.page('home', 'Shared', extra);
    await assert.rejects(compile(f.config, undefined, {}, { profile }), /shared/);
  }
  await f.page('home', 'Shared', { shared: true });
  await writeFile(f.config, json({ ...f.settings, frontmatter: { defaults: { ...f.settings.frontmatter.defaults, shared: true } } }));
  await assert.rejects(compile(f.config, undefined, {}, { profile }), /shared must stay page-specific/);
  await writeFile(f.config, json({ ...f.settings, profiles: { ...f.settings.profiles, requireClassification: 'yes' } }));
  await assert.rejects(loadConfig(f.config, { profile }), /requireClassification must be boolean/);
});

test('strict generated API classification is explicit before feature and publication selection', async t => {
  const f = await fixture(t);
  const profile = await f.profile('empty', { features: [], publications: { enabled: [publication] } });
  await f.page('home', 'Shared', { shared: true });
  const spec = (extra: Record<string, unknown> = {}) => ({ openapi: '3.1.0', info: { title: 'Example API', version: '1' }, paths: {
    '/items': { get: { operationId: 'listItems', summary: 'SelectedOperation', ...extra, responses: { '200': { description: 'Success' } } } }
  } });
  await writeFile(path.join(f.project, 'api.json'), json(spec()));
  const api = { source: { kind: 'file', path: './api.json', focused: true }, generateReferences: true };
  const settings = { ...f.settings, profiles: { ...f.settings.profiles, requireClassification: true }, apis: { sample: api } };
  await writeFile(f.config, json(settings));
  await assert.rejects(compile(f.config, undefined, {}, { profile, apiReview: 'report' }), /listItems.*unclassified content/);
  await writeFile(f.config, json({ ...settings, apis: { sample: { ...api, shared: true } } }));
  assert.equal((await compile(f.config, undefined, {}, { profile, apiReview: 'report' })).documents.filter(doc => doc.type === 'api-reference').length, 1);
  await writeFile(f.config, json(settings));
  await writeFile(path.join(f.project, 'api.json'), json(spec({ 'x-shoalrun-shared': true })));
  await compile(f.config, undefined, {}, { profile, apiReview: 'report' });
  await writeFile(path.join(f.project, 'api.json'), json(spec({ 'x-shoalrun-requires': { allOf: ['a'] } })));
  assert.equal((await compile(f.config, undefined, {}, { profile, apiReview: 'report' })).documents.filter(doc => doc.type === 'api-reference').length, 0);
  await writeFile(path.join(f.project, 'api.json'), json(spec()));
  await writeFile(f.config, json({ ...settings, apis: { sample: { generateReferences: true, publications: [{ channel: 'production', version: 'v1', source: api.source }] } } }));
  await assert.rejects(compile(f.config, undefined, {}, { profile, apiReview: 'report' }), /listItems.*unclassified content/);
});

test('null feature input is rejected instead of becoming an empty grant set', async t => {
  const f = await fixture(t);
  const profile = await f.profile('invalid', { features: null });
  await assert.rejects(loadConfig(f.config, { profile }), /features must be a list/);
});

test('standalone snippet exports ignore dependencies only inside excluded feature branches', async t => {
  const f = await fixture(t);
  await writeFile(path.join(f.project, 'snippet.mdx'), 'SharedSnippet\n\n<ForFeature allOf="b">\n\n<Snippet id="missing.child" />\n\n<ApiSchema api="missing-api" schema="#/components/schemas/Hidden" />\n\n</ForFeature>');
  const settings = { ...f.settings,
    snippets: { 'help.selected': { file: './snippet.mdx' } },
    exports: { help: { publication, resources: [{ kind: 'snippet', id: 'selected', snippetId: 'help.selected', title: 'Selected help', summary: 'Shared help instructions.' }] } }
  };
  await writeFile(f.config, json(settings));
  const profile = await f.profile('a', { features: ['a'] });
  const output = path.join(f.root, 'snippet-export');
  assert.equal((await exportContent(f.config, output, { profile, target: 'help' })).resources, 1);
  const body = (await files(output)).map(([, bytes]) => bytes.toString('utf8')).join('\n');
  assert.ok(body.includes('SharedSnippet'));
  assert.ok(!body.includes('missing.child'));
  const otherProfile = await f.profile('b', { features: ['b'] });
  await assert.rejects(exportContent(f.config, path.join(f.root, 'invalid-export'), { profile: otherProfile, target: 'help' }), /Unknown snippet missing.child|needs page context/);
});

test('generated API references obey inherited page requirements', async t => {
  const f = await fixture(t);
  const profile = await f.profile('a', { features: ['a'] });
  const spec = { openapi: '3.1.0', info: { title: 'Example API', version: '1' }, paths: {
    '/items': { get: { operationId: 'listItems', summary: 'InheritedRequirementExcluded', responses: { '200': { description: 'Success' } } } }
  } };
  await writeFile(path.join(f.project, 'api.json'), json(spec));
  const settings = { ...f.settings,
    frontmatter: { defaults: { ...f.settings.frontmatter.defaults, requires: { allOf: ['b'] } } },
    apis: { sample: { source: { kind: 'file', path: './api.json', focused: true }, generateReferences: true } }
  };
  await writeFile(f.config, json(settings));
  await f.page('home', 'Shared home', { requires: { allOf: ['a'] } });
  const output = path.join(f.root, 'inherited-api-edition');
  const built = await compile(f.config, output, {}, { profile, apiReview: 'report' });
  assert.ok(built.documents.some(doc => doc.id === 'guide.home'));
  assert.equal(built.documents.filter(doc => doc.type === 'api-reference').length, 0);
  for (const [file, bytes] of await files(output)) assert.ok(!bytes.toString('utf8').includes('InheritedRequirementExcluded'), file);
});

test('profile branding has the same validation contract in builds and exports', async t => {
  const f = await fixture(t);
  for (const invalid of [
    { site: { header: { links: [{ label: 'Support', href: 'javascript:alert(1)' }] } } },
    { site: { footer: { columns: 'invalid' } } },
    { theme: { mode: 'light', toggle: true } },
    { variables: { attempts: Number.POSITIVE_INFINITY } },
    { publications: { enabled: [publication, publication] } }
  ]) {
    const profile = await f.profile('invalid-brand', { features: ['a'], ...invalid });
    // JSON encodes infinity as null, which must also be rejected as a variable.
    await assert.rejects(compile(f.config, undefined, {}, { profile }));
    await assert.rejects(exportContent(f.config, path.join(f.root, 'invalid-brand-export'), { profile, publication }));
  }
  const nonfinite = await f.profile('nonfinite', { features: ['a'] });
  await writeFile(nonfinite, 'schemaVersion: 1\nfeatures: [a]\nvariables: { attempts: .inf }\n');
  await assert.rejects(loadConfig(f.config, { profile: nonfinite }), /variables must map/);
  await writeFile(f.config, json({ ...f.settings, theme: { mode: 'system', toggle: true } }));
  const inherited = await f.profile('inherited-theme', { features: ['a'], theme: { mode: 'light' } });
  await assert.rejects(loadConfig(f.config, { profile: inherited }), /toggle needs effective theme.mode/);
});

test('partial branding overrides retain valid shared identity settings', async t => {
  const f = await fixture(t);
  await writeFile(f.config, json({ ...f.settings, site: { ...f.settings.site,
    header: { links: [{ label: 'Support', href: 'https://support.example.com' }] },
    footer: { columns: [{ title: 'Help', links: [{ label: 'Support', href: 'https://support.example.com' }] }], text: 'Shared footer text' }
  } }));
  const profile = await f.profile('partial', { features: ['a'], site: { header: {}, footer: { columns: [] } } });
  const loaded = await loadConfig(f.config, { profile });
  assert.deepEqual((loaded.value.site as any).footer, { columns: [], text: 'Shared footer text' });
  assert.equal((loaded.value.site as any).header.links.length, 1);
  const output = path.join(f.root, 'partial-brand-site');
  await compile(f.config, output, {}, { profile });
  assert.ok((await readFile(path.join(output, 'index.html'), 'utf8')).includes('Shared footer text'));
  assert.equal((await exportContent(f.config, path.join(f.root, 'partial-brand-export'), { profile, publication })).documents, 2);
});

test('generated operation requirements stay independent across product versions', async t => {
  const f = await fixture(t);
  const spec = (feature: string, marker: string) => ({ openapi: '3.1.0', info: { title: 'Example API', version: '1' }, paths: {
    '/items': { get: { operationId: 'listItems', summary: marker, 'x-shoalrun-requires': { allOf: [feature] }, responses: { '200': { description: 'Success' } } } }
  } });
  await writeFile(path.join(f.project, 'current-api.json'), json(spec('a', 'CurrentOperationOnly')));
  await writeFile(path.join(f.project, 'old-api.json'), json(spec('b', 'OldOperationOnly')));
  await writeFile(f.config, json({ ...f.settings, apis: { sample: {
    source: { kind: 'file', path: './current-api.json', focused: true },
    publications: [{ channel: 'production', version: 'v1', source: { kind: 'file', path: './old-api.json', focused: true } }],
    generateReferences: true
  } } }));
  for (const [feature, version, excluded] of [['a', 'current', 'OldOperationOnly'], ['b', 'v1', 'CurrentOperationOnly']] as const) {
    const profile = await f.profile(feature, { features: [feature] });
    const output = path.join(f.root, `versioned-${feature}`);
    const built = await compile(f.config, output, {}, { profile, apiReview: 'report' });
    assert.deepEqual(built.documents.filter(doc => doc.type === 'api-reference').map(doc => doc.variant.version), [version]);
    for (const [file, bytes] of await files(output)) assert.ok(!bytes.toString('utf8').includes(excluded), file);
  }
});

test('profile assets replaced by symlinks invalidate evidence and cannot enter a later baseline capture', async t => {
  const f = await fixture(t);
  const profile = await f.profile('mounted', { features: ['a'], site: { logo: './logo.svg' } });
  const logo = path.join(path.dirname(profile), 'logo.svg');
  const svg = '<svg xmlns="http://www.w3.org/2000/svg"><title>Example logo</title></svg>';
  await writeFile(logo, svg);
  const baseline = path.join(f.project, '.shoalrun/baseline.json');
  await writeAuthoringBaseline(f.config, baseline, { profile });
  const report = await validateAuthoringChanges(f.config, { profile, files: ['content/home.mdx'] });
  t.after(() => rm(report.artifacts.directory, { recursive: true, force: true }));
  assert.equal(report.status, 'ok', json(report.findings));
  const outside = path.join(f.root, 'outside.svg');
  await writeFile(outside, svg);
  await rm(logo);
  await symlink(outside, logo);
  assert.equal((await authoringValidationStatus(report.artifacts.report)).current, false);
  await writeFile(profile, json({ schemaVersion: 1, features: ['a'] }));
  await assert.rejects(validateAuthoringChanges(f.config, { profile, baselineFile: baseline }), /symlink/);
});

test('a private selection report write failure preserves the last valid site', async t => {
  const f = await fixture(t);
  const profile = await f.profile('deployment', { features: ['a'] });
  const output = path.join(f.root, 'site');
  await compile(f.config, output, {}, { profile });
  const before = await readFile(path.join(output, 'documents.json'));
  const receipt = path.join(f.project, '.shoalrun/profile-selection.json');
  await rm(receipt);
  await mkdir(receipt);
  await writeFile(profile, json({ schemaVersion: 1, features: ['b'] }));
  await assert.rejects(compile(f.config, output, {}, { profile }), /EISDIR|illegal operation on a directory/);
  assert.deepEqual(await readFile(path.join(output, 'documents.json')), before);
});
