/** Shared, dependency-free lookup for precompiled static search. */
export type Marks = Record<string, string[]>;
export type TermDocument = { id: string; title: string; summary: string; url: string; markdownUrl: string; type: string; variant: string; releaseVersion?: string; canonicalSummary?: string; readerFilters?: Marks; headings: Array<{ id: string; title: string }>; markdownBytes?: number; markdownTokens?: number; markdownTokenEncoding?: string; sections?: Array<{ id: string; title: string; markdownUrl: string; markdownBytes: number; markdownTokens: number; standalone?: boolean }> };
export type TermField = { document: number; kind: 0 | 1 | 2 | 3; section?: number; filters?: Marks | Marks[]; text: string };
// A posting is [field number, ...token positions]. Fields contain no article prose.
export type TermIndex = { schemaVersion: 1; kind: 'shoalrun-search-terms'; documents: TermDocument[]; fields: Array<[number, number, number, number]>; filters: Marks[][]; terms: Record<string, string>; synonyms: string[][] };
export type TermHit = { document: TermDocument; score: number; coverage: number; section?: { id: string; title: string }; sectionComplete?: boolean };
const stop = new Set('a an the i me my we our you your how do does can could would should will is are was were be to of in on for with please what where when why which some any each several'.split(' '));
const singular = (word: string) => {
  if (word.length <= 3 || !/^\p{L}+$/u.test(word) || /(ss|us|is)$/.test(word)) return word;
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (/(ss|us|x|z|ch|sh)es$/.test(word)) return word.slice(0, -2);
  return word.endsWith('s') ? word.slice(0, -1) : word;
};
export function termWords(value: string): Array<string[]> {
  return (value.normalize('NFKC').match(/[\p{L}\p{N}_$@:./-]+/gu) ?? []).map(raw => {
    const original = raw.replace(/^[.:/]+|[.:/]+$/g, '');
    const whole = original.toLocaleLowerCase();
    const technical = /[a-z][A-Z]|[._$@:/]|^--/.test(original);
    const primary = technical ? whole : singular(whole);
    const parts = original.split(/[._$@:/-]+/).filter(Boolean);
    const aliases = parts.length > 1 ? parts.map(part => /[a-z][A-Z]/.test(part) ? part.toLocaleLowerCase() : singular(part.toLocaleLowerCase())) : [];
    return [...new Set([primary, ...aliases, ...(primary !== whole ? [whole] : [])].filter(Boolean))];
  }).filter(words => words.length);
}
export const termMatches = (marks: Marks | undefined, selection: Marks = {}) => Object.entries(marks ?? {}).every(([facet, values]) => {
  const choices = Object.hasOwn(selection, facet) ? selection[facet] : undefined;
  return !choices?.length || values.some(value => choices.includes(value));
});
export function buildTermIndex(documents: TermDocument[], fields: TermField[], synonyms: string[][] = []): TermIndex {
  const postings: Record<string, number[][]> = Object.create(null);
  const filters: Marks[][] = [[]];
  const filterIds = new Map([['[]', 0]]);
  const records: TermIndex['fields'] = [];
  for (const field of fields) {
    const scopes = Array.isArray(field.filters) ? field.filters : field.filters ? [field.filters] : [];
    const key = JSON.stringify(scopes.map(scope => Object.fromEntries(Object.entries(scope).sort(([a], [b]) => a.localeCompare(b)))));
    let filter = filterIds.get(key);
    if (filter === undefined) { filter = filters.length; filterIds.set(key, filter); filters.push(scopes); }
    const words = termWords(field.text);
    const fieldId = records.length;
    records.push([field.document, field.kind, field.section ?? -1, filter]);
    const positions = new Map<string, number[]>();
    words.forEach((alternatives, position) => alternatives.forEach(term => { const list = positions.get(term) ?? []; list.push(position); positions.set(term, list); }));
    for (const [term, values] of positions) (postings[term] ??= []).push([fieldId, ...values]);
  }
  // Positions are needed for configured multiword synonyms, not ordinary word lookups.
  const phraseWords = new Set(synonyms.flat().filter(term => /\s/.test(term)).flatMap(term => termWords(term).flat()));
  const terms = Object.fromEntries(Object.entries(postings).map(([term, rows]) => [term, encodePostings(rows, phraseWords.has(term))]));
  return { schemaVersion: 1, kind: 'shoalrun-search-terms', documents, fields: records, filters, terms, synonyms };
}
export function isTermIndex(value: any): value is TermIndex {
  return value?.schemaVersion === 1 && value?.kind === 'shoalrun-search-terms' && Array.isArray(value.documents) && Array.isArray(value.fields) && Array.isArray(value.filters) && value.terms && typeof value.terms === 'object' && !Array.isArray(value.terms) && Array.isArray(value.synonyms);
}
function encodePostings(rows: number[][], keepPositions: boolean): string {
  const bytes: number[] = [];
  const write = (value: number) => { while (value >= 128) { bytes.push((value & 127) | 128); value = Math.floor(value / 128); } bytes.push(value); };
  let previousField = 0;
  for (const [field, ...positions] of rows) {
    write(field - previousField); previousField = field; write(keepPositions ? positions.length : 0);
    let previousPosition = 0;
    if (keepPositions) for (const position of positions) { write(position - previousPosition); previousPosition = position; }
  }
  let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
const decoded = new WeakMap<TermIndex, Map<string, number[][]>>();
function decodeTerm(index: TermIndex, term: string): number[][] {
  let cache = decoded.get(index); if (!cache) { cache = new Map(); decoded.set(index, cache); }
  const cached = cache.get(term); if (cached) return cached;
  const encoded = Object.hasOwn(index.terms, term) ? index.terms[term] : undefined;
  if (typeof encoded !== 'string') return [];
  const bytes = atob(encoded); let at = 0;
  const read = () => { let result = 0, factor = 1; for (let count = 0; count < 5; count++) { if (at >= bytes.length) throw new Error('Truncated search posting'); const byte = bytes.charCodeAt(at++); result += (byte & 127) * factor; if (byte < 128) return result; factor *= 128; } throw new Error('Invalid search posting'); };
  const rows: number[][] = []; let field = 0;
  while (at < bytes.length) {
    field += read(); const count = read(); if (field >= index.fields.length || count > bytes.length - at) throw new Error('Invalid search posting');
    const row = [field]; let position = 0;
    for (let i = 0; i < count; i++) { position += read(); row.push(position); }
    rows.push(row);
  }
  cache.set(term, rows); return rows;
}
function phrase(index: TermIndex, text: string, eligible: Set<number>): Map<number, number> {
  const words = termWords(text).map(words => words[0]);
  if (!words.length) return new Map();
  // Hyphenated natural-language phrases can use ordinary adjacent words too.
  const candidates = [words];
  const rawWords = text.toLocaleLowerCase().normalize('NFKC').match(/[\p{L}\p{N}_$@:./-]+/gu) ?? [];
  if (words.length === 1 && rawWords.length === 1 && words[0] !== rawWords[0]) candidates.push(rawWords);
  if (words.length === 1 && /^[\p{Ll}]+(?:-[\p{Ll}]+)+$/u.test(text)) candidates.push(text.split('-').map(singular));
  const result = new Map<number, number>();
  for (const sequence of candidates) {
    const postings = sequence.map(word => decodeTerm(index, word));
    if (postings.some(list => !list.length)) continue;
    const byField = postings.map(list => new Map(list.filter(row => eligible.has(row[0])).map(row => [row[0], new Set(row.slice(1))])));
    for (const [field, first] of byField[0]) {
      if (sequence.length === 1 || [...first].some(position => byField.every((map, at) => map.get(field)?.has(position + at)))) result.set(field, first.size);
    }
  }
  return result;
}
function units(query: string, synonyms: string[][]) {
  const normalized = /[._$@:/]|--/.test(query) ? query.normalize('NFKC') : query.normalize('NFKC').replace(/(?<![-\p{L}])([\p{L}]+(?:-[\p{L}]+)+)(?![-\p{L}])/gu, value => /[a-z][A-Z]/.test(value) ? value : value.replaceAll('-', ' '));
  const words = normalized.trim().split(/\s+/).map(word => word.replace(/^[^\p{L}\p{N}_$-]+|[^\p{L}\p{N}_$-]+$/gu, '')).filter(Boolean);
  const entries = synonyms.flatMap(group => group.map(term => ({ term, group, words: term.split(' ') }))).sort((a, b) => b.words.length - a.words.length);
  const result: Array<{ term: string; alternatives: string[] }> = [];
  for (let at = 0; at < words.length;) {
    const entry = entries.find(entry => entry.words.every((word, offset) => singular((words[at + offset] ?? '').toLocaleLowerCase()) === singular(word)));
    if (entry) { result.push({ term: words.slice(at, at + entry.words.length).join(' '), alternatives: entry.group.filter(term => term !== entry.term) }); at += entry.words.length; }
    else { result.push({ term: words[at], alternatives: [] }); at++; }
  }
  return result.filter((unit, at) => !stop.has(unit.term.toLocaleLowerCase()) && result.findIndex(other => other.term === unit.term) === at);
}
function oneEdit(left: string, right: string): boolean {
  if (Math.abs(left.length - right.length) > 1) return false;
  let at = 0; while (at < left.length && at < right.length && left[at] === right[at]) at++;
  if (at === left.length || at === right.length) return true;
  if (left.length === right.length) return left.slice(at + 1) === right.slice(at + 1)
    || left[at] === right[at + 1] && left[at + 1] === right[at] && left.slice(at + 2) === right.slice(at + 2);
  return left.length > right.length ? left.slice(at + 1) === right.slice(at) : left.slice(at) === right.slice(at + 1);
}
function correction(index: TermIndex, value: string, eligible: Set<number>): string | undefined {
  const word = singular(value);
  if (!/^[a-z]{5,}$/.test(word)) return;
  const candidates = Object.keys(index.terms).filter(term => /^[a-z]+$/.test(term) && oneEdit(word, term)
    && decodeTerm(index, term).some(row => eligible.has(row[0]) && index.fields[row[0]][1] < 3));
  // Ambiguity is a reason to retain a partial match, not to guess a different subject.
  if (candidates.length === 1) return candidates[0];
}
export const searchHistoryIntent = (query: string) => /\b(changelog|releases?|what changed|new in|when was .+ added)\b/i.test(query) && !/\b(write|create|publish|configure)\b/i.test(query);
export function searchTerms(index: TermIndex, query: string, options: { variant: string; limit?: number; readerSelection?: Marks; changelogPrior?: number } ): { total: number; matchMode: 'all' | 'mixed' | 'partial'; results: TermHit[]; correction?: string } {
  if (!isTermIndex(index)) throw new Error('Unsupported precompiled search index');
  const limit = options.limit ?? 8;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new Error('Search limit must be an integer from 1 to 100');
  const selected = options.readerSelection ?? {};
  const documents = new Set(index.documents.map((doc, at) => doc.variant === options.variant && termMatches(doc.readerFilters, selected) ? at : -1).filter(at => at >= 0));
  const eligible = new Set(index.fields.map(([doc, , , filters], at) => documents.has(doc) && index.filters[filters].every(scope => termMatches(scope, selected)) ? at : -1).filter(at => at >= 0));
  const history = searchHistoryIntent(query);
  const allUnits = units(query, index.synonyms);
  const subjectUnits = history ? allUnits.filter(unit => !/^(changelog|releases?|notes?|history|changed|new|added|when)$/i.test(unit.term)) : allUnits;
  const requested = subjectUnits.length ? subjectUnits : allUnits;
  const corrections = new Map<string, string>();
  if (!/[.$@:/_]|--|[\"'`]/.test(query)) for (const unit of requested) {
    if (/[A-Z]/.test(unit.term)) continue;
    if (!phrase(index, unit.term, eligible).size && !unit.alternatives.some(term => phrase(index, term, eligible).size)) {
      const fixed = correction(index, unit.term, eligible);
      if (fixed) { corrections.set(unit.term, fixed); unit.term = fixed; unit.alternatives = index.synonyms.find(group => group.includes(fixed))?.filter(term => term !== fixed) ?? []; }
    }
  }
  if (!requested.length) return { total: 0, matchMode: 'all' as const, results: [] as TermHit[] };
  const hits = new Map<number, { score: number; units: Set<number>; prominent: number; sections: Map<number, number>; sectionUnits: Map<number, Set<number>> }>();
  for (const [unitId, unit] of requested.entries()) {
    const matches = phrase(index, unit.term, eligible);
    const weights = new Map([...matches.keys()].map(field => [field, 1]));
    for (const alternative of unit.alternatives) for (const field of phrase(index, alternative, eligible).keys()) if (!weights.has(field)) weights.set(field, 0.5);
    const matchingDocs = new Set([...weights.keys()].map(field => index.fields[field][0]));
    const rarity = Math.log(1 + (documents.size + 1) / (matchingDocs.size + 1));
    const best = new Map<number, number>();
    for (const [fieldId, weight] of weights) {
      const [docId, kind, section] = index.fields[fieldId];
      const score = [12, 5, 7, 1][kind] * weight * rarity;
      const hit = hits.get(docId) ?? { score: 0, units: new Set<number>(), prominent: 0, sections: new Map<number, number>(), sectionUnits: new Map<number, Set<number>>() };
      if (score > (best.get(docId) ?? 0)) { hit.score += score - (best.get(docId) ?? 0); best.set(docId, score); }
      hit.units.add(unitId);
      if (kind < 3) hit.prominent = Math.max(hit.prominent, weight);
      if (section >= 0) {
        hit.sections.set(section, (hit.sections.get(section) ?? 0) + score);
        const covered = hit.sectionUnits.get(section) ?? new Set<number>(); covered.add(unitId); hit.sectionUnits.set(section, covered);
      }
      hits.set(docId, hit);
    }
  }
  const results: TermHit[] = [...hits].map(([docId, hit]) => {
    const document = index.documents[docId];
    const exactTitle = termWords(query).map(words => words[0]).join(' ') === termWords(document.title).map(words => words[0]).join(' ');
    const sectionId = exactTitle ? undefined : [...hit.sections].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0];
    const prior = document.type === 'changelog-entry' && !history ? options.changelogPrior ?? 0.5 : 1;
    return { document, coverage: hit.units.size / requested.length, score: hit.score * prior, ...(sectionId !== undefined ? { section: document.headings[sectionId], sectionComplete: hit.sectionUnits.get(sectionId)?.size === requested.length } : {}) };
  });
  const complete = results.filter(hit => hit.coverage === 1);
  // Keep strong near-complete subjects in contention. Expanding body coverage
  // must not let one incidental all-word match hide the topic's entry point.
  const titleKey = termWords(query).map(words => words[0]).join(' ');
  const exact = (hit: TermHit) => titleKey === termWords(hit.document.title).map(words => words[0]).join(' ');
  const pool = complete.length && requested.length >= 3
    ? results.filter(hit => hit.coverage >= (requested.length - 1) / requested.length)
    : complete.length ? complete : results;
  const ranked = pool.sort((a, b) => Number(exact(b)) - Number(exact(a)) || b.score * b.coverage ** 2 - a.score * a.coverage ** 2 || b.coverage - a.coverage || a.document.id.localeCompare(b.document.id));
  const selectedResults = ranked.slice(0, limit);
  return { total: ranked.length, matchMode: complete.length ? selectedResults.some(hit => hit.coverage < 1) ? 'mixed' : 'all' : 'partial', results: selectedResults, ...(corrections.size ? { correction: [...corrections].map(([from, to]) => `${from} → ${to}`).join(', ') } : {}) };

}

export const isLiteralQueryCandidate = (query: string) => !/\s/.test(query.trim()) && /[a-z][A-Z]|[.$@:/_]|--/.test(query);
export function literalTermSearch(index: TermIndex, query: string, options: Parameters<typeof searchTerms>[2]) {
  if (!isLiteralQueryCandidate(query)) return;
  const found = searchTerms(index, query.trim(), options);
  const key = query.trim().toLocaleLowerCase();
  const strict = /^(?:--[A-Za-z][\w-]*|[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+|[\w$]*[_$][\w$]*)$/.test(query.trim());
  if (strict || found.matchMode === 'all' && found.results.some(({ document, section }) => document.title.toLocaleLowerCase() === key || section?.title.toLocaleLowerCase() === key || section?.title.toLocaleLowerCase().endsWith('.' + key))) return found;
}
