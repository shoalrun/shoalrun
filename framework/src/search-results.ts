import { searchHistoryIntent } from './search-terms.js';
import type { Hit, LexicalOptions, Retriever } from './retrieval.js';
import { compareHits, tokenize } from './retrieval.js';
import { literalSearch } from './search-literal.js';
import { identifierRescue } from './search-identifier-core.js';

type SearchHit = Hit & { literalSummary?: string };

// Select landing passages for the search box, without changing passage retrieval
// used by Ask. A gallery's repeated examples must not crowd other pages out.
export function createSearchResultSelector(retriever: Retriever) {
  retriever.requirePreparedSearch();
  const normalized = (text: string) => tokenize(text).join(' ');
  return (hits: Iterable<Hit>, query: string, options: LexicalOptions & { mode?: 'vector' | 'lexical' }, rescue?: Hit): SearchHit[] => {
    const pages = new Map<string, { first?: Hit; prose?: Hit; literal?: SearchHit; exactTitle: boolean }>();
    const normalizedQuery = normalized(query);
    const literal = literalSearch(query);
    let exact: Hit | undefined;
    // Retain at most three candidates per page, independent of its passage
    // count. Input scores need not be sorted or collected into an array.
    for (const original of hits) {
      const hit = options.mode === 'vector' && original.chunk.type === 'changelog-entry' && !searchHistoryIntent(query) ? { ...original, score: original.score * 0.8 } : original;
      const page = pages.get(hit.chunk.docId) ?? { exactTitle: normalized(hit.chunk.title) === normalizedQuery };
      if (!page.first || compareHits(hit, page.first) < 0) page.first = hit;
      if (hit.chunk.search!.paragraphs.length && (!page.prose || compareHits(hit, page.prose) < 0)) page.prose = hit;
      const literalSummary = literal?.(hit.chunk.search!.literalLines);
      if (literalSummary && (!page.literal || compareHits(hit, page.literal) < 0)) page.literal = { ...hit, literalSummary };
      pages.set(hit.chunk.docId, page);
      if (page.exactTitle && (!exact || compareHits(hit, exact) < 0)) exact = hit;
    }
    const limit = options.limit ?? 8;
    const candidates: Array<{ rank: Hit; hit: SearchHit }> = [];
    for (const page of pages.values()) {
      const candidate = page.literal ? { rank: page.first!, hit: { ...page.literal, score: page.first!.score } } : page.prose ? { rank: page.prose, hit: page.prose as SearchHit } : undefined;
      if (!candidate) continue;
      const at = candidates.findIndex(other => compareHits(candidate.rank, other.rank) < 0);
      candidates.splice(at < 0 ? candidates.length : at, 0, candidate);
      if (candidates.length > limit) candidates.pop();
    }
    let selected = candidates.map(item => item.hit);
    if (rescue) {
      selected = identifierRescue(query, selected, [rescue]);
      const landing = pages.get(rescue.chunk.docId)?.literal;
      if (landing) selected = selected.map(hit => hit.chunk.docId === rescue.chunk.docId ? { ...landing, score: hit.score } : hit);
    }
    // An exact page-title query is a request for that topic's entry point.
    // Ordinary semantic queries retain their ranking; incidental words do not qualify.
    if (exact) {
      const introduction = retriever.pageIntroduction(exact.chunk.docId, options);
      const page = pages.get(exact.chunk.docId);
      const landing = introduction ? { chunk: introduction, score: exact.score } : page?.literal ?? page?.prose;
      if (landing) {
        return [landing, ...selected.filter(hit => hit.chunk.docId !== exact!.chunk.docId)].slice(0, options.limit ?? 8);
      }
    }
    return selected.slice(0, limit);
  };
}
