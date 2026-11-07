import { createDecisionReranker } from './decision-rerank.js';
import { validateSearch } from './search-config.js';
import { isTermIndex, type TermIndex } from './search-terms.js';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createProvider, readEmbeddings } from './embeddings.js';
import { queryProviderConfig, validateRetrieval } from './retrieval-config.js';
import { Retriever } from './retrieval.js';

// Search needs only passage retrieval and query embeddings, never chat models,
// answer cards, source configuration, rendering, or component compilation.
export async function prepareSearchRetrieval(directory: string, settings: Record<string, unknown>, env: NodeJS.ProcessEnv = process.env) {
  const retrieval = validateRetrieval(settings.retrieval);
  const chunks = JSON.parse(await readFile(path.join(directory, 'ai', 'chunks.json'), 'utf8'));
  const embeddings = await readEmbeddings(directory);
  const retriever = new Retriever(chunks, embeddings);
  let embedQuery: ((query: string, signal?: AbortSignal) => Promise<Float32Array>) | undefined;
  if (embeddings) {
    const provider = createProvider(queryProviderConfig(retrieval, embeddings.meta));
    if (provider.space !== embeddings.meta.space || (embeddings.meta.backend && provider.backend !== embeddings.meta.backend)) throw new Error(`${provider.model} is not in the embedding space or backend of ${embeddings.meta.model}`);
    embedQuery = async (query, signal) => (await provider.embed([query], 'query', signal))[0];
  }
  let compiledSearch: TermIndex | undefined;
  try {
    const value = JSON.parse(await readFile(path.join(directory, 'search-terms.json'), 'utf8'));
    if (!isTermIndex(value)) throw new Error('Unsupported precompiled search index');
    compiledSearch = value;
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  const { rerank } = validateSearch(settings.search);
  const pageSummaries = compiledSearch ? new Map(compiledSearch.documents.map(doc => [`${doc.variant}:${doc.id}`, doc.canonicalSummary ?? doc.summary])) : undefined;
  return { retriever, embedQuery, compiledSearch, pageSummaries, ...(rerank ? { rerank: createDecisionReranker(rerank, env), rerankTimeoutMs: rerank.timeoutMs, rerankCandidates: rerank.maxCandidates } : {}) };
}
