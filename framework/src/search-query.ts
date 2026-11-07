import { isTermIndex, searchTerms, type TermIndex } from './search-terms.js';
import { parsePublicationKey } from './publication-identity.js';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { phraseMatches, queryUnits, validateSearchSynonyms, type QueryUnit } from './search-synonyms.js';

type SearchSection = { standalone?: boolean; id: string; title: string; markdownUrl: string; markdownBytes: number; markdownTokens: number };
type SearchDocument = { id: string; url: string; markdownUrl: string; title: string; summary: string; type: string; variant: string; headings: Array<{ id: string; title: string }>; text: string; markdownBytes?: number; markdownTokens?: number; markdownTokenEncoding?: string; sections?: SearchSection[] };
type SearchIndex = { schemaVersion: number; documents: SearchDocument[]; synonyms?: string[][] };
export type SearchOptions = { product?: string; channel?: string; version?: string; language?: string; limit?: number };

const fallbackStopWords = new Set('a an the i me my we our you your how do does can could would should will is are was were be to of in on for with please what where when why which some any each several'.split(' '));

function excerpt(value: string, terms: string[]): string {
  const lower = value.toLocaleLowerCase();
  const positions = terms.map(term => lower.indexOf(term)).filter(at => at >= 0);
  if (!positions.length) return value.slice(0, 180).trim();
  const start = Math.max(0, Math.min(...positions) - 65);
  const end = Math.min(value.length, start + 180);
  return `${start ? '…' : ''}${value.slice(start, end).trim()}${end < value.length ? '…' : ''}`;
}

export async function queryBuiltSite(directory: string, query: string, options: SearchOptions = {}) {
  if (!query.trim()) throw new Error('Search query must be nonempty text');
  const limit = options.limit ?? 8;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new Error('Search limit must be an integer from 1 to 100');
  let compiled: TermIndex | undefined;
  try {
    const value = JSON.parse(await readFile(path.join(directory, 'search-terms.json'), 'utf8'));
    if (!isTermIndex(value)) throw new Error('Unsupported precompiled search index');
    compiled = value;
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  if (compiled) {
    const variants = [...new Set(compiled.documents.filter(doc => {
      const publication = parsePublicationKey(doc.variant);
      return (!options.product || publication.product === options.product) && (!options.channel || publication.channel === options.channel) && (!options.version || publication.version === options.version) && (!options.language || publication.language === options.language);
    }).map(doc => doc.variant))].sort();
    if (!variants.length) throw new Error('No search documents match the selected publication');
    if (variants.length !== 1) throw new Error(`Search matches multiple publications (${variants.join(', ')}); pass --product where applicable, --channel, --version, and --language`);
    const publication = parsePublicationKey(variants[0]);
    const found = searchTerms(compiled, query, { variant: variants[0], limit });
    return { status: 'ok', query: query.trim(), publication, total: found.total, matchMode: found.matchMode, ...(found.correction ? { correction: found.correction } : {}), results: found.results.map(({ document: doc, score, section, sectionComplete }) => {
      const standalone = sectionComplete && section ? doc.sections?.find(candidate => candidate.id === section.id && candidate.standalone === true) : undefined;
      const tokens = standalone?.markdownTokens ?? doc.markdownTokens;
      return { id: doc.id, type: doc.type, title: doc.title, summary: doc.summary, score, url: section ? `${doc.url}#${section.id}` : doc.url,
        markdownUrl: standalone?.markdownUrl ?? doc.markdownUrl, pageMarkdownUrl: doc.markdownUrl, ...(section ? { section: section.title } : {}), snippet: section?.title ?? doc.summary,
        read: { tool: standalone ? 'get_section' : 'get_page', arguments: { id: doc.id, ...publication, ...(standalone ? { section: standalone.id } : {}), ...(tokens !== undefined ? { maxTokens: Math.min(100_000, Math.max(4096, tokens * 2 + 1024)) } : {}) } },
        ...(tokens !== undefined ? { markdownTokens: tokens, markdownBytes: standalone?.markdownBytes ?? doc.markdownBytes, markdownTokenEncoding: doc.markdownTokenEncoding } : {}) };
    }) };
  }
  let index: SearchIndex;
  try { index = JSON.parse(await readFile(path.join(directory, 'search-index.json'), 'utf8')); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new Error(`No search-index.json in ${directory}; build with the lexical provider or custom search index enabled`);
    throw error;
  }
  if (index?.schemaVersion !== 1 || !Array.isArray(index.documents) || index.documents.some(doc => !doc || typeof doc.id !== 'string' || typeof doc.url !== 'string' || typeof doc.markdownUrl !== 'string' || typeof doc.title !== 'string' || typeof doc.summary !== 'string' || typeof doc.type !== 'string' || typeof doc.variant !== 'string' || typeof doc.text !== 'string' || !Array.isArray(doc.headings) || doc.headings.some(heading => !heading || typeof heading.id !== 'string' || typeof heading.title !== 'string'))) throw new Error('Unsupported or invalid search-index.json');
  const synonyms = validateSearchSynonyms(index.synonyms);
  const matching = index.documents.filter(doc => {
    const { product, channel, version, language } = parsePublicationKey(doc.variant);
    return (!options.product || product === options.product) && (!options.channel || channel === options.channel) && (!options.version || version === options.version) && (!options.language || language === options.language);
  });
  const variants = [...new Set(matching.map(doc => doc.variant))].sort();
  if (!variants.length) throw new Error('No search documents match the selected publication');
  if (variants.length > 1) throw new Error(`Search matches multiple publications (${variants.join(', ')}); pass --product where applicable, --channel, --version, and --language`);
  const terms = queryUnits(query, synonyms);
  if (!terms.length) {
    const publication = parsePublicationKey(variants[0]);
    return { status: 'ok', query: query.trim(), publication, total: 0, results: [] };
  }
  const match = (value: string, unit: QueryUnit) => phraseMatches(value, unit.term) || unit.alternatives.some(term => phraseMatches(value, term));
  // Page titles are short subject labels, often singular. Accept a plain final
  // English -s query plural there without broadening body/heading matches.
  const titleMatches = (value: string, term: string) => phraseMatches(value, term)
    || ((term.split(' ').at(-1)?.length ?? 0) > 3 && /[^sui]s$/.test(term) && phraseMatches(value, term.slice(0, -1)));
  const matchTitle = (value: string, unit: QueryUnit) => titleMatches(value, unit.term) || unit.alternatives.some(term => titleMatches(value, term));
  const weight = (value: string, unit: QueryUnit, score: number, title = false) => {
    const matches = title ? titleMatches : phraseMatches;
    return matches(value, unit.term) ? score : unit.alternatives.some(term => matches(value, term)) ? score * 0.5 : 0;
  };
  const hits = matching.flatMap(doc => {
    const title = doc.title.toLocaleLowerCase();
    const summary = doc.summary.toLocaleLowerCase();
    const body = doc.text.toLocaleLowerCase();
    const headings = doc.headings.map(heading => heading.title.toLocaleLowerCase());
    const matched = terms.filter(term => matchTitle(title, term) || match(summary, term) || match(body, term) || headings.some(heading => match(heading, term)));
    if (!matched.length) return [];
    const termScore = (term: QueryUnit) => weight(title, term, title.startsWith(term.term) ? 12 : 8, true) || weight(summary, term, 4) || (headings.some(heading => match(heading, term)) ? 3 : 0) || weight(body, term, 1);
    let score = terms.reduce((total, term) => total + termScore(term), 0);
    let contentScore = terms.filter(term => !fallbackStopWords.has(term.term)).reduce((total, term) => total + termScore(term), 0);
    const prominentMatches = terms.filter(term => !fallbackStopWords.has(term.term) && (matchTitle(title, term) || match(summary, term) || headings.some(heading => match(heading, term)))).length;
    const section = terms.every(term => matchTitle(title, term)) ? undefined : doc.headings.find((heading, at) => terms.every(term => match(headings[at], term)));
    // Use only query terms with meaning, and require a unique matching section.
    // Page-title terms may provide context ("search custom provider"). Never pick
    // a section for a page-title-only query or an ambiguous heading match.
    const meaningful = terms.filter(term => !fallbackStopWords.has(term.term) && !['use', 'using', 'find', 'read', 'show', 'tell', 'explain', 'configure', 'set', 'up', 'about'].includes(term.term));
    const specific = meaningful.filter(term => !matchTitle(title, term));
    const candidates = specific.length ? (doc.sections ?? []).filter(candidate =>
      specific.every(term => match(candidate.title.toLocaleLowerCase(), term))) : [];
    // Relevance is not context sufficiency. Require an explicit author declaration;
    // older indexes and unreviewed sections conservatively retain the full page.
    const selected = candidates.length === 1 && candidates[0].standalone === true ? candidates[0] : undefined;
    // A complete multiword section-title match outranks incidental page-title words.
    if (meaningful.length >= 2 && candidates.some(candidate => meaningful.every(term => match(candidate.title.toLocaleLowerCase(), term)))) { score += 20; contentScore += 20; }
    const { product, channel, version, language } = parsePublicationKey(doc.variant);
    const tokens = selected?.markdownTokens ?? doc.markdownTokens;
    const read = { tool: selected ? 'get_section' : 'get_page', arguments: {
      id: doc.id, ...(selected ? { section: selected.id } : {}), ...(product === undefined ? {} : { product }), channel, version, language,
      ...(tokens !== undefined ? { maxTokens: Math.min(100_000, Math.max(4096, tokens * 2 + 1024)) } : {}),
    } };
    return [{ score, contentScore, prominentMatches, matched: matched.length, partialMatched: matched.filter(term => !fallbackStopWords.has(term.term)).length, id: doc.id, type: doc.type, title: doc.title, summary: doc.summary, url: section ? `${doc.url}#${section.id}` : doc.url, markdownUrl: selected?.markdownUrl ?? doc.markdownUrl, pageMarkdownUrl: doc.markdownUrl, read, ...(tokens !== undefined ? { markdownTokens: tokens, markdownBytes: selected?.markdownBytes ?? doc.markdownBytes, markdownTokenEncoding: doc.markdownTokenEncoding } : {}), ...(selected || section ? { section: selected?.title ?? section?.title } : {}), snippet: excerpt(doc.text, terms.flatMap(unit => [unit.term, ...unit.alternatives])) }];
  });
  const contentTerms = terms.filter(term => !fallbackStopWords.has(term.term)).length;
  // Filler words shape the sentence, not the subject. A page that covers every
  // content term is complete even when it omits "how", "do", or "the"; otherwise
  // a page that happens to repeat filler words can hide the focused result.
  const complete = contentTerms === 0
    ? hits.filter(hit => hit.matched === terms.length)
    : hits.filter(hit => hit.partialMatched === contentTerms);
  // Relax the all-words gate only when complete matches are entirely incidental
  // body matches. A near-complete result must cover all but one content term and
  // have a stronger non-filler field score. Title/summary/heading matches on any
  // complete result preserve the original preference; filler cannot earn promotion.
  const bestCompleteContent = Math.max(...complete.map(hit => hit.contentScore));
  const stronger = complete.length && contentTerms >= 3 && complete.every(hit => hit.prominentMatches === 0)
    ? hits.filter(hit => hit.partialMatched < contentTerms && hit.partialMatched >= contentTerms - 1
      && hit.prominentMatches > 0 && hit.contentScore > bestCompleteContent) : [];
  const ranked = complete.length ? [...complete, ...stronger] : hits.filter(hit => hit.partialMatched > 0);
  // In partial fallback, one extra incidental word must not outweigh a focused
  // subject match. Compare non-filler field scores within a one-term coverage
  // band; sparse matches remain below it, ordered by their original coverage.
  const bestCoverage = Math.max(0, ...ranked.map(hit => hit.partialMatched));
  const nearCoverage = Math.max(2, bestCoverage - 1);
  ranked.sort((a, b) => {
    if (stronger.length) return b.contentScore - a.contentScore || b.score - a.score || a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
    if (!complete.length) {
      const aNear = a.partialMatched >= nearCoverage;
      const bNear = b.partialMatched >= nearCoverage;
      if (aNear !== bNear) return Number(bNear) - Number(aNear);
      if (aNear && a.contentScore !== b.contentScore) return b.contentScore - a.contentScore;
    }
    return (complete.length ? b.contentScore - a.contentScore : b.partialMatched - a.partialMatched) || b.score - a.score || a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
  });
  const publication = parsePublicationKey(variants[0]);
  return { status: 'ok', query: query.trim(), publication, total: ranked.length, matchMode: stronger.length ? 'mixed' : complete.length ? 'all' : 'partial', results: ranked.slice(0, limit).map(({ matched, partialMatched, contentScore, prominentMatches, ...result }) => result) };
}
