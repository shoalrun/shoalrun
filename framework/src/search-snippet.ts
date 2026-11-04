import { searchSnippetFromParagraphs } from './search-text.js';
export { searchSnippetFromParagraphs } from './search-text.js';
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
// Prefer substantive query matches; Markdown boilerplate and common question words
// must not hide a useful paragraph. Keep a matching term visible in long paragraphs.
export function searchSnippet(markdown: string, query: string, pageSummary = ''): string {
  const choices = searchParagraphs(markdown).filter(p => !discovery.test(p));
  return searchSnippetFromParagraphs(choices, query, pageSummary);
}
