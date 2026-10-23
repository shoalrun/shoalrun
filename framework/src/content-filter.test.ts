import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesContentFilter, validateContentFilter } from './content-filter.js';
import { validateReaderFilters } from './reader-filters.js';

const facets = validateReaderFilters({ facets: {
  audience: { label: 'Audience', options: { developer: 'Developer', operator: 'Operator' } },
  region: { label: 'Region', options: { eu: 'Europe', us: 'United States' } }
} });

test('build selection requires all facets and any chosen value, including shared pages', () => {
  const selection = validateContentFilter({ audience: ['developer'], region: ['eu', 'us'] }, facets);
  assert.equal(matchesContentFilter({ audience: ['developer', 'operator'], region: ['eu'] }, selection), true);
  assert.equal(matchesContentFilter({ audience: ['operator'], region: ['eu'] }, selection), false);
  assert.equal(matchesContentFilter({ audience: ['developer'] }, selection), false);
  assert.equal(matchesContentFilter(undefined, selection), false);
  assert.equal(matchesContentFilter(undefined, undefined), true);
});

test('invalid build selectors fail instead of silently publishing everything', () => {
  for (const value of [{}, { audience: [] }, { typo: ['developer'] }, { audience: ['typo'] }, { audience: 'developer' }]) {
    assert.throws(() => validateContentFilter(value, facets), /site.contentFilter/);
  }
  assert.throws(() => validateContentFilter({ audience: ['developer'] }), /requires configured/);
  assert.equal(validateContentFilter(undefined), undefined);
});

test('independent configs single-source sites by audience or a custom facet across outputs', async t => {
  const { mkdtemp, cp, readFile, rm, access } = await import('node:fs/promises');
  const path = await import('node:path');
  const os = await import('node:os');
  const { fileURLToPath } = await import('node:url');
  const { compile } = await import('./compiler.js');
  const { queryBuiltSite } = await import('./search-query.js');
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-faceted-sites-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(fileURLToPath(new URL('../example-configs/faceted-sites', import.meta.url)), root, { recursive: true });
  for (const [config, prefix, ids, included, excluded] of [
    ['docs', '', ['guide.api', 'guide.home', 'guide.operations'], 'SharedSetup', ''],
    ['developers', '', ['guide.api', 'guide.home'], 'DeveloperRequest', 'EuropeanOperations'],
    ['europe', '/resources', ['guide.home', 'guide.operations'], 'EuropeanOperations', 'DeveloperRequest']
  ] as const) {
    const output = path.join(root, 'dist', config);
    const manifest = await compile(path.join(root, `${config}.config.yaml`), output);
    assert.deepEqual(manifest.documents.map(doc => doc.id).sort(), [...ids].sort());
    const publicOutput = path.join(output, prefix);
    const search = await queryBuiltSite(output, included, { channel: 'production', version: 'current', language: 'en' });
    assert.ok(search.results.length);
    assert.ok(search.results.every(result => manifest.documents.some(doc => doc.url === result.url)));
    for (const resource of ['llms.min.txt', 'llms.txt', 'search-index.json', 'search-index.min.json', 'documents.sync.json', 'sitemap.xml']) {
      const body = await readFile(path.join(publicOutput, resource), 'utf8');
      if (excluded) assert.ok(!body.includes(excluded), resource);
      for (const id of ['guide.api', 'guide.operations'].filter(id => !ids.includes(id as never))) {
        const route = id === 'guide.api' ? '/api-requests' : '/operations';
        assert.ok(!body.includes(`${prefix}${route}`), `${config}: ${resource} excludes ${route}`);
        await assert.rejects(access(path.join(publicOutput, `${route}.md`)));
      }
    }
    const home = await readFile(path.join(publicOutput, 'index.html'), 'utf8');
    assert.ok(home.includes(included) || home.includes('SharedSetup'));
    if (excluded) assert.ok(!home.includes(excluded));
    for (const doc of manifest.documents) {
      assert.ok((await readFile(path.join(output, doc.markdownUrl), 'utf8')).includes('https://'));
    }
  }
});

test('filtered sites reject links and navigation to excluded pages and empty results', async t => {
  const { mkdtemp, cp, readFile, writeFile, rm } = await import('node:fs/promises');
  const path = await import('node:path');
  const os = await import('node:os');
  const { fileURLToPath } = await import('node:url');
  const { compile } = await import('./compiler.js');
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-facet-errors-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(fileURLToPath(new URL('../example-configs/faceted-sites', import.meta.url)), root, { recursive: true });
  const config = path.join(root, 'developers.config.yaml');
  const original = await readFile(config, 'utf8');
  await writeFile(config, original + '\n  - { id: excluded, doc: guide.operations }\n');
  await assert.rejects(compile(config, path.join(root, 'bad-nav')), /missing document guide.operations/);
  await writeFile(config, original);
  const api = path.join(root, 'content/api.md');
  const apiSource = await readFile(api, 'utf8');
  await writeFile(api, apiSource + '\n[Operations](doc:guide.operations)\n');
  await assert.rejects(compile(config, path.join(root, 'bad-link')), /guide.operations/);
  await writeFile(api, apiSource);
  await writeFile(config, original.replace('audience: [developer]', 'audience: [developer], region: [eu]').replace('guide.api', 'guide.home'));
  // The shared overview still matches; use type defaults to test a known choice with no matches.
  await writeFile(path.join(root, 'content/home.md'), (await readFile(path.join(root, 'content/home.md'), 'utf8')).replace('region: [eu, us]', 'region: [us]'));
  await assert.rejects(compile(config, path.join(root, 'empty')), /matched no published pages/);
});

test('generated API pages use resolved type facets and disappear from excluded sites', async t => {
  const { mkdtemp, cp, readFile, writeFile, rm, access } = await import('node:fs/promises');
  const path = await import('node:path');
  const os = await import('node:os');
  const { fileURLToPath } = await import('node:url');
  const { compile } = await import('./compiler.js');
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-facet-api-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(fileURLToPath(new URL('../example-configs/faceted-sites', import.meta.url)), root, { recursive: true });
  await writeFile(path.join(root, 'api.yaml'), 'openapi: 3.1.0\ninfo: { title: Catalog, version: "1" }\npaths:\n  /items:\n    get:\n      operationId: listItems\n      summary: CatalogItemMarker\n      responses:\n        "200": { description: Success }\n');
  const base = path.join(root, 'base.yaml');
  await writeFile(base, (await readFile(base, 'utf8')).replace('readerFilters:\n', 'readerFilters:\n  typeDefaults:\n    api-reference: { audience: [developer], region: [us] }\n') + '\napis:\n  catalog:\n    source: { kind: file, path: ./api.yaml, publish: true }\n    generateReferences: true\n');
  for (const config of ['developers', 'europe']) {
    const output = path.join(root, 'dist', config);
    const manifest = await compile(path.join(root, `${config}.config.yaml`), output, {}, { apiReview: 'report' });
    const reference = manifest.documents.find(doc => doc.type === 'api-reference');
    assert.equal(!!reference, config === 'developers');
    assert.equal(manifest.apiSources.length, config === 'developers' ? 1 : 0);
    const resources = ['documents.json', 'search-index.json', 'llms.min.txt', 'sitemap.xml'];
    for (const resource of resources) {
      const body = await readFile(path.join(output, config === 'europe' ? 'resources' : '', resource), 'utf8');
      if (config === 'europe') assert.ok(!body.includes('CatalogItemMarker'), resource);
    }
    if (reference) await access(path.join(output, reference.markdownUrl));
  }
});

test('separate selected pages may own the same route without colliding across sites', async t => {
  const { mkdtemp, cp, readFile, writeFile, rm } = await import('node:fs/promises');
  const path = await import('node:path');
  const os = await import('node:os');
  const { fileURLToPath } = await import('node:url');
  const { compile } = await import('./compiler.js');
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-facet-routes-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(fileURLToPath(new URL('../example-configs/faceted-sites', import.meta.url)), root, { recursive: true });
  const operations = path.join(root, 'content/operations.md');
  await writeFile(operations, (await readFile(operations, 'utf8')).replace('slug: /operations', 'slug: /api-requests'));
  for (const config of ['developers', 'europe']) {
    const output = path.join(root, 'dist', config);
    const manifest = await compile(path.join(root, `${config}.config.yaml`), output);
    const route = config === 'developers' ? '/api-requests' : '/resources/api-requests';
    assert.equal(manifest.documents.find(doc => doc.url === route)?.id, config === 'developers' ? 'guide.api' : 'guide.operations');
  }
});
