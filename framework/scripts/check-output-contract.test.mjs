import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { appendFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { canonicalJson } from '../dist/document-sync.js';
import { markdownSize } from '../dist/markdown-size.js';
import { checkOutputContract, validateOutputMetadata } from './check-output-contract.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const target = doc => ({ id: doc.id, title: doc.title, url: doc.url, markdownUrl: doc.markdownUrl });

// Hand-authored publication: no compiler, site build, search index, or sitemap.
// Mounted routes, repeated IDs across variants, nullable API endpoints, and
// string dependency arrays cover shapes that the original draft got wrong.
function fixture() {
  const files = new Map();
  const page = (id, version, slug) => {
    const markdown = `# ${slug}\n\nCafé instructions for ${version}.\n`;
    const markdownUrl = `/docs/${version}/${slug}.md`;
    files.set(markdownUrl, markdown);
    return {
      id, type: 'reference', title: slug, summary: `Read ${slug}.`, demo: false,
      subjectLifecycle: null, variant: { channel: 'production', version, language: 'en' },
      url: markdownUrl.slice(0, -3), markdownUrl, indexable: false,
      contentDigest: hash(`resolved ${id} ${version}`), digest: hash(markdown),
      breadcrumbs: [], cardTargets: [], cardQueries: [], snippets: ['shared.install'], apiEmbeds: [],
      focusedContractUrl: null, focusedContractBytes: null, focusedContractDigest: null,
      sections: [], ...markdownSize(markdown)
    };
  };
  const current = page('guide.example', 'current', 'example');
  const legacy = page('guide.example', 'v1', 'example');
  const migration = page('guide.migrate', 'current', 'migrate');
  current.type = 'changelog-entry';
  current.updated = '2026-10-15T12:30:00Z';
  legacy.verified = '2026-10-15';
  current.subjectLifecycle = 'deprecated';
  current.subjectDeprecation = {
    deprecatedOn: '2026-10-15', sunsetOn: '2027-01-01',
    replacement: target(migration), migration: target(migration)
  };
  current.change = { kind: 'behavior', affects: [target(migration)], migration: target(migration) };
  current.cardTargets = [migration.id];
  current.cardQueries = [{ component: 'DocCard', doc: migration.id }];
  const sectionMarkdown = '# Details\n\nRead the full page for setup.\n';
  const section = {
    id: 'details', title: 'Details', depth: 2,
    markdownUrl: '/docs/current/example.sections/details.md',
    parentMarkdownUrl: current.markdownUrl, parentDigest: current.digest,
    digest: hash(sectionMarkdown), ...markdownSize(sectionMarkdown)
  };
  current.sections.push(section); // Missing standalone is intentional and valid.
  files.set(section.markdownUrl, sectionMarkdown);
  const contract = '{"openapi":"3.1.0","info":{"title":"Example","version":"1"},"paths":{}}\n';
  current.focusedContractDigest = hash(contract);
  current.focusedContractBytes = Buffer.byteLength(contract);
  current.focusedContractUrl = `/docs/api/operations/production/current/en/example-${hash(contract)}.json`;
  files.set(current.focusedContractUrl, contract);
  const configDigest = hash('fixture config');
  const buildId = hash('fixture assembled output');
  const manifest = {
    schemaVersion: 1, buildId, configDigest, basePath: '/docs', dependencies: ['content/example.mdx'],
    documents: [current, legacy, migration], operations: {}, relationships: [], redirects: [],
    apiSources: [{ apiId: 'example', channel: 'production', version: 'current', endpoint: null,
      referenceUrl: current.url, sourceUrl: '/docs/api/example/production/current/openapi.json', mediaType: 'application/json' }]
  };
  const value = { manifest, buildInfo: { schemaVersion: 1, buildId, configDigest }, files };
  refresh(value);
  return value;
}

function refresh(value) {
  const { documents, dependencies, buildId, ...metadata } = value.manifest;
  const identity = doc => JSON.stringify([doc.id, doc.variant.channel, doc.variant.version, doc.variant.language]);
  value.snapshot = {
    schemaVersion: 1, buildId, metadataDigest: hash(canonicalJson(metadata)),
    documents: documents.map(doc => ({
      id: doc.id, variant: structuredClone(doc.variant), url: doc.url, markdownUrl: doc.markdownUrl,
      digest: doc.digest, contentDigest: doc.contentDigest, recordDigest: hash(canonicalJson(doc))
    })).sort((a, b) => identity(a) < identity(b) ? -1 : identity(a) > identity(b) ? 1 : 0)
  };
}

const findings = value => validateOutputMetadata(value.manifest, value.snapshot, value.buildInfo);
const localPath = (site, route) => path.join(site, route.slice(1));
async function writeFixture(site, value) {
  for (const [route, bytes] of value.files) {
    const file = localPath(site, route);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, bytes);
  }
  for (const [name, object] of [['documents.json', value.manifest], ['documents.sync.json', value.snapshot], ['build-info.json', value.buildInfo]]) {
    await writeFile(path.join(site, name), JSON.stringify(object));
  }
}

test('current output shapes accept mounted routes, variants, nullable fields, and unknown additions', () => {
  const value = fixture();
  assert.deepEqual(findings(value), []);
  value.manifest.futureInventory = { enabled: true };
  const doc = value.manifest.documents[0];
  doc.futureMetadata = ['new'];
  doc.updated = '2026-10-15T24:00:00Z';
  doc.variant.futureCoordinate = 'ignored';
  doc.sections[0].futureSectionMetadata = true;
  doc.sections[0].standalone = true;
  doc.change.affects[0].futureTargetMetadata = 'new';
  refresh(value);
  value.snapshot.futureSnapshotMetadata = true;
  value.snapshot.documents[0].futureSyncMetadata = true;
  value.buildInfo.futureProvenance = true;
  assert.deepEqual(findings(value), []);
});

test('known field shape and required-field failures are rejected', async t => {
  const cases = [
    ['required producer digest', value => delete value.manifest.documents[0].digest, /digest/i],
    ['required manifest configuration', value => delete value.manifest.configDigest, /configDigest/i],
    ['unsupported format version', value => { value.manifest.schemaVersion = 2; }, /schemaVersion/i],
    ['digest syntax', value => { value.manifest.documents[0].digest = 'not-a-sha256'; }, /digest/i],
    ['string snippets', value => { value.manifest.documents[0].snippets = [{ id: 'shared.install' }]; }, /snippets/i],
    ['string card targets', value => { value.manifest.documents[0].cardTargets = [{ id: 'guide.migrate' }]; }, /cardTargets/i],
    ['API endpoint type', value => { value.manifest.apiSources[0].endpoint = 42; }, /endpoint/i],
    ['section boolean', value => { value.manifest.documents[0].sections[0].standalone = 'yes'; }, /standalone/i],
    ['absent review dates must be omitted', value => { value.manifest.documents[0].verified = null; }, /verified/i],
    ['nonnegative byte size', value => { value.manifest.documents[0].markdownBytes = -1; }, /markdownBytes/i],
    ['migration target shape', value => { value.manifest.documents[0].change.migration = 'guide.migrate'; }, /migration/i],
    ['deprecation date', value => { value.manifest.documents[0].subjectDeprecation.deprecatedOn = 'yesterday'; }, /deprecatedOn/i],
    ['impossible calendar date', value => { value.manifest.documents[0].subjectDeprecation.deprecatedOn = '2026-02-30'; }, /deprecatedOn/i],
    ['impossible end-of-day date', value => { value.manifest.documents[0].updated = '2026-02-30T24:00:00Z'; }, /updated/i],
    ['unknown authored change kind', value => { value.manifest.documents[0].change.kind = 'unclassified'; }, /kind/i],
    ['empty authored change targets', value => { value.manifest.documents[0].change.affects = []; }, /affects/i],
    ['null contract URL with nonnull metadata', value => { value.manifest.documents[0].focusedContractUrl = null; }, /focusedContract|oneOf/i],
    ['nonnull contract URL with null size', value => { value.manifest.documents[0].focusedContractBytes = null; }, /focusedContract|oneOf/i],
    ['nonnull contract URL with null digest', value => { value.manifest.documents[0].focusedContractDigest = null; }, /focusedContract|oneOf/i]
  ];
  for (const [name, mutate, pattern] of cases) await t.test(name, () => {
    const value = fixture();
    mutate(value);
    refresh(value);
    assert.match(findings(value).join('\n'), pattern);
  });
});

test('cross-artifact checks reject valid-shaped but inconsistent metadata', async t => {
  const cases = [
    ['duplicate manifest identity', value => { value.manifest.documents.push(structuredClone(value.manifest.documents[0])); refresh(value); }, /duplicate/i],
    ['duplicate sync identity', value => { value.snapshot.documents.push(structuredClone(value.snapshot.documents[0])); }, /duplicate/i],
    ['unsorted snapshot identities', value => { value.snapshot.documents.reverse(); }, /sorted/i],
    ['missing sync record', value => { value.snapshot.documents.pop(); }, /sync|missing|inventory/i],
    ['extra sync record', value => { const extra = structuredClone(value.snapshot.documents[0]); extra.id = 'guide.unknown'; value.snapshot.documents.push(extra); }, /sync|manifest|inventory/i],
    ['metadata-only document edit', value => { value.manifest.documents[0].summary = 'Changed metadata, identical Markdown.'; }, /recordDigest/i],
    ['global metadata edit', value => { value.manifest.dependencies = ['irrelevant-source-path.mdx']; value.manifest.futureGlobal = 'changed'; }, /metadataDigest/i],
    ['changed sync route', value => { value.snapshot.documents[0].markdownUrl = '/docs/current/moved.md'; }, /markdownUrl|sync/i],
    ['different build stamp', value => { value.buildInfo.buildId = hash('other build'); }, /buildId/i],
    ['different config stamp', value => { value.buildInfo.configDigest = hash('other config'); }, /configDigest/i],
    ['section parent digest', value => { value.manifest.documents[0].sections[0].parentDigest = hash('wrong parent'); refresh(value); }, /parentDigest|parent/i],
    ['section parent route', value => { value.manifest.documents[0].sections[0].parentMarkdownUrl = '/docs/current/migrate.md'; refresh(value); }, /parentMarkdownUrl|parent/i],
    ['resolved target route', value => { value.manifest.documents[0].change.migration.markdownUrl = '/docs/current/missing.md'; refresh(value); }, /migration|target|reference/i]
  ];
  for (const [name, mutate, pattern] of cases) await t.test(name, () => {
    const value = fixture();
    mutate(value);
    assert.match(findings(value).join('\n'), pattern);
  });
  const dependencyOnly = fixture();
  dependencyOnly.manifest.dependencies = ['another/source.mdx'];
  assert.deepEqual(findings(dependencyOnly), [], 'source dependency paths are outside metadataDigest');
});

test('local checks verify existing page, section, and focused-contract files', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-output-contract-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const cases = [
    ['valid mounted publication', async () => {}, null],
    ['tampered page', async (site, value) => appendFile(localPath(site, value.manifest.documents[0].markdownUrl), 'changed'), /digest|bytes/i],
    ['tampered section', async (site, value) => appendFile(localPath(site, value.manifest.documents[0].sections[0].markdownUrl), 'changed'), /digest|bytes/i],
    ['tampered focused contract', async (site, value) => appendFile(localPath(site, value.manifest.documents[0].focusedContractUrl), 'changed'), /digest|bytes/i],
    ['missing page', async (site, value) => rm(localPath(site, value.manifest.documents[0].markdownUrl)), /missing|ENOENT|read/i],
    ['missing section', async (site, value) => rm(localPath(site, value.manifest.documents[0].sections[0].markdownUrl)), /missing|ENOENT|read/i],
    ['incorrect token count', async (site, value) => { value.manifest.documents[0].markdownTokens++; refresh(value); await writeFixture(site, value); }, /markdownTokens|token/i],
    ['incorrect byte count', async (site, value) => { value.manifest.documents[0].sections[0].markdownBytes++; refresh(value); await writeFixture(site, value); }, /markdownBytes|bytes/i],
    ['missing snapshot', async site => rm(path.join(site, 'documents.sync.json')), /documents.sync.json|missing|ENOENT/i]
  ];
  for (const [index, [name, mutate, pattern]] of cases.entries()) await t.test(name, async () => {
    const site = path.join(root, String(index));
    await mkdir(site);
    const value = fixture();
    await writeFixture(site, value);
    await mutate(site, value);
    const result = await checkOutputContract(site);
    if (pattern) {
      assert.equal(result.status, 'error');
      assert.match(result.findings.join('\n'), pattern);
    } else {
      assert.equal(result.status, 'ok', result.findings.join('\n'));
      assert.deepEqual(result.findings, []);
      assert.equal(result.documents, 3);
      assert.equal(result.sections, 1);
    }
  });
});
