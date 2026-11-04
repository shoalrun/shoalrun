import type { Hit } from './retrieval.js';

// Reserve at most one search-box result for a literal configuration key or flag
// explained in prose. Tables, code listings and identifier prefixes do not qualify.
export function searchIdentifiers(query: string): string[] {
  const identifiers = query.match(/\b[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+\b|--[a-z][\w-]*/g) ?? [];
  // File names and URLs need ordinary retrieval, not a config-key shortcut.
  return [...new Set(identifiers.filter(id => !/\.(?:txt|json|ya?ml|mdx?|[cm]?js|tsx?|html?|css|svg|png|jpe?g|com|org|net)$/i.test(id)))];
}
export function identifierRescue<T extends Hit>(query: string, semantic: T[], lexical: T[], paragraphs?: (hit: Hit) => string[]): T[] {
  const matches = identifierMatch(query, paragraphs);
  if (!matches) return semantic;
  const candidate = lexical.find(matches);
  if (!candidate) return semantic;
  const pages = [...new Set(semantic.map(h => h.chunk.docId))];
  if (pages.slice(0, 3).includes(candidate.chunk.docId)) return semantic;
  const remaining = semantic.filter(h => h.chunk.docId !== candidate.chunk.docId);
  const seen = new Set<string>();
  const at = remaining.findIndex(hit => { seen.add(hit.chunk.docId); return seen.size === 3; });
  const position = at < 0 ? remaining.length : at;
  return [...remaining.slice(0, position), candidate, ...remaining.slice(position)];
}

export function identifierMatch(query: string, paragraphs: (hit: Hit) => string[] = hit => hit.chunk.search?.paragraphs ?? []): ((hit: Hit) => boolean) | undefined {
  const identifiers = searchIdentifiers(query);
  if (!identifiers.length) return undefined;
  const matches = identifiers.map(id => new RegExp(`(?<![\\w$.-])${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w$-]|\\.[\\w$])`, 'i'));
  return hit => paragraphs(hit).some(p => matches.every(re => re.test(p)));
}
