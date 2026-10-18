export type SynonymGroups = string[][];
export type QueryUnit = { term: string; alternatives: string[] };

// Groups are project data; normalize spacing so a phrase has one stable spelling in every index.
export function validateSearchSynonyms(value: unknown): SynonymGroups {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error('search.synonyms must be a list of term groups');
  const used = new Set<string>();
  return value.map((group, index) => {
    if (!Array.isArray(group) || group.length < 2) throw new Error(`search.synonyms[${index}] needs at least two terms`);
    return group.map((term: unknown) => {
      if (typeof term !== 'string' || !/^[\p{L}\p{N}]+(?:\s+[\p{L}\p{N}]+)*$/u.test(term.trim())) throw new Error(`search.synonyms[${index}] accepts words or phrases of words only`);
      const normalized = term.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
      if (used.has(normalized)) throw new Error(`Duplicate search synonym ${normalized}`);
      used.add(normalized);
      return normalized;
    });
  });
}

// Match complete words, allowing whitespace within a phrase and a plain English final plural.
export function phraseMatches(value: string, phrase: string): boolean {
  const escaped = phrase.split(' ').map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+');
  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}s?(?![\\p{L}\\p{N}])`, 'iu').test(value);
}

export function queryUnits(query: string, groups: SynonymGroups): QueryUnit[] {
  const words = query.toLocaleLowerCase().split(/\s+/).map(word => word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')).filter(Boolean);
  const entries = groups.flatMap(group => group.map(term => ({ term, group, words: term.split(' ') }))).sort((a, b) => b.words.length - a.words.length);
  const units: QueryUnit[] = [];
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
