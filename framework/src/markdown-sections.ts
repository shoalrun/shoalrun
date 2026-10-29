import { createHash } from 'node:crypto';
import { markdownSize } from './markdown-size.js';
import { link, list, paragraph, renderMarkdown, root, text } from './semantic-markdown.js';
import { validateStandaloneSections, type StandaloneSectionDeclaration } from './section-identity.js';

export type MarkdownSection = {
  id: string; title: string; depth: 2; standalone?: true; markdownUrl: string;
  parentMarkdownUrl: string; parentDigest: string; digest: string;
  markdownBytes: number; markdownTokens: number; markdownTokenEncoding: string;
  content: string;
};
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
type ReadingLink = { id: string; type: 'prerequisite' | 'next-step'; title: string; url: string; reason: string; status?: string };
const pathKey = (item: ReadingLink) => `${item.type}:${item.id}`;
// Only direct page children qualify: hoisting a view from a ReaderSection, tab,
// representation-only block, or another nested scope would change its meaning.
const readingPaths = (nodes: any[]): ReadingLink[] => nodes.flatMap(node => node.data?.sectionReadingPath ?? []);
function missingReadingPath(all: any[], included: any[]): any[] {
  const seen = new Set(readingPaths(included).map(pathKey));
  const missing = readingPaths(all).filter(item => {
    const key = pathKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (!missing.length) return [];
  return [paragraph({ type: 'strong', children: [text('Page reading path')] }, text(' — these links apply to the full page.')),
    ...(['prerequisite', 'next-step'] as const).flatMap(type => {
      const entries = missing.filter(item => item.type === type);
      return entries.length ? [paragraph({ type: 'strong', children: [text(type === 'prerequisite' ? 'Read first' : 'Next steps')] }),
        list(entries.map(item => [paragraph(link(item.url, item.title), text(` — ${item.reason}`), ...(item.status ? [text(` (Status: ${item.status}.)`)] : []))]))] : [];
    })];
}
const textOf = (node: any): string => typeof node.value === 'string' ? node.value : (node.children ?? []).map(textOf).join('');

// Split the semantic root, never the flattened Markdown: a reader section or tab
// remains intact even when it contains headings. Nested headings are not resources.
export function markdownSections(tree: any, markdownUrl: string, parent: string, prefix: string, render: (tree: any) => string, declarations: StandaloneSectionDeclaration[] = []): MarkdownSection[] {
  const parentSize = markdownSize(parent);
  const children: any[] = tree.children ?? [];
  const identities = validateStandaloneSections(tree, declarations, markdownUrl);
  const starts = identities.map(section => section.start);
  // Check declarations even on short pages: a renamed or ambiguous heading must
  // never silently retain an author's approval. Titles refer to normalized text.
  if (parentSize.markdownTokens < 2000) return [];
  const preamble = children.slice(0, starts[0] ?? 0);
  return identities.map(({ start, end, id, title }) => {
    const nodes = [...preamble, ...children.slice(start, end)].filter(node => !['definition', 'footnoteDefinition'].includes(node.type));
    const definitions = children.filter(node => ['definition', 'footnoteDefinition'].includes(node.type));
    const content = prefix + renderMarkdown(root([paragraph(text('Parent page: '), link(markdownUrl, 'Full Markdown page'))])) + '\n'
      + render(root([...missingReadingPath(children, nodes), ...nodes, ...definitions]));
    const standalone = declarations.some(item => typeof item === 'string' ? item === title : item.id === id);
    return { id, title, depth: 2 as const, ...(standalone ? { standalone: true as const } : {}), markdownUrl: `${markdownUrl.slice(0, -3)}.sections/${id}.md`, parentMarkdownUrl: markdownUrl,
      parentDigest: digest(parent), digest: digest(content), ...markdownSize(content), content };
  }).filter(section => section.markdownTokens <= parentSize.markdownTokens / 2 && section.markdownBytes <= parentSize.markdownBytes / 2);
}
