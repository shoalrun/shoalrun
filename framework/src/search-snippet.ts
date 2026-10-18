import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';

type Node = { type: string; value?: string; children?: Node[] };
const parser = unified().use(remarkParse).use(remarkGfm);

function inline(node: Node): string {
  if (node.type === 'text' || node.type === 'inlineCode') return node.value ?? '';
  if (['code', 'html', 'image', 'imageReference', 'table'].includes(node.type)) return '';
  return (node.children ?? []).map(inline).join('');
}

function paragraphs(node: Node): string[] {
  if (node.type === 'paragraph') return [inline(node).replace(/\s+/g, ' ').trim()].filter(Boolean);
  if (['code', 'html', 'table'].includes(node.type)) return [];
  return (node.children ?? []).flatMap(paragraphs);
}

// Visible prose only: ignore code, tables, image labels, and link destinations.
export function searchParagraphs(markdown: string): string[] {
  try { return paragraphs(parser.parse(markdown) as Node); } catch { return []; }
}
const discovery = /^(?:Documentation index:|Document manifest:|Navigation section:|Breadcrumbs:|Updated:|Verified:|Published:)/i;

// Link-led lists describe destinations, rather than the page containing them.
// Do not let related-reading lists become evidence that their host page answers a query.
function passageParagraphs(node: Node): string[] {
  if (node.type === 'list' && (node.children ?? []).every(item => item.children?.[0]?.children?.[0]?.type === 'link')) return [];
  if (node.type === 'paragraph') return paragraphs(node).filter(text => !discovery.test(text));
  if (['code', 'html', 'table'].includes(node.type)) return [];
  return (node.children ?? []).flatMap(passageParagraphs);
}
export function searchPassageParagraphs(markdown: string): string[] {
  try { return passageParagraphs(parser.parse(markdown) as Node); } catch { return []; }
}

// Literal lookups may use visible table rows and code lines. Link destinations,
// HTML, and surrounding Markdown syntax never become result descriptions.
function literalLines(node: Node): string[] {
  if (node.type === 'code') return (node.value ?? '').split('\n');
  if (node.type === 'tableRow') return [(node.children ?? []).map(inline).join(' — ')];
  if (['html', 'image'].includes(node.type)) return [];
  return (node.children ?? []).flatMap(literalLines);
}
const cleanLines = (lines: string[]) => lines.map(line => line.replace(/\s+/g, ' ').trim()).filter(Boolean);
export function searchLiteralLines(markdown: string): string[] {
  try { return cleanLines(literalLines(parser.parse(markdown) as Node)); } catch { return []; }
}

export type PreparedSearchPassage = { schemaVersion: 1; paragraphs: string[]; literalLines: string[] };

// Derived once while building chunks.json, never while answering a search.
// This metadata is not embedded and does not change passage digests.
export function prepareSearchPassage(markdown: string): PreparedSearchPassage {
  const tree = parser.parse(markdown) as Node;
  return { schemaVersion: 1, paragraphs: passageParagraphs(tree), literalLines: cleanLines(literalLines(tree)) };
}
const stopWords = new Set('a an the i me my we our you your how do does can could would should will is are was were be to of in on for with please what where when why which and or it this that have has after before'.split(' '));

// Prefer substantive query matches; Markdown boilerplate and common question words
// must not hide a useful paragraph. Keep a matching term visible in long paragraphs.
export function searchSnippet(markdown: string, query: string, pageSummary = ''): string {
  const choices = searchParagraphs(markdown).filter(p => !discovery.test(p));
  return searchSnippetFromParagraphs(choices, query, pageSummary);
}

export function searchSnippetFromParagraphs(choices: string[], query: string, pageSummary = ''): string {
  const terms = [...new Set((query.toLocaleLowerCase().match(/[\p{L}\p{N}_$.-]+/gu) ?? []).map(t => t.replace(/^[.-]+|[.-]+$/g, '')).filter(t => t && !stopWords.has(t)))];
  const matches = (text: string) => terms.filter(term => new RegExp(`(?<![\\p{L}\\p{N}_])${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}_])`, 'iu').test(text));
  const ranked = choices.map((text, at) => ({ text, at, terms: matches(text) })).sort((a, b) => b.terms.length - a.terms.length || a.at - b.at);
  const selected = ranked[0];
  const text = (selected?.text ?? pageSummary).replace(/\s+/g, ' ').trim();
  if (text.length <= 180) return text;
  const first = selected?.terms.length ? Math.min(...selected.terms.map(t => text.toLocaleLowerCase().indexOf(t))) : 0;
  const start = Math.max(0, first - 50);
  const length = 180 - (start ? 1 : 0) - 1;
  return `${start ? '…' : ''}${text.slice(start, start + length).trim()}…`;
}
