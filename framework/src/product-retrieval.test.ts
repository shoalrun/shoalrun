import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { compile } from './compiler.js';
import { buildChunkIndex } from './index-build.js';
import { queryBuiltSite } from './search-query.js';
import { getDocumentationPage, listDocumentationPublications, documentationTokens } from './documentation-core.js';
import { loadMcpRuntime } from './mcp-http.js';
import { Retriever } from './retrieval.js';
import { CardIndex, encodeVector } from './answer-cards.js';
import { publicationKey } from './publication-identity.js';

const coordinate = { channel: 'production', version: 'v1', language: 'en' };

test('products with identical document and publication names remain separate in search, chunks, direct reads and MCP', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-product-retrieval-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(path.join(directory, 'content'));
  const config = path.join(directory, 'docs.config.yaml');
  const output = path.join(directory, 'site');
  await writeFile(config, JSON.stringify({
    schemaVersion: 1, site: { title: 'Product retrieval' },
    publications: {
      defaults: coordinate,
      channels: { production: {} },
      products: {
        alpha: { pathPrefix: '/alpha', defaultVersion: 'v1', versions: { v1: {} } },
        beta: { pathPrefix: '/beta', defaultVersion: 'v1', versions: { v1: {} } },
      },
      enabled: ['alpha', 'beta'].map(product => ({ ...coordinate, product })),
    },
    frontmatter: { defaults: { type: 'guide', access: { policy: 'public' } } },
    outputs: { html: { shareImages: false, search: { provider: 'lexical' } } },
    mcp: { enabled: true, access: 'public', publication: { ...coordinate, product: 'alpha' } },
  }));
  for (const product of ['alpha', 'beta']) {
    await writeFile(path.join(directory, 'content', `${product}.md`), `---\n${JSON.stringify({ id: 'guide.start', title: 'Start guide', summary: 'Shared instructions.', slug: '/start', ...coordinate, product })}\n---\n\n${product.toUpperCase()}-ONLY-MARKER. Shared instructions for this product.\n\n## Configure\n\nConfigure ${product} using its own documented settings.\n`);
  }
  await compile(config, output);
  const discovery = await listDocumentationPublications(output, { limit: 1 });
  assert.equal(discovery.total, 2);
  assert.equal(discovery.publications.length, 1);
  assert.equal(discovery.nextOffset, 1);
  const next = await listDocumentationPublications(output, { offset: discovery.nextOffset, limit: 1 });
  assert.equal(next.nextOffset, undefined);
  assert.notEqual(discovery.publications[0].product, next.publications[0].product);
  const scoped = await loadMcpRuntime(output);
  assert.ok(scoped);
  const endpointDiscovery = await listDocumentationPublications(scoped.directory);
  assert.deepEqual(endpointDiscovery.publications, [{ ...coordinate, product: 'alpha' }]);
  assert.ok(!JSON.stringify(endpointDiscovery).includes('beta'));
  const { index } = await buildChunkIndex(output);
  assert.equal(new Set(index.chunks.map(chunk => chunk.id)).size, index.chunks.length);
  assert.equal(new Set(index.chunks.map(chunk => chunk.variant)).size, 2);
  const retriever = new Retriever(index);
  await assert.rejects(queryBuiltSite(output, 'Shared instructions', coordinate), /multiple publications/);
  await assert.rejects(getDocumentationPage(output, 'guide.start', coordinate), { code: 'invalid_input' });
  for (const product of ['alpha', 'beta']) {
    const selection = { ...coordinate, product };
    const other = product === 'alpha' ? 'beta' : 'alpha';
    const search = await queryBuiltSite(output, 'Shared instructions', selection);
    assert.deepEqual(search.publication, selection);
    assert.equal(search.results.length, 1);
    assert.ok(search.results.every(result => result.url.startsWith(`/${product}/`)));
    assert.equal(search.results[0].read.arguments.product, product);
    const read = await getDocumentationPage(output, 'guide.start', selection);
    assert.equal(read.publication.product, product);
    assert.match(read.content, new RegExp(product.toUpperCase() + '-ONLY-MARKER'));
    assert.doesNotMatch(read.content, new RegExp(other.toUpperCase() + '-ONLY-MARKER'));
    const variant = publicationKey(selection);
    const passages = retriever.lexical('Shared instructions', { variant });
    assert.ok(passages.length > 0);
    assert.ok(passages.every(hit => hit.chunk.variant === variant && hit.chunk.url.startsWith(`/${product}/`)));
    assert.ok(index.chunks.filter(chunk => chunk.variant === variant).every(chunk => chunk.id.startsWith(encodeURIComponent(variant) + ':guide.start#')));
  }
  const client = new Client({ name: 'product-retrieval-test', version: '1' });
  t.after(() => client.close());
  const cli = fileURLToPath(new URL('./cli.js', import.meta.url));
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [cli, 'docs', 'mcp', '--site', output], stderr: 'pipe' }));
  const discovered = await client.callTool({ name: 'get_publications', arguments: {} });
  assert.ok(!discovered.isError);
  assert.equal((discovered.structuredContent as any).publications.length, 2);
  for (const { product } of (discovered.structuredContent as any).publications) {
    const search = await client.callTool({ name: 'search_docs', arguments: { query: 'Shared instructions', ...coordinate, product } });
    assert.ok(!search.isError);
    const instruction = (search.structuredContent as any).results[0].read;
    assert.equal(instruction.arguments.product, product);
    const page = await client.callTool({ name: instruction.tool, arguments: instruction.arguments });
    assert.ok(!page.isError);
    assert.equal((page.structuredContent as any).publication.product, product);
    assert.match((page.structuredContent as any).content, new RegExp(product.toUpperCase() + '-ONLY-MARKER'));
  }
  const ambiguous = await client.callTool({ name: 'get_page', arguments: { id: 'guide.start', ...coordinate } });
  assert.equal(ambiguous.isError, true);
  assert.equal((ambiguous.structuredContent as any).error.code, 'invalid_input');
});

test('publication discovery paginates large catalogs within the requested token budget', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-product-catalog-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const enabled = Array.from({ length: 150 }, (_, i) => ({ ...coordinate, product: 'product-' + String(i).padStart(3, '0') }));
  await writeFile(path.join(directory, 'documents.json'), JSON.stringify({ schemaVersion: 1, documents: [], publications: { enabled,
    products: Object.fromEntries(enabled.map(item => [item.product, { label: 'Product ' + item.product, defaultVersion: 'v1', versions: ['v1'] }])) } }));
  const products: string[] = [];
  let offset = 0;
  while (true) {
    const page = await listDocumentationPublications(directory, { offset, limit: 100, maxTokens: 512 });
    assert.ok(page.publications.length > 0);
    assert.ok(page.publications.length < 100);
    assert.ok(documentationTokens(JSON.stringify(page)) <= 512);
    assert.equal(page.total, 150);
    assert.equal(page.products?.length, page.publications.length);
    products.push(...page.publications.map(item => item.product!));
    if (page.nextOffset === undefined) break;
    assert.ok(page.nextOffset > offset);
    offset = page.nextOffset;
  }
  assert.deepEqual(products, enabled.map(item => item.product));
});

test('answer cards with identical questions and vectors cannot match another product publication', () => {
  const vector = Float32Array.of(1, 0);
  const index = new CardIndex({ schemaVersion: 1, embedding: { provider: 'stub', model: 'stub', space: 'stub', dimension: 2 }, cards: ['alpha', 'beta'].map(product => ({
    id: 'start', question: 'How do I start?', aliases: [], answer: `${product} instructions.`, sources: [], digests: {}, model: 'stub', generatedAt: '2026-11-04T00:00:00Z',
    variant: publicationKey({ ...coordinate, product }), decision: 'answered' as const, vectors: [encodeVector(vector)],
  })) });
  for (const product of ['alpha', 'beta']) {
    const match = index.match(vector, { threshold: 0.9, variant: publicationKey({ ...coordinate, product }) });
    assert.equal(match?.card.answer, `${product} instructions.`);
  }
  assert.equal(index.match(vector, { threshold: 0.9, variant: publicationKey(coordinate) }), undefined);
  assert.equal(index.match(vector, { threshold: 0.9, variant: publicationKey({ ...coordinate, product: 'missing' }) }), undefined);
});
