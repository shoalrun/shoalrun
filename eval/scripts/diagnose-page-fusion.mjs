// Offline page-aware experiments. No production retrieval code or API calls.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Retriever } from '../../framework/dist/retrieval.js';
import { embeddingInput } from '../../framework/dist/index-build.js';
import { models, pairedHitRate } from './benchmark-embeddings.mjs';
import { readCachedVectors, fingerprint, weightedFusion, answerRank, summarize } from './diagnose-hybrid-search.mjs';

export function pageFusion(lexical, vector, { vectorWeight = 1, lexicalWeight = 1, k = 60, rankUnit = 'passage', limit = 60 } = {}) {
  if (!['passage', 'page'].includes(rankUnit) || ![vectorWeight, lexicalWeight, k].every(v => Number.isFinite(v) && v >= 0) || vectorWeight + lexicalWeight === 0 || !Number.isInteger(limit) || limit < 1) throw new Error('Invalid page fusion settings');
  const pages = new Map();
  for (const [list, weight, field] of [[lexical, lexicalWeight, 'lexicalRank'], [vector, vectorWeight, 'vectorRank']]) {
    const seen = new Set();
    let pageRank = 0;
    list.forEach((hit, at) => {
      if (!weight) return;
      const key = `${hit.chunk.variant}:${hit.chunk.docId}`;
      let page = pages.get(key);
      if (!page) { page = { docId: hit.chunk.docId, variant: hit.chunk.variant, score: 0, lexicalRank: null, vectorRank: null, passages: new Map() }; pages.set(key, page); }
      page.passages.set(hit.chunk.id, hit);
      if (seen.has(key)) return;
      seen.add(key); pageRank++;
      page[field] = rankUnit === 'page' ? pageRank : at + 1;
      page.score += weight / (k + page[field]);
    });
  }
  const passageScores = new Map(weightedFusion(lexical, vector, { vectorWeight, lexicalWeight, k, limit: lexical.length + vector.length || 1 }).map(hit => [hit.chunk.id, hit.score]));
  return [...pages.values()].sort((a, b) => b.score - a.score || a.variant.localeCompare(b.variant) || a.docId.localeCompare(b.docId)).slice(0, limit).map(page => ({ ...page,
    // Retain all already-retrieved supporting passages. This is an experimental
    // page result; never pass it into production chat as a single synthetic Hit.
    passages: [...page.passages.values()].sort((a, b) => (passageScores.get(b.chunk.id) ?? 0) - (passageScores.get(a.chunk.id) ?? 0) || a.chunk.id.localeCompare(b.chunk.id))
  }));
}

async function main(args) {
  const site = args.shift(), caches = [], options = {};
  for (let at = 0; at < args.length; at += 2) {
    if (!args[at + 1]) throw new Error('Flags need values');
    if (args[at] === '--cache') caches.push(args[at + 1]);
    else if (['--queries', '--baseline', '--passage-report', '--out'].includes(args[at]) && !options[args[at]]) options[args[at]] = args[at + 1];
    else throw new Error('Unknown or duplicate flag');
  }
  if (!site || !caches.length || ['--queries', '--baseline', '--passage-report', '--out'].some(f => !options[f])) throw new Error('Usage: SITE --cache DIRECTORY --queries FILE --baseline REPORT --passage-report REPORT --out DIRECTORY');
  globalThis.fetch = async () => { throw new Error('Network disabled in offline page fusion'); };
  const index = JSON.parse(await readFile(path.join(site, 'ai/chunks.json'), 'utf8'));
  const querySet = JSON.parse(await readFile(options['--queries'], 'utf8'));
  const baseline = JSON.parse(await readFile(options['--baseline'], 'utf8'));
  const passageReport = JSON.parse(await readFile(options['--passage-report'], 'utf8'));
  if ([baseline, passageReport].some(r => r.corpusDigest !== fingerprint(index) || r.queryDigest !== fingerprint(querySet))) throw new Error('Inputs differ from saved reports');
  if (passageReport.documentModel !== 'voyage-4-large' || passageReport.queryModel !== 'voyage-4-lite') throw new Error('Unexpected reference model pairing');
  const documents = await readCachedVectors(models.find(m => m.name === 'voyage-4-large'), index.chunks.map(embeddingInput), 'document', baseline.dimension, caches);
  const queries = await readCachedVectors(models.find(m => m.name === 'voyage-4-lite'), querySet.queries.map(q => q.query), 'query', baseline.dimension, caches);
  const retriever = new Retriever(index, { meta: { ids: index.chunks.map(c => c.id), digests: index.chunks.map(c => c.digest) }, vectors: documents.vectors });
  const report = { schemaVersion: 1, createdAt: new Date().toISOString(), documentModel: 'voyage-4-large', queryModel: 'voyage-4-lite', corpusDigest: baseline.corpusDigest, queryDigest: baseline.queryDigest, apiRequests: 0, settings: { k: 60, rankUnits: ['passage', 'page'], vectorLexicalWeights: ['1:1', '4:1', '8:1'], preservesSupportingPassages: true, changesProduction: false, heldOut: false }, profiles: [] };
  for (const previous of passageReport.profiles) {
    const profile = previous.profile;
    const rows = {}, diagnostics = [];
    for (const rankUnit of ['passage', 'page']) for (const weight of [1, 4, 8]) rows[`page-${rankUnit}-${weight}:1`] = [];
    for (const [at, query] of querySet.queries.entries()) {
      const scope = { limit: profile.candidateDepth, ...(query.variant ? { variant: query.variant } : {}), ...(query.readerSelection ? { readerSelection: query.readerSelection } : {}) };
      const lexical = retriever.lexical(query.query, scope), vector = retriever.vector(queries.vectors[at], scope);
      const detail = { query: query.query, kind: query.kind, expected: query.expectGroups ?? [query.expect], rankings: {} };
      for (const rankUnit of ['passage', 'page']) for (const weight of [1, 4, 8]) {
        const name = `page-${rankUnit}-${weight}:1`;
        const pages = pageFusion(lexical, vector, { rankUnit, vectorWeight: weight, limit: profile.pageLimit ?? profile.passageLimit });
        rows[name].push({ ...query, rank: answerRank(query, pages.map(p => p.docId)), top: pages.slice(0, 10).map(p => p.docId) });
        detail.rankings[name] = pages.slice(0, 10).map(p => ({ docId: p.docId, score: p.score, lexicalRank: p.lexicalRank, vectorRank: p.vectorRank, supportingPassages: p.passages.map(h => h.chunk.id) }));
      }
      diagnostics.push(detail);
    }
    const scores = Object.fromEntries(Object.entries(rows).map(([name, rows]) => [name, summarize(rows)]));
    report.profiles.push({ profile, referenceScores: previous.scores, scores, comparisons: Object.fromEntries(Object.entries(scores).map(([name, score]) => [name, pairedHitRate(previous.scores.vector, score)])), diagnostics });
    console.log(profile.name, Object.fromEntries(Object.entries(scores).map(([name, score]) => [name, score.overall.hitRate[3]])));
  }
  const out = path.resolve(options['--out']); await mkdir(out);
  await writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`Saved ${out}; zero API calls`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main(process.argv.slice(2));
