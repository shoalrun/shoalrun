import type { Retriever, ReaderSelection } from './retrieval.js';
import type { ReaderFiltersConfig } from './reader-filters.js';
import { validateReaderSelection } from './reader-filters.js';
import { searchSnippetFromParagraphs } from './search-snippet.js';
import { identifierRescue, searchIdentifiers } from './search-identifier.js';
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
    if (options.rateLimiter) {
      const taken = await options.rateLimiter.take(caller);
      if (!taken.allowed) return new Response(JSON.stringify({ error: 'Too many searches. Wait a moment and try again.' }), { status: 429, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Retry-After': String(taken.retryAfterSeconds) } });
    }
    try {
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
              try { allowed = !options.budget || await options.budget.reserve(caller); }
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
      // Rank pages after inspecting their passages. A large gallery can otherwise
      // consume the entire candidate window before page deduplication happens.
      const retrievalOptions = { ...searchOptions, limit: Number.MAX_SAFE_INTEGER };
      let hits = vector
        ? options.retriever.vector(vector, retrievalOptions)
        : options.retriever.lexical(query.trim(), retrievalOptions);
      if (vector && (limit as number) >= 3 && searchIdentifiers(query).length) {
        const lexical = options.retriever.lexical(query.trim(), retrievalOptions);
        hits = identifierRescue(query.trim(), hits, lexical);
      }
      const results = selectResults(hits, query.trim(), searchOptions).map(({ chunk, literalSummary }) => ({ url: chunk.url, title: chunk.title, section: chunk.headingPath.at(-1), summary: literalSummary ?? searchSnippetFromParagraphs(chunk.search!.paragraphs, query.trim(), options.pageSummaries?.get(`${chunk.variant}:${chunk.docId}`)) }));
      return json(200, { results, mode: vector ? 'vector' : 'lexical', ...(!vector ? { fallbackReason } : {}) });
    } catch { return json(503, { error: 'Semantic search is unavailable.' }); }
  };
}
