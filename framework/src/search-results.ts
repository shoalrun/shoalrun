import type { Hit, LexicalOptions, Retriever } from './retrieval.js';
import { tokenize } from './retrieval.js';
import { literalSearch } from './search-literal.js';

type SearchHit = Hit & { literalSummary?: string };

// Select landing passages for the search box, without changing passage retrieval
// used by Ask. A gallery's repeated examples must not crowd other pages out.
export function createSearchResultSelector(retriever: Retriever) {
  retriever.requirePreparedSearch();
  const normalized = (text: string) => tokenize(text).join(' ');
  return (hits: Hit[], query: string, options: LexicalOptions): SearchHit[] => {
    const pages = new Map<string, SearchHit>();
    const literal = literalSearch(query);
    const literalPages = new Map<string, SearchHit>();
    if (literal) {
      for (const hit of hits) {
        if (literalPages.has(hit.chunk.docId)) continue;
        const literalSummary = literal(hit.chunk.search!.literalLines);
        if (literalSummary) literalPages.set(hit.chunk.docId, { ...hit, literalSummary });
      }
    }
    for (const hit of hits) {
      if (pages.has(hit.chunk.docId)) continue;
      // Keep the page's retrieved position, but land on the passage that actually
      // contains the literal. A nearby token table must not hide the correct row.
      const exactPassage = literalPages.get(hit.chunk.docId);
      if (exactPassage) pages.set(hit.chunk.docId, { ...exactPassage, score: hit.score });
      else if (hit.chunk.search!.paragraphs.length) pages.set(hit.chunk.docId, hit);
    }
    // An exact page-title query is a request for that topic's entry point.
    // Ordinary semantic queries retain their ranking; incidental words do not qualify.
    const exact = hits.find(hit => normalized(hit.chunk.title) === normalized(query));
    if (exact) {
      const introduction = retriever.pageIntroduction(exact.chunk.docId, options);
      const landing = introduction ? { chunk: introduction, score: exact.score } : pages.get(exact.chunk.docId);
      if (landing) {
        pages.delete(exact.chunk.docId);
        return [landing, ...pages.values()].slice(0, options.limit ?? 8);
      }
    }
    return [...pages.values()].slice(0, options.limit ?? 8);
  };
}
