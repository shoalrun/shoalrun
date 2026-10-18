import { createHash } from 'node:crypto';
import { markdownSize } from './markdown-size.js';
import { link, list, paragraph, renderMarkdown, root, text } from './semantic-markdown.js';

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
export function markdownSections(tree: any, markdownUrl: string, parent: string, prefix: string, render: (tree: any) => string, standaloneTitles: string[] = []): MarkdownSection[] {
  const parentSize = markdownSize(parent);
  const children: any[] = tree.children ?? [];
  const starts = children.flatMap((node, index) => node.type === 'heading' && node.depth === 2 ? [index] : []);
  // Check declarations even on short pages: a renamed or ambiguous heading must
  // never silently retain an author's approval. Titles refer to normalized text.
  for (const title of standaloneTitles) {
    if (starts.filter(start => textOf(children[start]).trim() === title).length !== 1) {
      throw new Error(`${markdownUrl}: standaloneSections title "${title}" must match exactly one top-level level-two heading`);
    }
  }
  if (parentSize.markdownTokens < 2000) return [];
  const preamble = children.slice(0, starts[0] ?? 0);
  const used = new Set<string>();
  return starts.map(start => {
    const title = textOf(children[start]).trim();
    const stem = title.normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80).replace(/-$/, '') || 'section';
    let id = stem;
    for (let suffix = 2; used.has(id); suffix++) id = `${stem}-${suffix}`;
    used.add(id);
    const end = children.findIndex((node, position) => position > start && node.type === 'heading' && node.depth <= 2);
    const nodes = [...preamble, ...children.slice(start, end === -1 ? children.length : end)].filter(node => !['definition', 'footnoteDefinition'].includes(node.type));
    const definitions = children.filter(node => ['definition', 'footnoteDefinition'].includes(node.type));
    const content = prefix + renderMarkdown(root([paragraph(text('Parent page: '), link(markdownUrl, 'Full Markdown page'))])) + '\n'
      + render(root([...missingReadingPath(children, nodes), ...nodes, ...definitions]));
    return { id, title, depth: 2 as const, ...(standaloneTitles.includes(title) ? { standalone: true as const } : {}), markdownUrl: `${markdownUrl.slice(0, -3)}.sections/${id}.md`, parentMarkdownUrl: markdownUrl,
      parentDigest: digest(parent), digest: digest(content), ...markdownSize(content), content };
  }).filter(section => section.markdownTokens <= parentSize.markdownTokens / 2 && section.markdownBytes <= parentSize.markdownBytes / 2);
}
