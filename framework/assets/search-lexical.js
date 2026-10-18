// Built-in search provider: case-insensitive word and phrase matching over /search-index.json.
// Any provider module exports the same search(query, context) function; prepare(context) is optional.
let builtIndex = null;

const fallbackStopWords = new Set('a an the i me my we our you your how do does can could would should will is are was were be to of in on for with please what where when why which some any each several'.split(' '));

function phraseMatches(value, phrase) {
  const escaped = phrase.split(' ').map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+');
  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}s?(?![\\p{L}\\p{N}])`, 'iu').test(value);
}

function queryUnits(query, groups) {
  const words = query.toLocaleLowerCase().split(/\s+/).map(word => word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')).filter(Boolean);
  const entries = groups.flatMap(group => group.map(term => ({ term, group, words: term.split(' ') }))).sort((a, b) => b.words.length - a.words.length);
  const units = [];
  for (let at = 0; at < words.length;) {
    const found = entries.find(entry => entry.words.every((word, offset) => {
      const actual = words[at + offset];
      return actual === word || (offset === entry.words.length - 1 && actual === `${word}s`);
    }));
    if (found) {
      units.push({ term: words.slice(at, at + found.words.length).join(' '), alternatives: found.group.filter(term => term !== found.term) });
      at += found.words.length;
    } else {
      units.push({ term: words[at], alternatives: [] });
      at++;
    }
  }
  return units;
}

export async function prepare({ variant, indexUrl, signal }) {
  builtIndex ??= fetch(indexUrl, { signal })
    .then(response => response.ok ? response.json() : { documents: [] })
    .catch(error => { builtIndex = null; throw error; });
  const index = await builtIndex;
  return { documents: index.documents.filter(doc => doc.variant === variant), synonyms: index.synonyms ?? [] };
}

// Every term must appear on the page; titles outrank summaries, headings, and body text.
export async function search(query, context) {
  const { documents: pages, synonyms } = await prepare(context);
  const selected = context.readerSelection ?? {};
  const filtered = Object.keys(selected).length > 0;
  const matches = required => Object.entries(required ?? {}).every(([facet, values]) => !selected[facet]?.length || values.some(value => selected[facet].includes(value)));
  const terms = queryUnits(query, synonyms);
  if (!terms.length) return [];
  const match = (value, unit) => phraseMatches(value, unit.term) || unit.alternatives.some(term => phraseMatches(value, term));
  const weight = (value, unit, score) => phraseMatches(value, unit.term) ? score : unit.alternatives.some(term => phraseMatches(value, term)) ? score * 0.5 : 0;
  const hits = [];
  for (const doc of pages) {
    if (filtered && !matches(doc.readerFilters)) continue;
    const title = doc.title.toLocaleLowerCase();
    const summary = doc.summary.toLocaleLowerCase();
    const text = (filtered && doc.readerSegments ? doc.readerSegments.filter(segment => matches(segment.filters)).map(segment => segment.text).join(' ') : doc.text).toLocaleLowerCase();
    const headings = filtered ? [] : doc.headings.map(heading => heading.title.toLocaleLowerCase());
    const matched = terms.filter(term => match(title, term) || match(summary, term) || match(text, term) || headings.some(heading => match(heading, term)));
    if (!matched.length) continue;
    let score = 0;
    for (const term of terms) score += weight(title, term, title.startsWith(term.term) ? 12 : 8) || weight(summary, term, 4) || (headings.some(heading => match(heading, term)) ? 3 : 0) || weight(text, term, 1);
    const section = filtered || terms.every(term => match(title, term)) ? undefined : doc.headings.find((heading, index) => terms.every(term => match(headings[index], term)));
    hits.push({ score, matched: matched.length, partialMatched: matched.filter(term => !fallbackStopWords.has(term.term)).length, result: { url: section ? `${doc.url}#${section.id}` : doc.url, title: doc.title, summary: doc.summary, section: section?.title } });
  }
  const complete = hits.filter(hit => hit.matched === terms.length);
  return (complete.length ? complete : hits.filter(hit => hit.partialMatched > 0)).sort((a, b) => (complete.length ? b.matched - a.matched : b.partialMatched - a.partialMatched) || b.score - a.score || a.result.title.localeCompare(b.result.title)).slice(0, context.limit).map(hit => hit.result);
}
