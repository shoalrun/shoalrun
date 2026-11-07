import { rerankOrKeep, type RerankCandidate } from './decision-rerank.js';
import { searchTerms, searchHistoryIntent, literalTermSearch, type TermIndex } from './search-terms.js';
import type { Retriever, ReaderSelection } from './retrieval.js';
import { compareHits, tokenize, type Hit } from './retrieval.js';
import type { ReaderFiltersConfig } from './reader-filters.js';
import { validateReaderSelection } from './reader-filters.js';
import { searchSnippetFromParagraphs } from './search-text.js';
import { identifierMatch, identifierRescue } from './search-identifier-core.js';
import type { DailyBudget, SharedRateLimit } from './budget.js';
import { createSearchResultSelector } from './search-results.js';

export type SearchFallbackReason = 'embeddings-unavailable' | 'budget-unavailable' | 'budget-denied' | 'provider-error' | 'deadline';

export function createSearchHandler(options: {
  retriever: Retriever;
  embedQuery?: (query: string, signal?: AbortSignal) => Promise<Float32Array>;
  // Bound the optional semantic work, including budget reservation. Lexical search stays available.
  semanticTimeoutMs?: number;
  onFallback?: (reason: SearchFallbackReason) => void;
  hosts: string[];
  readerFilters?: ReaderFiltersConfig;
  pageSummaries?: Map<string, string>;
  compiledSearch?: TermIndex;
  rerank?: (query: string, candidates: RerankCandidate[], signal?: AbortSignal) => Promise<number[]>;
  rerankCandidates?: number;
  rerankTimeoutMs?: number;
  rateLimiter?: Pick<SharedRateLimit, 'take'>;
  budget?: Pick<DailyBudget, 'reserve'>;
  clientKey?: (request: Request) => string;
}): (request: Request) => Promise<Response> {
  const selectResults = createSearchResultSelector(options.retriever);
  const json = (status: number, value: unknown) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
  return async request => {
    if (request.method !== 'POST') return json(405, { error: 'Use POST.' });
    const url = new URL(request.url);
    if (!options.hosts.includes(url.host) || request.headers.get('origin') !== url.origin) return json(403, { error: 'Search is available only from this preview.' });
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return json(415, { error: 'Send JSON.' });
    let parsed: unknown;
    try { parsed = await request.json(); } catch { return json(400, { error: 'Invalid JSON.' }); }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return json(400, { error: 'Invalid search request.' });
    const body = parsed as Record<string, unknown>;
    const query = body.query;
    const variant = body.variant;
    const limit = body.limit === undefined ? 8 : body.limit;
    if (typeof query !== 'string' || !query.trim() || query.length > 300 || typeof variant !== 'string' || !options.retriever.variants().includes(variant) || !Number.isInteger(limit) || (limit as number) < 1 || (limit as number) > 20) return json(400, { error: 'Invalid search request.' });
    let readerSelection: ReaderSelection | undefined;
    try {
      if (body.readerSelection !== undefined) {
        if (!options.readerFilters) throw new Error('No reader filters configured');
        readerSelection = validateReaderSelection(body.readerSelection, options.readerFilters, 'readerSelection');
      }
    } catch { return json(400, { error: 'Invalid reader view.' }); }
    const searchOptions = { variant, limit: limit as number, readerSelection };
    const caller = options.clientKey?.(request) ?? 'shared';
    let reservation: Promise<boolean> | undefined;
    const reserve = () => reservation ??= Promise.resolve().then(() => options.budget ? options.budget.reserve(caller) : true);
    if (options.rateLimiter) {
      const taken = await options.rateLimiter.take(caller);
      if (!taken.allowed) return new Response(JSON.stringify({ error: 'Too many searches. Wait a moment and try again.' }), { status: 429, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Retry-After': String(taken.retryAfterSeconds) } });
    }
    try {
      if (!/[\p{L}\p{N}]/u.test(query)) return json(200, { results: [], mode: 'lexical', matchMode: 'all' });
      const literal = options.compiledSearch && literalTermSearch(options.compiledSearch, query.trim(), searchOptions);
      if (literal) return json(200, { results: literal.results.map(({ document: doc, section }) => ({ url: section ? `${doc.url}#${section.id}` : doc.url, title: doc.title, summary: doc.summary, ...(section ? { section: section.title } : {}) })), mode: 'lexical', selection: 'literal', matchMode: literal.matchMode });
      let vector: Float32Array | undefined;
      let fallbackReason: SearchFallbackReason | undefined = 'embeddings-unavailable';
      if (options.embedQuery && options.retriever.hasVectors(searchOptions)) {
        const controller = new AbortController();
        const signal = AbortSignal.any([controller.signal, request.signal]);
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          vector = await Promise.race([
            (async () => {
              let allowed: boolean;
              try { allowed = await reserve(); }
              catch (error) { fallbackReason = 'budget-unavailable'; throw error; }
              signal.throwIfAborted();
              if (!allowed) { fallbackReason = 'budget-denied'; return undefined; }
              fallbackReason = 'provider-error';
              return options.embedQuery!(query.trim(), signal);
            })(),
            new Promise<never>((_, reject) => {
              timer = setTimeout(() => {
                fallbackReason = 'deadline';
                const error = new Error('Semantic search timed out');
                controller.abort(error);
                reject(error);
              }, options.semanticTimeoutMs ?? 3000);
            })
          ]);
        } catch {
          // Provider failures and deadlines must not hide the local lexical results.
        } finally {
          clearTimeout(timer);
        }
      }
      if (!vector && fallbackReason) options.onFallback?.(fallbackReason);
      if (!vector && options.compiledSearch) {
        const found = searchTerms(options.compiledSearch, query.trim(), searchOptions);
        return json(200, { results: found.results.map(({ document: doc, section }) => ({ url: section ? `${doc.url}#${section.id}` : doc.url, title: doc.title, summary: doc.summary, ...(section ? { section: section.title } : {}) })), mode: 'lexical', fallbackReason, matchMode: found.matchMode, ...(found.correction ? { correction: found.correction } : {}) });
      }
      let candidate: Hit | undefined;
      const matchesIdentifier = identifierMatch(query);
      if (vector && (limit as number) >= 3 && matchesIdentifier) {
        for (const hit of options.retriever.searchPassages(query.trim(), undefined, searchOptions)) {
          if (matchesIdentifier(hit) && (!candidate || compareHits(hit, candidate) < 0)) candidate = hit;
        }
      }
      const candidateOptions = { ...searchOptions, limit: options.rerank && vector ? Math.max(limit as number, options.rerankCandidates ?? 12) : limit as number, mode: vector ? 'vector' as const : 'lexical' as const };
      let hits = selectResults(options.retriever.searchPassages(query.trim(), vector, searchOptions), query.trim(), candidateOptions, candidate);
      let rerankState: { reranked: boolean; rerankFallback?: string; rerankAbstained?: boolean; matchMode?: string } | undefined;
      const exactTitle = hits[0] && tokenize(hits[0].chunk.title).join(' ') === tokenize(query).join(' ');
      if (vector && options.rerank && !exactTitle && !searchHistoryIntent(query) && !/[a-z][A-Z]|[.$@:/_]|--/.test(query)) {
        const head = hits.slice(0, options.rerankCandidates ?? 12);
        const inputs = head.map(({ chunk }) => ({ id: chunk.docId, title: chunk.title, section: chunk.headingPath.at(-1), type: chunk.type, summary: options.pageSummaries?.get(`${chunk.variant}:${chunk.docId}`), text: [...chunk.search!.paragraphs, ...chunk.search!.literalLines].join('\n').slice(0, 4000) }));
        const ranked = await rerankOrKeep(head, inputs, query.trim(), async (query, inputs, signal) => {
          if (!await reserve()) throw new Error('Reranking budget denied');
          signal?.throwIfAborted();
          return options.rerank!(query, inputs, signal);
        }, options.rerankTimeoutMs ?? 750, request.signal);
        hits = [...ranked.items, ...hits.slice(head.length)];
        if (candidate) hits = identifierRescue(query, hits, [candidate]);
        rerankState = { reranked: ranked.reranked, ...(ranked.fallback ? { rerankFallback: ranked.fallback } : {}) };
        if (ranked.abstained) {
          rerankState.rerankAbstained = true;
          if (options.compiledSearch) {
            const evidence = searchTerms(options.compiledSearch, query.trim(), searchOptions);
            rerankState.matchMode = evidence.matchMode;
            // A weak model choice alone cannot erase useful lexical evidence.
            if (!evidence.total) hits = [];
          }
        }
      }
      hits = hits.slice(0, limit as number);
      const results = hits.map(({ chunk, literalSummary }) => ({ url: chunk.url, title: chunk.title, section: chunk.headingPath.at(-1), summary: literalSummary ?? searchSnippetFromParagraphs(chunk.search!.paragraphs, query.trim(), options.pageSummaries?.get(`${chunk.variant}:${chunk.docId}`)) }));
      return json(200, { results, mode: vector ? 'vector' : 'lexical', ...(!vector ? { fallbackReason } : {}), ...rerankState });
    } catch { return json(503, { error: 'Semantic search is unavailable.' }); }
  };
}
