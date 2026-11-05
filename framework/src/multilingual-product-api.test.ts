import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { compile } from './compiler.js';
import { apiCandidates } from './api-selection.js';
import { materializeApiPages } from './api-materialize.js';
import { renderIngredientDraft } from './ingredient-draft.js';

for (const productMode of [false, true]) test(`${productMode ? 'product' : 'legacy'} multilingual API source publishes once and authoring keeps the requested language`, async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-multilingual-api-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'content'));
  const config = path.join(root, 'docs.config.yaml');
  const publication = { ...(productMode ? { product: 'payments' } : {}), channel: 'production', version: 'v1' };
  const enabled = ['en', 'fr'].map(language => ({ ...publication, language }));
  const settings = {
    schemaVersion: 1, site: { title: 'Multilingual API' },
    publications: {
      defaults: { ...publication, language: 'en' }, channels: { production: {} },
      ...(productMode ? { products: {
        payments: { pathPrefix: '/payments', defaultVersion: 'v1', versions: { v1: { pathPrefix: '/v1' }, v2: { pathPrefix: '/v2' } } },
        reporting: { pathPrefix: '/reporting', defaultVersion: 'v1', versions: { v1: { pathPrefix: '/v1' } } }
      } } : { versions: { v1: { pathPrefix: '/v1' }, v2: { pathPrefix: '/v2' } } }),
      enabled: [...enabled, { ...publication, version: 'v2', language: 'fr' }, ...(productMode ? [{ product: 'reporting', channel: 'production', version: 'v1', language: 'fr' }] : [])]
    },
    outputs: { html: { highlighting: { provider: 'none' }, shareImages: false } },
    apis: { demo: {
      ...(productMode ? { product: 'payments' } : {}),
      source: { kind: 'file', path: './api.yaml', publish: true },
      generateReferences: true,
      operations: [] as Array<{ id: string; reference: string; sourceOperationId: string }>
    } }
  };
  await writeFile(config, JSON.stringify(settings));
  const source = JSON.stringify({
    openapi: '3.1.0', info: { title: 'Shared API source', version: '1' }, servers: [{ url: 'https://api.example.com' }],
    paths: { '/items': { post: {
      operationId: 'create', summary: 'Create an item',
      requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' } } }, examples: { sample: { value: { name: 'Example' } } } } } },
      responses: { '201': { description: 'Created', content: { 'application/json': { schema: { type: 'object', properties: { id: { type: 'string' } } }, example: { id: 'item_123' } } } } }
    } } }
  });
  await writeFile(path.join(root, 'api.yaml'), source);
  const output = path.join(root, 'dist');
  const manifest = await compile(config, output, {}, { apiReview: 'report' });
  assert.equal(manifest.apiSources.length, 1, 'Language variants must share one published OpenAPI source');
  const expectedSource = `/api/demo/${productMode ? 'payments/' : ''}production/v1/api.yaml`;
  assert.equal(manifest.apiSources[0].sourceUrl, expectedSource);
  assert.equal(await readFile(path.join(output, expectedSource), 'utf8'), source);
  assert.deepEqual(manifest.documents.filter(doc => doc.id === 'reference.demo.create').map(doc => doc.variant.language).sort(), ['en', 'fr']);
  // Compile with discovery-generated references first. Explicit operation
  // bindings are authored references, so add their registry only for authoring.
  settings.apis.demo.operations = [{ id: 'demo.create', reference: 'reference.demo.create', sourceOperationId: 'create' }];
  await writeFile(config, JSON.stringify(settings));
  const candidates = await apiCandidates(config, 'demo', { ...publication, language: 'fr' });
  assert.equal(candidates.publication.language, 'fr');
  assert.equal(candidates.sourceFile, path.join(root, 'api.yaml'));
  // An authored source with no language belongs to the project's default
  // English publication, even when materialization requests French.
  const englishFile = path.join(root, 'content', 'english.mdx');
  await writeFile(englishFile, `---\n${JSON.stringify({ id: 'reference.demo.create', title: 'Create an item', summary: 'English authored reference.', type: 'api-reference', slug: '/reference/create', ...(productMode ? { publications: [publication] } : publication), operations: ['demo.create'], access: { policy: 'draft' } })}\n---\nEnglish reference.\n`);
  const frenchOutput = path.join(root, 'content', 'french');
  const materialized = await materializeApiPages(config, 'demo', { ...publication, language: 'fr', all: true, output: frenchOutput });
  assert.equal(materialized.written.length, 1);
  assert.match(await readFile(materialized.written[0], 'utf8'), /language: fr/);
  const frenchAgain = await materializeApiPages(config, 'demo', { ...publication, language: 'fr', all: true, output: frenchOutput });
  assert.equal(frenchAgain.written.length, 0);
  assert.deepEqual(frenchAgain.skipped, materialized.written);
  const englishAgain = await materializeApiPages(config, 'demo', { ...publication, language: 'en', all: true });
  assert.equal(englishAgain.written.length, 0);
  assert.deepEqual(englishAgain.skipped, [await realpath(englishFile)]);
  const spec = path.join(root, 'ingredient.yaml');
  const ingredient = { schemaVersion: 1, id: 'ingredient.create', title: 'Create an item', summary: 'Submit an example request.', slug: '/ingredients/create', operation: 'demo.create', requestExample: 'sample', publication: { ...publication, language: 'fr' } };
  await writeFile(spec, JSON.stringify(ingredient));
  const draft = await renderIngredientDraft(config, spec);
  assert.match(draft.content, /language: fr/);
  assert.match(draft.content, /curl --request POST/);
  await assert.rejects(apiCandidates(config, 'demo', { ...publication, version: 'v2', language: 'fr' }), /local file source/);
  await assert.rejects(materializeApiPages(config, 'demo', { ...publication, version: 'v2', language: 'fr', all: true }), /local file source/);
  await writeFile(spec, JSON.stringify({ ...ingredient, publication: { ...publication, version: 'v2', language: 'fr' } }));
  await assert.rejects(renderIngredientDraft(config, spec), /local OpenAPI source/);
  if (productMode) {
    await assert.rejects(apiCandidates(config, 'demo', { product: 'reporting', channel: 'production', version: 'v1', language: 'fr' }), /local file source/);
    await writeFile(spec, JSON.stringify({ ...ingredient, publication: { product: 'reporting', channel: 'production', version: 'v1', language: 'fr' } }));
    await assert.rejects(renderIngredientDraft(config, spec), /OpenAPI source/);
  }
});
