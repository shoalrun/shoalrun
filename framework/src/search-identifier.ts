import type { Hit } from './retrieval.js';
import { searchParagraphs } from './search-snippet.js';

// Reserve at most one search-box result for a literal configuration key or flag
// explained in prose. Tables, code listings and identifier prefixes do not qualify.
export function searchIdentifiers(query: string): string[] {
  const identifiers = query.match(/\b[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+\b|--[a-z][\w-]*/g) ?? [];
  // File names and URLs need ordinary retrieval, not a config-key shortcut.
  return [...new Set(identifiers.filter(id => !/\.(?:txt|json|ya?ml|mdx?|[cm]?js|tsx?|html?|css|svg|png|jpe?g|com|org|net)$/i.test(id)))];
}
export function identifierRescue(query: string, semantic: Hit[], lexical: Hit[]): Hit[] {
  const identifiers = searchIdentifiers(query);
  if (!identifiers.length) return semantic;
  const matches = identifiers.map(id => new RegExp(`(?<![\\w$.-])${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w$-]|\\.[\\w$])`, 'i'));
  const candidate = lexical.find(hit => (hit.chunk.search?.paragraphs ?? searchParagraphs(hit.chunk.text)).some(p => matches.every(re => re.test(p))));
  if (!candidate) return semantic;
  const pages = [...new Set(semantic.map(h => h.chunk.docId))];
  if (pages.slice(0, 3).includes(candidate.chunk.docId)) return semantic;
  const remaining = semantic.filter(h => h.chunk.docId !== candidate.chunk.docId);
  const seen = new Set<string>();
  const at = remaining.findIndex(hit => { seen.add(hit.chunk.docId); return seen.size === 3; });
  const position = at < 0 ? remaining.length : at;
  return [...remaining.slice(0, position), candidate, ...remaining.slice(position)];
}
