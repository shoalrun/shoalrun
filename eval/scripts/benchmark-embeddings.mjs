// Compare providers on a frozen Shoalrun passage index and its labeled retrieval queries.
// Usage: node eval/scripts/benchmark-embeddings.mjs SITE --out DIRECTORY
// Load VOYAGE_API_KEY and COHERE_API_KEY in the environment. Vectors are cached by
// exact model, endpoint, dimension, input type, and texts; production indexes are never changed.
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { embeddingInput } from '../../framework/dist/index-build.js';
import { Retriever } from '../../framework/dist/retrieval.js';
import { postJson, providerError } from '../../framework/dist/provider-http.js';
import { createRequire } from 'node:module';
const { getEncoding } = createRequire(new URL('../../framework/package.json', import.meta.url))('js-tiktoken');

const here = path.dirname(fileURLToPath(import.meta.url));
const benchmarkGlossary = await readFile(path.join(here, '../fixtures/embedding-benchmark-glossary.md'), 'utf8');
const hash = value => createHash('sha256').update(JSON.stringify(value) ?? 'null').digest('hex');
export const models = [
  { name: 'voyage-4-large', provider: 'voyage', space: 'voyage-4', keyEnv: 'VOYAGE_API_KEY', endpoint: 'https://api.voyageai.com/v1/embeddings' },
  { name: 'voyage-4', provider: 'voyage', space: 'voyage-4', keyEnv: 'VOYAGE_API_KEY', endpoint: 'https://api.voyageai.com/v1/embeddings' },
  { name: 'voyage-4-lite', provider: 'voyage', space: 'voyage-4', keyEnv: 'VOYAGE_API_KEY', endpoint: 'https://api.voyageai.com/v1/embeddings' },
  { name: 'embed-v5.0-pro', provider: 'cohere', space: 'cohere-embed-5', keyEnv: 'COHERE_API_KEY', endpoint: 'https://api.cohere.com/v2/embed' },
  { name: 'embed-v5.0-fast', provider: 'cohere', space: 'cohere-embed-5', keyEnv: 'COHERE_API_KEY', endpoint: 'https://api.cohere.com/v2/embed' }
];

export function normalizedVectors(rows, count, dimension) {
  if (!Array.isArray(rows) || rows.length !== count) throw new Error('Embedding response has the wrong number of rows');
  return rows.map(row => {
    if (!Array.isArray(row) || row.length !== dimension || row.some(value => typeof value !== 'number' || !Number.isFinite(value))) throw new Error('Embedding response has invalid dimensions or values');
    const vector = Float32Array.from(row);
    const norm = Math.hypot(...vector);
    if (!Number.isFinite(norm) || norm === 0) throw new Error('Embedding response has an invalid vector');
    return vector.map(value => value / norm);
  });
}

export async function requestEmbeddings(model, texts, inputType, dimension, transport = {}) {
  const key = process.env[model.keyEnv];
  if (!key) throw new Error(`Set ${model.keyEnv} to benchmark ${model.name}`);
  const body = model.provider === 'cohere'
    ? { model: model.name, texts, input_type: inputType === 'document' ? 'search_document' : 'search_query', output_dimension: dimension, embedding_types: ['float'], truncate: 'NONE' }
    : { model: model.name, input: texts, input_type: inputType, output_dimension: dimension, output_dtype: 'float', truncation: false };
  const response = await postJson(model.provider, model.endpoint, { authorization: `Bearer ${key}` }, body, transport);
  let rows;
  if (model.provider === 'cohere') rows = response?.embeddings?.float;
  else {
    const data = response?.data;
    if (!Array.isArray(data) || data.length !== texts.length || new Set(data.map(row => row?.index)).size !== texts.length || data.some(row => !Number.isInteger(row?.index) || row.index < 0 || row.index >= texts.length)) throw new Error('Voyage response has invalid row indices');
    rows = [...data].sort((a, b) => a.index - b.index).map(row => row.embedding);
  }
  return { vectors: normalizedVectors(rows, texts.length, dimension), billedTokens: model.provider === 'cohere' ? response?.meta?.billed_units?.input_tokens ?? null : response?.usage?.total_tokens ?? null };
}

export function scoreQueries(index, queries, stored, queryVectors, mode) {
  const retriever = new Retriever(index, stored);
  const rows = queries.map((query, at) => {
    const options = { limit: 60, ...(query.variant ? { variant: query.variant } : {}), ...(query.readerSelection ? { readerSelection: query.readerSelection } : {}) };
    const hits = mode === 'lexical' ? retriever.lexical(query.query, options) : mode === 'vector' ? retriever.vector(queryVectors[at], options) : retriever.hybrid(query.query, queryVectors[at], options);
    const pages = [...new Set(hits.map(hit => hit.chunk.docId))];
    const groupRanks = (query.expectGroups ?? [query.expect]).map(group => pages.findIndex(id => group.includes(id)) + 1);
    const rank = groupRanks.every(Boolean) ? Math.max(...groupRanks) : 0;
    return { ...query, rank, top: pages.slice(0, 10), bestScore: hits[0]?.score ?? null };
  });
  const summarize = subset => ({ count: subset.length,
    hitRate: Object.fromEntries([1, 3, 5, 10].map(k => [k, subset.filter(row => row.rank > 0 && row.rank <= k).length / subset.length])),
    mrr: subset.reduce((sum, row) => sum + (row.rank ? 1 / row.rank : 0), 0) / subset.length });
  const answerable = rows.filter(row => row.kind !== 'none');
  return { overall: summarize(answerable), bySplit: Object.fromEntries([...new Set(answerable.map(row => row.split ?? 'original'))].map(split => [split, summarize(answerable.filter(row => (row.split ?? 'original') === split))])), byKind: Object.fromEntries([...new Set(answerable.map(row => row.kind))].map(kind => [kind, summarize(answerable.filter(row => row.kind === kind))])), rows };
}

export function pairedHitRate(left, right, repetitions = 2000) {
  const a = left.rows.filter(row => row.kind !== 'none');
  const b = right.rows.filter(row => row.kind !== 'none');
  if (!a.length || a.length !== b.length || a.some((row, at) => hash(row.query) !== hash(b[at].query) || row.kind !== b[at].kind || hash(row.readerSelection) !== hash(b[at].readerSelection) || row.variant !== b[at].variant)) throw new Error('Paired scores must use the same query order and scope');
  const differences = a.map((row, at) => Number(b[at].rank > 0 && b[at].rank <= 3) - Number(row.rank > 0 && row.rank <= 3));
  let seed = 123456789;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
  const samples = Array.from({ length: repetitions }, () => {
    let sum = 0;
    for (let at = 0; at < differences.length; at++) sum += differences[Math.floor(random() * differences.length)];
    return sum / differences.length;
  }).sort((a, b) => a - b);
  return { delta: differences.reduce((sum, value) => sum + value, 0) / differences.length, ci95: [samples[Math.floor(repetitions * 0.025)], samples[Math.floor(repetitions * 0.975)]], wins: differences.filter(value => value > 0).length, losses: differences.filter(value => value < 0).length, ties: differences.filter(value => value === 0).length };
}

export function tokenPacer(limit, now = Date.now, sleep = ms => new Promise(resolve => setTimeout(resolve, ms))) {
  let recent = [];
  return async tokens => {
    if (tokens > limit) throw new Error('One batch exceeds the token pacing limit; reduce batch size or increase --cohere-tpm');
    while (true) {
      recent = recent.filter(entry => now() - entry.time < 60_000);
      if (recent.reduce((sum, entry) => sum + entry.tokens, 0) + tokens <= limit && recent.length < 80) break;
      await sleep(Math.max(1, 60_001 - (now() - recent[0].time)));
    }
    recent.push({ time: now(), tokens });
  };
}

async function cachedEmbeddings(model, texts, inputType, dimension, directory, beforeRequest) {
  const vectors = [];
  const stats = { liveRequests: 0, cachedRequests: 0, liveMs: 0, billedTokens: 0, tokensReported: true };
  for (let start = 0; start < texts.length; start += 32) {
    const batch = texts.slice(start, start + 32);
    const cacheKey = hash({ version: 1, model, dimension, inputType, texts: batch });
    const file = path.join(directory, `${cacheKey}.json`);
    let cached;
    try { cached = JSON.parse(await readFile(file, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (cached) {
      if (cached.cacheKey !== cacheKey) throw new Error('Embedding cache fingerprint mismatch');
      vectors.push(...normalizedVectors(cached.vectors, batch.length, dimension));
      stats.cachedRequests++;
    } else {
      await beforeRequest(model, batch);
      const started = performance.now();
      const result = await requestEmbeddings(model, batch, inputType, dimension, { retryDelayMs: model.provider === 'cohere' ? 20_000 : 1000 });
      stats.liveMs += performance.now() - started;
      stats.liveRequests++;
      if (result.billedTokens === null) stats.tokensReported = false;
      else stats.billedTokens += result.billedTokens;
      vectors.push(...result.vectors);
      const temporary = `${file}.${process.pid}.tmp`;
      await writeFile(temporary, JSON.stringify({ cacheKey, vectors: result.vectors.map(vector => [...vector]), billedTokens: result.billedTokens }) + '\n');
      await rename(temporary, file);
    }
  }
  return { vectors, stats };
}

export function reportMarkdown(report, { dataUrl } = {}) {
  const percent = value => `${(value * 100).toFixed(1)}%`;
  const lines = ['# Shoalrun embedding benchmark', '', `Run: ${report.createdAt}. Dimensions: ${report.dimension} float32. Corpus: ${report.pages} pages, ${report.passages} passages. Queries: ${report.queries} (${report.answerable} answerable).`, '',
    'We searched the same frozen documentation with each setup. All models received the same complete text, questions, and reader-view settings. Scores measure whether expected pages appear near the top; they do not measure chatbot answer quality.', '',
    ...(dataUrl ? [`Detailed results: [download or inspect the benchmark JSON](${dataUrl}).`, ''] : []),
    benchmarkGlossary.trim(), '', '## Retrieval results', '',
    '| Documents | Queries | Mode | Hit@1 | Hit@3 | Hit@5 | Hit@10 | MRR |', '| --- | --- | --- | --- | --- | --- | --- | --- |'];
  for (const run of report.runs) for (const [mode, scores] of Object.entries(run.scores)) lines.push(`| ${run.documentModel} | ${run.queryModel} | ${mode} | ${[1, 3, 5, 10].map(k => percent(scores.overall.hitRate[k])).join(' | ')} | ${scores.overall.mrr.toFixed(3)} |`);
  if (report.runs.some(run => Object.values(run.scores).some(scores => scores.bySplit?.additional))) {
    lines.push('', '## Original and added queries', '', 'Success metrics exclude no-answer cases. Original means the unchanged 94-row CI fixture; additional means the 106 new cases labeled against the same frozen docs before running the models. These are author-labeled cases, not an independently judged held-out set.', '', '| Documents | Queries | Mode | Split | Answerable | Hit@3 | MRR |', '| --- | --- | --- | --- | --- | --- | --- |');
    for (const run of report.runs) for (const [mode, scores] of Object.entries(run.scores)) for (const [split, subset] of Object.entries(scores.bySplit ?? { original: scores.overall })) lines.push(`| ${run.documentModel} | ${run.queryModel} | ${mode} | ${split} | ${subset.count} | ${percent(subset.hitRate[3])} | ${subset.mrr.toFixed(3)} |`);
  }
  lines.push('', '## Paired comparisons', '', 'Differences are candidate minus the current Voyage Large/Lite baseline, in percentage points. The 95% intervals use 2,000 seeded paired bootstrap samples of answerable query rows. Related queries are not independent; these intervals describe this labeled set and do not establish general model superiority.', '', '| Candidate | Mode | Hit@3 difference (percentage points) | 95% interval (percentage points) | Wins | Losses |', '| --- | --- | --- | --- | --- | --- |');
  for (const comparison of report.comparisons) lines.push(`| ${comparison.candidate} | ${comparison.mode} | ${(comparison.delta * 100).toFixed(1)} | ${comparison.ci95.map(value => (value * 100).toFixed(1)).join(' to ')} | ${comparison.wins} | ${comparison.losses} |`);
  lines.push('', '## Live embedding timing', '', 'Document and quality-query requests use batches of at most 32. Batched timings measure request time, not interactive query latency or total indexing wall time. Fresh single-query samples bypass the cache; they include API/network time and any provider retries, but exclude retrieval time and intentional client rate-limit pacing. Models run sequentially, so service conditions and request order can affect timings.', '', '| Model | Document requests, live/cached | Live document ms | Query requests, live/cached | Single-query samples | p50 ms | p95 ms |', '| --- | --- | --- | --- | --- | --- | --- |');
  for (const run of report.models) if (run.status === 'ok') lines.push(`| ${run.name} | ${run.documents.liveRequests}/${run.documents.cachedRequests} | ${run.documents.liveMs.toFixed(0)} | ${run.queries.liveRequests}/${run.queries.cachedRequests} | ${run.latency.samples.length} | ${run.latency.p50?.toFixed(0) ?? '—'} | ${run.latency.p95?.toFixed(0) ?? '—'} |`);
  lines.push('', '## Limits and reproducibility', '', 'Corpus and query fingerprints are retained in the detailed JSON report. Each passage and query has a separate vector for each model; cross-model retrieval is tested only within a vendor’s documented shared embedding space.', '',
    'This is an English documentation retrieval test, not a multimodal or multilingual benchmark. Existing labels accept alternative pages and may miss other relevant results. The original fixture is used by CI; added cases broaden coverage but are not a held-out test set. Per-query rankings, input fingerprints, usage, model errors, and category scores are retained in report.json. Production configuration and vectors are unchanged.', '',
    'Model references: [Cohere Embed 5](https://docs.cohere.com/changelog/embed-v5), [Cohere Embed API](https://docs.cohere.com/reference/embed), [Voyage embeddings](https://docs.voyageai.com/docs/embeddings).');
  const failures = report.models.filter(run => run.status !== 'ok');
  if (failures.length) lines.push('', '## Incomplete models', '', ...failures.map(run => `- ${run.name}: ${run.error}`));
  return lines.join('\n') + '\n';
}

async function main(args) {
  const site = args[0];
  if (!site || site.startsWith('--')) throw new Error('Usage: node eval/scripts/benchmark-embeddings.mjs SITE --out DIRECTORY [--queries FILE] [--dimension 1024] [--latency-samples 12] [--latency-repeats 2] [--cohere-tpm 80000]');
  const options = {};
  for (let at = 1; at < args.length; at += 2) {
    if (!['--out', '--queries', '--dimension', '--latency-samples', '--latency-repeats', '--cohere-tpm'].includes(args[at]) || args[at + 1] === undefined) throw new Error(`Unknown or incomplete option ${args[at]}`);
    options[args[at].slice(2)] = args[at + 1];
  }
  if (!options.out) throw new Error('--out is required');
  const dimension = Number(options.dimension ?? 1024);
  if (![256, 512, 1024, 2048].includes(dimension)) throw new Error('Choose dimensions shared by all benchmark models: 256, 512, 1024, or 2048');
  const latencySamples = Number(options['latency-samples'] ?? 12);
  const latencyRepeats = Number(options['latency-repeats'] ?? 2);
  if (!Number.isSafeInteger(latencySamples) || latencySamples < 0 || latencySamples > 100 || !Number.isSafeInteger(latencyRepeats) || latencyRepeats < 1 || latencyRepeats > 10) throw new Error('Latency samples must be 0–100 and repeats 1–10');
  const cohereTpm = Number(options['cohere-tpm'] ?? 80_000);
  if (!Number.isSafeInteger(cohereTpm) || cohereTpm < 1) throw new Error('--cohere-tpm must be a positive integer');
  const pace = tokenPacer(cohereTpm);
  const encoding = getEncoding('cl100k_base');
  // Reserve a conservative estimate because provider tokenizers differ. One
  // sliding window covers both Cohere models; cached batches need no reservation.
  const beforeRequest = async (model, texts) => {
    if (model.provider === 'cohere') await pace(Math.ceil(texts.reduce((sum, text) => sum + encoding.encode(text).length, 0) * 1.5));
  };
  const index = JSON.parse(await readFile(path.join(site, 'ai/chunks.json'), 'utf8'));
  const querySet = JSON.parse(await readFile(options.queries ?? path.join(here, '../fixtures/retrieval-queries.json'), 'utf8'));
  const queries = querySet.queries;
  if (index.schemaVersion !== 1 || !Array.isArray(index.chunks) || !index.chunks.length || !Array.isArray(queries) || !queries.some(query => query.kind !== 'none')) throw new Error('Expected a nonempty passage index and labeled query set');
  const ids = new Set(index.chunks.map(chunk => chunk.docId));
  for (const query of queries) {
    const groups = query.expectGroups ?? (Array.isArray(query.expect) ? [query.expect] : undefined);
    if (typeof query.query !== 'string' || !query.query.trim() || !Array.isArray(groups) || (query.kind !== 'none' && (!groups.length || groups.some(group => !Array.isArray(group) || !group.length || !group.some(id => ids.has(id)))))) throw new Error(`Invalid query or missing expected page: ${query.query}`);
  }
  const out = path.resolve(options.out);
  const cache = path.join(out, 'cache');
  await mkdir(cache, { recursive: true });
  const passageTexts = index.chunks.map(embeddingInput);
  const uniquePassages = [...new Set(passageTexts)];
  const queryTexts = queries.map(query => query.query);
  const uniqueQueries = [...new Set(queryTexts)];
  const report = { schemaVersion: 1, createdAt: new Date().toISOString(), dimension, corpusDigest: hash(index), queryDigest: hash(querySet), passages: index.chunks.length, pages: ids.size, queries: queries.length, answerable: queries.filter(query => query.kind !== 'none').length, models: [], runs: [], comparisons: [] };
  const embeddings = new Map();
  const checkpoint = async () => {
    await writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
    await writeFile(path.join(out, 'report.md'), reportMarkdown(report));
  };
  report.runs.push({ documentModel: 'none', queryModel: 'none', scores: { lexical: scoreQueries(index, queries, undefined, undefined, 'lexical') } });
  await checkpoint();
  for (const model of models) {
    process.stdout.write(`Benchmarking ${model.name}: ${uniquePassages.length} unique passages, ${uniqueQueries.length} unique queries\n`);
    try {
      // Verify access with a single query before paying to embed the corpus.
      await cachedEmbeddings(model, [uniqueQueries[0]], 'query', dimension, cache, beforeRequest);
      const documents = await cachedEmbeddings(model, uniquePassages, 'document', dimension, cache, beforeRequest);
      const queryResults = await cachedEmbeddings(model, uniqueQueries, 'query', dimension, cache, beforeRequest);
      const docMap = new Map(uniquePassages.map((text, at) => [text, documents.vectors[at]]));
      const queryMap = new Map(uniqueQueries.map((text, at) => [text, queryResults.vectors[at]]));
      const latency = [];
      // Spread samples through the fixture instead of measuring only its exact-identifier prefix.
      for (let repeat = 0; repeat < latencyRepeats; repeat++) for (let at = 0; at < Math.min(latencySamples, uniqueQueries.length); at++) {
        const query = uniqueQueries[Math.floor(at * uniqueQueries.length / Math.min(latencySamples, uniqueQueries.length))];
        await beforeRequest(model, [query]);
        const started = performance.now();
        await requestEmbeddings(model, [query], 'query', dimension, { retryDelayMs: model.provider === 'cohere' ? 20_000 : 1000 });
        latency.push({ query, repeat, ms: performance.now() - started });
      }
      const times = latency.map(sample => sample.ms).sort((a, b) => a - b);
      const percentile = fraction => times.length ? times[Math.min(times.length - 1, Math.ceil(times.length * fraction) - 1)] : null;
      embeddings.set(model.name, { model, documents: passageTexts.map(text => docMap.get(text)), queries: queryTexts.map(text => queryMap.get(text)) });
      report.models.push({ name: model.name, provider: model.provider, status: 'ok', documents: documents.stats, queries: queryResults.stats, latency: { samples: latency, p50: percentile(0.5), p95: percentile(0.95) } });
    } catch (error) {
      const message = providerError(error, [process.env[model.keyEnv]]);
      report.models.push({ name: model.name, provider: model.provider, status: 'error', error: message });
      process.stderr.write(`${model.name}: ${message}\n`);
    }
    await checkpoint();
  }
  const pairs = [...models.map(model => [model.name, model.name]), ['voyage-4-large', 'voyage-4-lite'], ['embed-v5.0-pro', 'embed-v5.0-fast']];
  for (const [documentModel, queryModel] of pairs) {
    const documents = embeddings.get(documentModel);
    const query = embeddings.get(queryModel);
    if (!documents || !query) continue;
    if (documents.model.space !== query.model.space) throw new Error('Cannot compare vectors from incompatible embedding spaces');
    const stored = { meta: { schemaVersion: 1, provider: documents.model.provider, model: documentModel, space: documents.model.space, dimension, sourceDigest: index.sourceDigest, ids: index.chunks.map(chunk => chunk.id), digests: index.chunks.map(chunk => chunk.digest) }, vectors: documents.documents };
    report.runs.push({ documentModel, queryModel, scores: Object.fromEntries(['vector', 'hybrid'].map(mode => [mode, scoreQueries(index, queries, stored, query.queries, mode)])) });
  }
  const baseline = report.runs.find(run => run.documentModel === 'voyage-4-large' && run.queryModel === 'voyage-4-lite');
  if (baseline) for (const run of report.runs.filter(run => run.documentModel !== 'none' && run !== baseline)) for (const mode of ['vector', 'hybrid']) report.comparisons.push({ candidate: `${run.documentModel} / ${run.queryModel}`, mode, ...pairedHitRate(baseline.scores[mode], run.scores[mode]) });
  await checkpoint();
  process.stdout.write(`Saved ${path.join(out, 'report.md')}\n`);
  if (report.models.some(model => model.status !== 'ok')) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main(process.argv.slice(2));
