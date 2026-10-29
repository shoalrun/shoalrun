import { parse } from './semantic-markdown.js';
import type { ValidationFinding } from './authoring-findings.js';

const text = (node: any): string => typeof node.value === 'string' ? node.value : (node.children ?? []).map(text).join('');
const contains = (node: any, predicate: (node: any) => boolean): boolean => predicate(node) || (node.children ?? []).some((child: any) => contains(child, predicate));

/** Suggestions only: the author decides whether native relationships fit the links. */
export function authoringHints(body: string, file: string): ValidationFinding[] {
  let tree: any;
  try { tree = parse.parse(body); } catch { return []; } // Compilation reports syntax errors.
  if (contains(tree, node => node.name === 'RelatedReading')) return [];
  const nodes = tree.children ?? [];
  const definitions = new Map<string, string>();
  contains(tree, node => { if (node.type === 'definition') definitions.set(node.identifier, node.url); return false; });
  const documentLink = (node: any) => node.type === 'link' && node.url?.startsWith('doc:') || node.type === 'linkReference' && definitions.get(node.identifier)?.startsWith('doc:');
  for (let index = 0; index < nodes.length; index++) {
    const heading = nodes[index];
    if (heading.type !== 'heading' || !/^related (reading|materials?)$/i.test(text(heading).trim())) continue;
    let end = index + 1;
    while (end < nodes.length && !(nodes[end].type === 'heading' && nodes[end].depth <= heading.depth)) end++;
    if (!nodes.slice(index + 1, end).some((node: any) => contains(node, documentLink))) continue;
    return [{ code: 'authoring.related-reading', severity: 'warning', file,
      explanation: 'This page has a related-reading or related-material section with document links. Native relationships and RelatedReading may suit these connections.',
      reference: 'guide.related-reading',
      nextAction: 'Read guide.related-reading and guide.component.related-reading. Inspect the purpose and reason for each connection before choosing native relationships; keep manual links when they better fit the page.' }];
  }
  return [];
}
