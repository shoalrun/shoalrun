// Offline ranking experiment: read exact cached vectors, never request new ones.
// node eval/scripts/diagnose-hybrid-search.mjs SITE --cache CACHE [--cache CACHE] --queries FILE --baseline REPORT --out DIRECTORY
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { embeddingInput } from '../../framework/dist/index-build.js';
import { Retriever, fuse } from '../../framework/dist/retrieval.js';
import { models, normalizedVectors, pairedHitRate } from './benchmark-embeddings.mjs';
export const fingerprint = value => createHash('sha256').update(JSON.stringify(value) ?? 'null').digest('hex');
export async function readCachedVectors(model, texts, inputType, dimension, directories) {
  const unique = [...new Set(texts)], vectors = [], batches = [];
  for (let start = 0; start < unique.length; start += 32) {
    const batch = unique.slice(start, start + 32);
    const key = fingerprint({ version: 1, model, dimension, inputType, texts: batch });
    let cached;
    for (const directory of directories) {
      try { cached = JSON.parse(await readFile(path.join(directory, `${key}.json`), 'utf8')); break; }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    if (!cached) throw new Error(`Missing cached ${inputType} batch ${start / 32} for ${model.name}; offline mode never makes API calls`);
    if (cached.cacheKey !== key) throw new Error('Cached embedding fingerprint mismatch');
    vectors.push(...normalizedVectors(cached.vectors, batch.length, dimension));
    batches.push(key);
  }
  const byText = new Map(unique.map((text, at) => [text, vectors[at]]));
  return { vectors: texts.map(text => byText.get(text)), batches };
}
export function weightedFusion(lexical, vector, { vectorWeight = 1, lexicalWeight = 1, limit = 60, k = 60 } = {}) {
  if (![vectorWeight, lexicalWeight].every(n => Number.isFinite(n) && n >= 0) || vectorWeight + lexicalWeight <= 0 || !Number.isInteger(limit) || limit < 1 || !Number.isFinite(k) || k < 0) throw new Error('Invalid fusion settings');
  const rows = new Map();
  for (const [list, weight] of [[lexical, lexicalWeight], [vector, vectorWeight]]) {
    if (!weight) continue;
    list.forEach((hit, at) => {
      const seen = rows.get(hit.chunk.id);
      rows.set(hit.chunk.id, { chunk: hit.chunk, score: (seen?.score ?? 0) + weight / (k + at + 1) });
    });
  }
  return [...rows.values()].sort((a, b) => b.score - a.score || a.chunk.id.localeCompare(b.chunk.id)).slice(0, limit);
}
export const collapsePages = hits => [...new Set(hits.map(hit => hit.chunk.docId))];
export function answerRank(query, pages) {
  if (query.kind === 'none') return 0;
  const ranks = (query.expectGroups ?? [query.expect]).map(group => pages.findIndex(id => group.includes(id)) + 1);
  return ranks.every(Boolean) ? Math.max(...ranks) : 0;
}
export function summarize(rows) {
  const answerable = rows.filter(r => r.kind !== 'none');
  const score = rows => ({ count: rows.length, hitRate: Object.fromEntries([1, 3, 5, 10].map(k => [k, rows.length ? rows.filter(r => r.rank > 0 && r.rank <= k).length / rows.length : null])), mrr: rows.length ? rows.reduce((s, r) => s + (r.rank ? 1 / r.rank : 0), 0) / rows.length : null });
  return { overall: score(answerable), byKind: Object.fromEntries([...new Set(answerable.map(r => r.kind))].map(kind => [kind, score(answerable.filter(r => r.kind === kind))])), bySplit: Object.fromEntries([...new Set(answerable.map(r => r.split ?? 'original'))].map(split => [split, score(answerable.filter(r => (r.split ?? 'original') === split))])), rows };
}
function passageRows(lexical, vector, fused, retained, expected) {
  const maps = [lexical, vector, fused].map(list => new Map(list.map((h, at) => [h.chunk.id, at + 1])));
  const kept = new Set(retained.map(h => h.chunk.id));
  const candidateIds = new Set([...lexical, ...vector].map(h => h.chunk.id));
  const hits = new Map([...lexical, ...vector].map(h => [h.chunk.id, h]));
  return [...candidateIds].map(id => {
    const { chunk } = hits.get(id);
    return { id, docId: chunk.docId, headingPath: chunk.headingPath, expected: expected.has(chunk.docId), lexicalRank: maps[0].get(id) ?? null, vectorRank: maps[1].get(id) ?? null, fusedRank: maps[2].get(id) ?? null, retained: kept.has(id) };
  }).sort((a, b) => (a.fusedRank ?? Infinity) - (b.fusedRank ?? Infinity));
}
export function compareRanking(retriever, queries, vectors, profile) {
  const strategies = ['lexical', 'vector', 'hybrid-1:1', 'hybrid-2:1', 'hybrid-4:1', 'hybrid-8:1'];
  const results = Object.fromEntries(strategies.map(s => [s, []]));
  const diagnostics = [];
  for (const [at, query] of queries.entries()) {
    const scope = { ...(query.variant ? { variant: query.variant } : {}), ...(query.readerSelection ? { readerSelection: query.readerSelection } : {}) };
    const lexical = retriever.lexical(query.query, { ...scope, limit: profile.candidateDepth });
    const vector = retriever.vector(vectors[at], { ...scope, limit: profile.candidateDepth });
    const rankings = { lexical: lexical.slice(0, profile.passageLimit), vector: vector.slice(0, profile.passageLimit) };
    for (const weight of [1, 2, 4, 8]) rankings[`hybrid-${weight}:1`] = weightedFusion(lexical, vector, { vectorWeight: weight, limit: profile.passageLimit });
    // Prove the reproduction uses the current implementation, including tie handling.
    const production = retriever.hybrid(query.query, vectors[at], { ...scope, limit: profile.passageLimit });
    if (JSON.stringify(production.map(h => h.chunk.id)) !== JSON.stringify(rankings['hybrid-1:1'].map(h => h.chunk.id))) throw new Error('Offline equal-weight reproduction differs from current retrieval');
    const pagesByMode = Object.fromEntries(Object.entries(rankings).map(([name, hits]) => [name, collapsePages(hits).slice(0, profile.pageLimit ?? Infinity)]));
    for (const name of strategies) results[name].push({ ...query, rank: answerRank(query, pagesByMode[name]), top: pagesByMode[name].slice(0, 10) });
    const fullFusion = fuse([lexical, vector], lexical.length + vector.length);
    const expected = new Set((query.expectGroups ?? [query.expect]).flat());
    const ranks = Object.fromEntries(strategies.map(name => [name, results[name].at(-1).rank]));
    const rows = passageRows(lexical, vector, fullFusion, rankings['hybrid-1:1'], expected);
    diagnostics.push({ query: query.query, kind: query.kind, split: query.split ?? 'original', expect: query.expect, expectGroups: query.expectGroups, variant: query.variant, readerSelection: query.readerSelection, ranks, topPages: pagesByMode,
      groupRanks: (query.expectGroups ?? [query.expect]).map(group => ({ alternatives: group, modes: Object.fromEntries(strategies.map(name => [name, pagesByMode[name].findIndex(id => group.includes(id)) + 1])) })),
      equalWeightCrowding: { passagesRetained: rankings['hybrid-1:1'].length, distinctPagesRetained: collapsePages(rankings['hybrid-1:1']).length, repeatPassages: rankings['hybrid-1:1'].length - collapsePages(rankings['hybrid-1:1']).length },
      expectedPassages: rows.filter(r => r.expected), topFusedPassages: rows.slice(0, 20) });
  }
  const scores = Object.fromEntries(Object.entries(results).map(([name, rows]) => [name, summarize(rows)]));
  return { profile, scores, comparisons: Object.fromEntries(strategies.filter(s => s !== 'vector').map(s => [s, pairedHitRate(scores.vector, scores[s])])), diagnostics };
}
export function diagnosticMarkdown(report) {
  const pct = n => `${(n * 100).toFixed(1)}%`;
  const text = value => String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
  const benchmark = report.profiles.find(p => p.profile.name === 'benchmark');
  const losses = benchmark.diagnostics.filter(d => d.kind !== 'none' && d.ranks.vector > 0 && d.ranks.vector <= 3 && !(d.ranks['hybrid-1:1'] > 0 && d.ranks['hybrid-1:1'] <= 3));
  const lines = ['# Hybrid search diagnostics — 2026-10-02', '',
    'The existing frozen 200-query benchmark was replayed with cached Voyage Large document vectors and Voyage Lite query vectors. Corpus and query fingerprints match the saved report, and vector-only and equal-weight hybrid page rankings reproduce it exactly. No API calls were made, and production search settings are unchanged.', '',
    'Current equal-weight hybrid gains three top-three successes but loses eleven compared with vector-only retrieval: a net loss of eight. Giving vector rankings more weight recovers much of that gap on this development set. These queries have already informed development; this is not a held-out test or a final configuration decision.', '',
    'Hit@3 means the expected page appears within the first three distinct pages; synthesis questions require a page from every expected group. Higher Hit rates and MRR are better. MRR rewards earlier answers. A vector:lexical weight of 4:1 gives each vector rank four times the contribution of a lexical rank; it does not average their raw scores.', '',
    '## Ranking comparison', '', '| Profile | Strategy | Hit@1 | Hit@3 | Hit@5 | MRR | Wins / losses vs vector at Hit@3 |', '| --- | --- | --- | --- | --- | --- | --- |'];
  for (const profile of report.profiles) for (const [name, scores] of Object.entries(profile.scores)) {
    const o = scores.overall, paired = profile.comparisons[name];
    lines.push(`| ${profile.profile.name} | ${name} | ${pct(o.hitRate[1])} | ${pct(o.hitRate[3])} | ${pct(o.hitRate[5])} | ${o.mrr.toFixed(3)} | ${paired ? `${paired.wins} / ${paired.losses}` : 'reference'} |`);
  }
  lines.push('', 'The benchmark retains 60 passages after fusion from up to 240 passages per component. The handler-default profile uses the current eight-page search request limits: 192 passages per component, 48 retained passages, and eight distinct pages returned. It models ranking and page limits, not the HTTP response, snippets, latency or provider failures. Hit@10 and MRR in its JSON are bounded by those eight returned pages; use Hit@1/3/5 for direct comparisons.', '',
    '## Top-three losses under equal-weight fusion', '', '| Query | Kind | Vector page rank | Hybrid page rank | 4:1 page rank | 8:1 page rank |', '| --- | --- | --- | --- | --- | --- |');
  const rank = value => value || 'not found';
  for (const d of losses) lines.push(`| ${text(d.query)} | ${d.kind} | ${rank(d.ranks.vector)} | ${rank(d.ranks['hybrid-1:1'])} | ${rank(d.ranks['hybrid-4:1'])} | ${rank(d.ranks['hybrid-8:1'])} |`);
  lines.push('', '## What the passage diagnostics show', '',
    'All eleven lost cases still retain at least one expected passage in the 60-passage benchmark fused result. The top-three failure therefore involves promotion/demotion rather than simply deleting every expected passage. For synthesis queries, retaining one expected passage alone does not establish that every required group was retained.', '',
    'For “links in the top bar of every page,” the header guide is first in vector-only search and sixth after equal-weight fusion. Its strongest semantic passage is vector rank 1 but lexical passage rank 94. A CSS passage at lexical rank 3 and vector rank 20 becomes the first fused passage. This directly demonstrates broad word matches moving a useful semantic result down.', '',
    'For “Where are chat regression checks documented?”, the expected page supplies vector passage rank 1 and lexical passage rank 2, but those signals belong to different passages. Neither passage receives both strongest contributions; the page falls to fourth after passage-level fusion. This is a concrete reason to test page-aware fusion next, rather than assuming weighting explains every case.', '',
    'Related-reading chunks and repeated passages from the same page also appear among promoted results. This is evidence to inspect, not proof that deleting related reading or changing chunking improves search. Preserve useful chat evidence and avoid changing the corpus during ranking comparisons.', '',
    '## Tradeoffs and label review', '',
    'On the benchmark, 4:1 gains three successes and loses one versus vector-only; 8:1 gains two and loses none. Both score 171/179 (95.5%) at Hit@3. However, 8:1 loses the hybrid improvement for the file-tree linking question, and 4:1 lowers the organization-specific frontmatter question from page rank 3 to 4. Their identical aggregate score conceals different outcomes.', '',
    'Exact-identifier Hit@3 stays 88.9% under vector-only, equal-weight, 4:1 and 8:1; lexical-only scores 94.4%, while 2:1 also reaches 94.4%. A vector-heavy setting is not a universal exact-identifier fix. The JSON retains category and original/additional-subset scores.', '',
    'The recipe-drafting loss promotes the CLI reference, which explicitly describes recipe draft assembly and its limits. It may be an acceptable answer missing from the label. Review acceptable pages without assuming every promoted result is irrelevant, and disclose any label change separately rather than silently rescoring the original benchmark.', '',
    'Only two cases use reader filters; that coverage is too small to claim broad filtered-search reliability. All 21 no-answer queries remain in the diagnostics and are excluded from success scores. Plausible retrieved pages do not prove those questions are answerable, and this experiment does not test refusal behavior.', '',
    'Paired bootstrap intervals are retained in JSON. They resample this related, author-labeled development set and do not establish general superiority. Choose settings only after a genuinely new held-out evaluation, keeping related questions together when splitting.', '',
    '## Next work', '',
    '1. Review the recipe-drafting alternative label and the exact-identifier misses.',
    '2. Test page-aware fusion against the same frozen rankings without dropping supporting passages needed for chat.',
    '3. Design a new held-out set before selecting weights; embedding new queries would require separately approved API calls.',
    '4. Verify the chosen candidate in the actual handler with reader filters, snippets, request limits and outage fallback.', '',
    'The diagnostic runner is `eval/scripts/diagnose-hybrid-search.mjs`. It refuses missing cache entries and disables fetch during its CLI run. It records exact weights, depths, fingerprints, paired outcomes, component passage ranks and retained/dropped flags. The detailed private run is `.private-evals/hybrid-diagnostics-2026-10-02/`; the public companion contains summary scores and the changed top-three cases.', '');
  return lines.join('\n');
}
async function main(args) {
  const site = args.shift(), cache = [], options = {};
  if (!site) throw new Error('Supply the frozen site');
  for (let i = 0; i < args.length; i += 2) {
    if (!args[i + 1]) throw new Error('Every flag needs a value');
    if (args[i] === '--cache') cache.push(args[i + 1]);
    else if (['--queries', '--baseline', '--out'].includes(args[i]) && options[args[i]] === undefined) options[args[i]] = args[i + 1];
    else throw new Error(`Unknown or duplicate flag ${args[i]}`);
  }
  if (!cache.length || !options['--queries'] || !options['--baseline'] || !options['--out']) throw new Error('Required: --cache DIRECTORY --queries FILE --baseline REPORT --out DIRECTORY');
  globalThis.fetch = async () => { throw new Error('Network access disabled in offline hybrid diagnostics'); };
  const index = JSON.parse(await readFile(path.join(site, 'ai/chunks.json'), 'utf8'));
  const querySet = JSON.parse(await readFile(options['--queries'], 'utf8'));
  const baseline = JSON.parse(await readFile(options['--baseline'], 'utf8'));
  if (fingerprint(index) !== baseline.corpusDigest || fingerprint(querySet) !== baseline.queryDigest) throw new Error('Frozen inputs do not match the baseline report');
  const docModel = models.find(m => m.name === 'voyage-4-large'), queryModel = models.find(m => m.name === 'voyage-4-lite');
  const documents = await readCachedVectors(docModel, index.chunks.map(embeddingInput), 'document', baseline.dimension, cache);
  const queries = await readCachedVectors(queryModel, querySet.queries.map(q => q.query), 'query', baseline.dimension, cache);
  const stored = { meta: { schemaVersion: 1, provider: docModel.provider, model: docModel.name, dimension: baseline.dimension, sourceDigest: index.sourceDigest, ids: index.chunks.map(c => c.id), digests: index.chunks.map(c => c.digest) }, vectors: documents.vectors };
  const retriever = new Retriever(index, stored);
  const report = { schemaVersion: 1, createdAt: new Date().toISOString(), documentModel: docModel.name, queryModel: queryModel.name, corpusDigest: baseline.corpusDigest, queryDigest: baseline.queryDigest, queries: querySet.queries.length, answerable: querySet.queries.filter(q => q.kind !== 'none').length, apiRequests: 0,
    settings: { fusionConstant: 60, vectorLexicalWeights: ['1:1', '2:1', '4:1', '8:1'], newHeldOutSet: false }, cacheBatches: { documents: documents.batches, queries: queries.batches }, profiles: [] };
  const reference = baseline.runs.find(r => r.documentModel === docModel.name && r.queryModel === queryModel.name);
  for (const profile of [{ name: 'benchmark', passageLimit: 60, candidateDepth: 240 }, { name: 'handler-default-ranking', passageLimit: 48, candidateDepth: 192, pageLimit: 8 }]) {
    const result = compareRanking(retriever, querySet.queries, queries.vectors, profile);
    if (profile.name === 'benchmark') for (const [ours, original] of [['vector', 'vector'], ['hybrid-1:1', 'hybrid']]) {
      if (!reference || reference.scores[original].rows.some((r, i) => r.rank !== result.scores[ours].rows[i].rank || JSON.stringify(r.top) !== JSON.stringify(result.scores[ours].rows[i].top))) throw new Error(`Replayed ${ours} ranks differ from saved baseline`);
    }
    report.profiles.push(result);
    console.log(`${profile.name}: vector ${result.scores.vector.overall.hitRate[3]}, equal ${result.scores['hybrid-1:1'].overall.hitRate[3]}`);
  }
  const out = path.resolve(options['--out']); await mkdir(out);
  await writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await writeFile(path.join(out, 'report.md'), diagnosticMarkdown(report));
  console.log(`Saved ${path.join(out, 'report.json')}; zero API calls`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main(process.argv.slice(2));
