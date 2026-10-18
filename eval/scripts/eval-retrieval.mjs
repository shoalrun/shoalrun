// Scores retrieval against the labeled query set. Page-level: a result list collapses to distinct pages in rank order, and a
// query succeeds at k when any expected page is among the first k. Usage:
//   node scripts/eval-retrieval.mjs <site-directory> [--queries FILE] [--config FILE] [--query-model MODEL] [--base-url URL] [--key-env NAME] [--verbose]
// Vector and hybrid modes run when the site has ai/embeddings.json and the provider's key is set. Queries use the provider that
// embedded the passages. The query model comes from --query-model, then retrieval.embeddings.queryModel in --config, then the passage model. It can
// differ only inside one embedding space: Voyage 4 models share one, so voyage-4-lite works for voyage-4-large passages, while an
// OpenAI-style model must embed its own queries.
// --jev adds a hybrid+jev mode that reranks the top --jev-top (default 24) hybrid results with Jev. It is opt-in because it calls a
// paid service: --jev-max-calls (default 60) caps live calls across the whole run, and --jev-cache DIR (default in the OS temp
// directory) makes an unchanged rerun free. It needs JEV_API_KEY.
import { readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createProvider, readEmbeddings } from '../../framework/dist/embeddings.js';
import { loadConfig } from '../../framework/dist/config.js';
import { queryProviderConfig, validateRetrieval } from '../../framework/dist/retrieval-config.js';
import { Retriever } from '../../framework/dist/retrieval.js';
import { jevEndpoint, jevRerank } from '../../framework/dist/jev.js';
import { validateChat } from '../../framework/dist/chat-config.js';
import { validateReaderFilters } from '../../framework/dist/reader-filters.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = name => args.includes(name) ? args[args.indexOf(name) + 1] : undefined;
const directory = args.find((arg, at) => !arg.startsWith('--') && !['--queries', '--config', '--query-model', '--base-url', '--key-env', '--jev-cache', '--jev-max-calls', '--jev-top', '--min-r3'].includes(args[at - 1]));
if (!directory) { process.stderr.write('Usage: node scripts/eval-retrieval.mjs <site-directory> [--queries FILE] [--config FILE] [--query-model MODEL] [--base-url URL] [--key-env NAME] [--min-r3 0.70] [--jev [--jev-top N] [--jev-max-calls N] [--jev-cache DIR]] [--verbose]\n'); process.exit(2); }
const queryFile = flag('--queries') ?? path.join(here, '..', 'fixtures', 'retrieval-queries.json');
const verbose = args.includes('--verbose');
const ks = [1, 3, 5, 10];

const { queries } = JSON.parse(await readFile(queryFile, 'utf8'));
const embeddings = await readEmbeddings(directory);
const retriever = new Retriever(JSON.parse(await readFile(path.join(directory, 'ai', 'chunks.json'), 'utf8')), embeddings);

const jev = { calls: 0, cacheHits: 0, inputTokens: 0, liveMs: 0, best: new Map() };
const scope = item => ({ limit: 60, ...(item.variant ? { variant: item.variant } : {}), ...(item.readerSelection ? { readerSelection: item.readerSelection } : {}) });
const modes = { lexical: async item => retriever.lexical(item.query, scope(item)) };
let embedNote = '';
if (embeddings) {
  try {
    const { meta } = embeddings;
    const retrieval = flag('--config') ? validateRetrieval((await loadConfig(flag('--config'))).value.retrieval) : undefined;
    const settings = queryProviderConfig(retrieval, meta, { model: flag('--query-model'), baseUrl: flag('--base-url'), keyEnv: flag('--key-env') });
    const queryModel = settings.model;
    const provider = createProvider(settings);
    if (provider.space !== (meta.space ?? meta.model) || (meta.backend && provider.backend !== meta.backend)) throw new Error(`${queryModel} is not in the embedding space or backend of ${meta.model}; queries must use a compatible model and backend`);
    const coverage = retriever.coverage();
    if (coverage.stale) process.stderr.write(`Warning: ${coverage.stale} passages changed since they were embedded; run shoalrun index --embed\n`);
    const started = performance.now();
    const vectors = await provider.embed(queries.map(query => query.query), 'query');
    const byQuery = new Map(queries.map((query, at) => [query.query, vectors[at]]));
    embedNote = `passages: ${meta.model} @ ${meta.dimension}; queries: ${queryModel}; query embedding ${((performance.now() - started) / queries.length).toFixed(0)} ms/query (batched)`;
    modes.vector = async item => retriever.vector(byQuery.get(item.query), scope(item));
    modes.hybrid = async item => retriever.hybrid(item.query, byQuery.get(item.query), scope(item));
    if (args.includes('--jev')) {
      const budget = Number(flag('--jev-max-calls') ?? 60);
      const top = Number(flag('--jev-top') ?? 24);
      const cacheDir = flag('--jev-cache') ?? path.join(os.tmpdir(), 'shoalrun-jev-cache');
      // With --config, the scorer comes from chat.rerank (endpoint, model, keyEnv, stateFormat), the same as the chat uses. Without it, the JEV_* variables.
      const settings = flag('--config') ? (await loadConfig(flag('--config'))).value : undefined;
      const scoring = settings ? validateChat(settings.chat, validateReaderFilters(settings.readerFilters))?.rerank : undefined;
      const scorer = { ...(scoring?.endpoint ? { endpoint: jevEndpoint(scoring.endpoint) } : {}), ...(scoring?.model ? { model: scoring.model } : {}), ...(scoring?.keyEnv ? { keyEnv: scoring.keyEnv } : {}), ...(scoring?.stateFormat ? { stateFormat: scoring.stateFormat } : {}) };
      modes['hybrid+jev'] = async item => {
        const remaining = budget - jev.calls;
        if (remaining < 1) throw new Error(`Jev call budget of ${budget} exhausted; raise --jev-max-calls`);
        const result = await jevRerank(item.query, retriever.hybrid(item.query, byQuery.get(item.query), scope(item)), { ...scorer, top, maxCalls: remaining, cacheDir, concurrency: 1 });
        jev.calls += result.report.calls;
        jev.cacheHits += result.report.cacheHits;
        jev.inputTokens += result.report.inputTokens;
        jev.liveMs += result.report.calls ? result.report.elapsedMs : 0;
        jev.best.set(item.query, result.best);
        return result.hits;
      };
    }
  } catch (error) {
    process.stderr.write(`Skipping vector and hybrid modes: ${error.message}\n`);
  }
}
if (embedNote) process.stdout.write(`\n${embedNote}\n`);

function pages(hits) {
  const seen = [];
  for (const hit of hits) if (!seen.includes(hit.chunk.docId)) seen.push(hit.chunk.docId);
  return seen;
}

const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

for (const [name, search] of Object.entries(modes)) {
  const rows = [];
  const started = performance.now();
  for (const item of queries.filter(query => query.kind !== 'none')) {
    const hits = await search(item);
    const ranked = pages(hits);
    const groups = item.expectGroups ?? [item.expect];
    const groupRanks = groups.map(group => ranked.findIndex(id => group.includes(id)) + 1);
    const rank = groupRanks.every(Boolean) ? Math.max(...groupRanks) : 0;
    rows.push({ ...item, rank, top: ranked.slice(0, 3), best: name === 'hybrid+jev' ? jev.best.get(item.query) : hits[0]?.score ?? 0 });
  }
  const ms = (performance.now() - started) / rows.length;
  const line = subset => ks.map(k => `r@${k} ${(subset.filter(row => row.rank && row.rank <= k).length / subset.length).toFixed(2)}`).join('  ') + `  mrr ${(subset.reduce((sum, row) => sum + (row.rank ? 1 / row.rank : 0), 0) / subset.length).toFixed(2)}`;
  process.stdout.write(`\n${name} (${rows.length} answerable queries, ${ms.toFixed(1)} ms/query retrieval)\n  all          ${line(rows)}\n`);
  if (name === 'lexical' && args.includes('--min-r3')) {
    const minimum = Number(flag('--min-r3'));
    if (!Number.isFinite(minimum) || minimum < 0 || minimum > 1) throw new Error('--min-r3 must be a number from 0 to 1');
    const recall = rows.filter(row => row.rank && row.rank <= 3).length / rows.length;
    if (recall < minimum) { process.stderr.write(`Lexical retrieval r@3 ${recall.toFixed(3)} is below required ${minimum.toFixed(3)}\n`); process.exitCode = 1; }
  }
  for (const kind of [...new Set(rows.map(row => row.kind))]) process.stdout.write(`  ${kind.padEnd(12)} ${line(rows.filter(row => row.kind === kind))}\n`);
  if (name === 'vector' || name === 'hybrid+jev') {
    // A score that is comparable across queries is a candidate signal for "the docs don't say". Cosine similarity and Jev's 0-to-1
    // score both qualify. The best score on each no-answer query is compared with the answerable queries.
    const label = name === 'vector' ? 'cosine' : 'Jev';
    const none = [];
    for (const item of queries.filter(query => query.kind === 'none')) {
      const hits = await search(item);
      none.push(name === 'hybrid+jev' ? jev.best.get(item.query) : hits[0]?.score ?? 0);
    }
    const answerable = rows.map(row => row.best);
    process.stdout.write(`  best ${label.padEnd(7)} answerable median ${median(answerable).toFixed(2)} (min ${Math.min(...answerable).toFixed(2)}); no-answer ${none.map(score => score.toFixed(2)).join(', ')} (max ${Math.max(...none).toFixed(2)})\n`);
    if (name === 'hybrid+jev') for (const t of [0.3, 0.5, 0.7]) process.stdout.write(`  gate at ${t}: keeps ${answerable.filter(score => score >= t).length}/${answerable.length} answerable, lets through ${none.filter(score => score >= t).length}/${none.length} no-answer\n`);
  }
  if (name === 'hybrid+jev') process.stdout.write(`  jev usage    ${jev.calls} live calls, ${jev.cacheHits} cached pairs, ${jev.calls ? Math.round(jev.liveMs / jev.calls) : 0} ms per live call, ${jev.inputTokens} input tokens\n`);
  const misses = rows.filter(row => !row.rank || row.rank > 3 || verbose);
  if (misses.length) process.stdout.write(`  ${verbose ? 'results' : 'outside top 3'}:\n`);
  for (const row of misses) process.stdout.write(`    [${row.kind}] ${row.query}  -> rank ${row.rank || 'none'}; top: ${row.top.join(', ')}; expected: ${(row.expectGroups ?? [row.expect]).map(group => group.join('|')).join(' + ')}\n`);
}
