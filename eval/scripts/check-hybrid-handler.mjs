// Exercise real HTTP Request/Response handling with cached query vectors.
// Experimental ranking adapters are local to this script; production is unchanged.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Retriever } from '../../framework/dist/retrieval.js';
import { createSearchHandler } from '../../framework/dist/search-handler.js';
import { identifierRescue } from '../../framework/dist/search-identifier.js';
import { embeddingInput } from '../../framework/dist/index-build.js';
import { models } from './benchmark-embeddings.mjs';
import { fingerprint, readCachedVectors, weightedFusion, answerRank, summarize } from './diagnose-hybrid-search.mjs';
const [site, cache, queryFile, baselineFile, output, rankingFile, queryCache = cache] = process.argv.slice(2);
if (!rankingFile) throw new Error('Usage: SITE CACHE QUERIES BASELINE OUTPUT RANKING_REPORT [QUERY_CACHE]');
globalThis.fetch = async () => { throw new Error('Network disabled'); };
const index = JSON.parse(await readFile(path.join(site, 'ai/chunks.json'), 'utf8'));
const manifest = JSON.parse(await readFile(path.join(site, 'documents.json'), 'utf8'));
const querySet = JSON.parse(await readFile(queryFile, 'utf8'));
const baseline = JSON.parse(await readFile(baselineFile, 'utf8'));
const rankingReport = JSON.parse(await readFile(rankingFile, 'utf8'));
if (rankingReport.corpusDigest !== baseline.corpusDigest || rankingReport.queryDigest !== baseline.queryDigest) throw new Error('Ranking report fingerprint mismatch');
if (fingerprint(index) !== baseline.corpusDigest || fingerprint(querySet) !== baseline.queryDigest) throw new Error('Frozen input mismatch');
const doc = await readCachedVectors(models.find(m => m.name === 'voyage-4-large'), index.chunks.map(embeddingInput), 'document', baseline.dimension, [cache]);
const query = await readCachedVectors(models.find(m => m.name === 'voyage-4-lite'), querySet.queries.map(q => q.query), 'query', baseline.dimension, [queryCache]);
const vectors = new Map(querySet.queries.map((q, at) => [q.query.trim(), query.vectors[at]]));
const textForVector = new Map([...vectors].map(([text, vector]) => [vector, text]));
const retriever = new Retriever(index, { meta: { ids: index.chunks.map(c => c.id), digests: index.chunks.map(c => c.digest) }, vectors: doc.vectors });
const summaries = new Map(manifest.documents.map(d => [`${[d.variant.channel, d.variant.version, d.variant.language].join('|')}:${d.id}`, d.summary]));
const idForUrl = new Map(index.chunks.map(c => [`${c.variant}:${c.url}`, c.docId]));
const handlerOptions = { hosts: ['local.test'], readerFilters: { facets: manifest.readerFacets, typeDefaults: {}, controls: { sidebar: false } }, pageSummaries: summaries };
const request = (q, limit) => new Request('http://local.test/search', { method: 'POST', headers: { origin: 'http://local.test', 'content-type': 'application/json' }, body: JSON.stringify({ query: q.query, variant: q.variant ?? retriever.variants()[0], readerSelection: q.readerSelection, limit }) });
const report = { schemaVersion: 1, createdAt: new Date().toISOString(), corpusDigest: baseline.corpusDigest, queryDigest: baseline.queryDigest, apiRequests: 0, cases: [], fallbackChecks: [], productionDefault: 'vector', notes: ['Real search handler with cached embeddings and frozen manifest reader facets/summaries.','Vector-only uses the current production retriever. Hybrid variants use evaluation-only vector-method adapters; the response mode remains vector and does not describe those simulated variants.','Current identifier assistance also applies to each semantic candidate; the historical report validates the component rankings before assistance.', 'Latency of embedding APIs and refusal behavior are not evaluated.'] };
for (const limit of [4, 8, 20]) for (const mode of ['vector', 'hybrid-1:1', 'hybrid-2:1', 'hybrid-4:1', 'hybrid-8:1']) {
  const adapter = mode === 'vector' ? retriever : {
    variants: () => retriever.variants(), hasVectors: options => retriever.hasVectors(options),
    lexical: (text, options) => retriever.lexical(text, options),
    vector(vector, options) {
      const text = textForVector.get(vector);
      if (text === undefined) throw new Error('Missing cached query text');
      const depth = Math.max(50, options.limit * 4);
      return weightedFusion(retriever.lexical(text, { ...options, limit: depth }), retriever.vector(vector, { ...options, limit: depth }), { vectorWeight: Number(mode.match(/(\d+):/)[1]), limit: options.limit });
    }
  };
  const handler = createSearchHandler({ ...handlerOptions, retriever: adapter, embedQuery: async q => vectors.get(q) });
  const rows = [];
  for (const q of querySet.queries) {
    const response = await handler(request(q, limit)); const result = await response.json();
    if (response.status !== 200 || result.mode !== 'vector' || result.results.length > limit || result.results.some(r => typeof r.summary !== 'string')) throw new Error('Invalid handler response');
    const variant = q.variant ?? retriever.variants()[0];
    const pages = result.results.map(r => idForUrl.get(`${variant}:${r.url}`));
    if (pages.some(p => !p) || new Set(pages).size !== pages.length) throw new Error('Unknown or duplicate handler page');
    if (limit === 8) {
      const historical = rankingReport.profiles.find(p => p.profile.name === 'handler-default-ranking').scores[mode].rows[rows.length].top.slice(0, 8);
      const scope = { variant, readerSelection: q.readerSelection, limit: 48 };
      const component = adapter.vector(vectors.get(q.query.trim()), scope);
      const componentPages = [...new Set(component.map(h => h.chunk.docId))].slice(0, 8);
      if (JSON.stringify(componentPages) !== JSON.stringify(historical)) throw new Error('Component ranking differs from frozen historical report');
      const assisted = identifierRescue(q.query, component, adapter.lexical(q.query, { ...scope, limit: 192 }));
      const expected = [...new Set(assisted.map(h => h.chunk.docId))].slice(0, 8);
      if (JSON.stringify(pages) !== JSON.stringify(expected)) throw new Error('Handler does not reproduce identifier-assisted page rankings');
    }
    rows.push({ ...q, rank: answerRank(q, pages), top: pages });
  }
  report.cases.push({ limit, mode, scores: summarize(rows) });
  console.log(`${limit} pages, ${mode}: Hit@3 ${report.cases.at(-1).scores.overall.hitRate[3]}`);
  for (const failure of ['provider-error', 'budget-denied', 'deadline']) {
    const embedQuery = failure === 'provider-error' ? async () => { throw new Error('Synthetic provider failure'); } : failure === 'deadline' ? () => new Promise(() => {}) : async q => vectors.get(q);
    const fallback = createSearchHandler({ ...handlerOptions, retriever: adapter, embedQuery, semanticTimeoutMs: 1, ...(failure === 'budget-denied' ? { budget: { reserve: async () => false } } : {}) });
    for (const q of querySet.queries.filter(q => q.readerSelection).concat(querySet.queries.slice(0, 1))) {
      const response = await fallback(request(q, limit)); const result = await response.json();
      const scope = { variant: q.variant ?? retriever.variants()[0], readerSelection: q.readerSelection, limit: Math.min(100, limit * 6) };
      const seen = new Set();
      const expected = retriever.lexical(q.query, scope).filter(h => { if (seen.has(h.chunk.docId)) return false; seen.add(h.chunk.docId); return true; }).slice(0, limit).map(h => h.chunk.url);
      if (response.status !== 200 || result.mode !== 'lexical' || JSON.stringify(result.results.map(r => r.url)) !== JSON.stringify(expected)) throw new Error(JSON.stringify({ message: 'Lexical fallback differs', mode, limit, failure, query: q.query, status: response.status, result, expected }));
      report.fallbackChecks.push({ limit, mode, failure, query: q.query, status: 'passed' });
    }
  }
}
await mkdir(output);
await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`${report.fallbackChecks.length} fallback checks passed; zero API calls`);
