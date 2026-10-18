import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';
import remarkGfm from 'remark-gfm';
import remarkStringify from 'remark-stringify';

export const parse = unified().use(remarkParse).use(remarkGfm).use(remarkMdx);
const plainMarkdown = unified().use(remarkParse).use(remarkGfm);
export function parsePlainMarkdown(value: string): any[] {
  // OpenAPI prose may contain raw HTML. It is inert in our HTML renderer, but
  // passing the node through to a Markdown twin would publish active markup.
  const stripHtml = (node: any): any[] => node.type === 'html' ? [] : [{ ...node, ...(node.children ? { children: node.children.flatMap(stripHtml) } : {}) }];
  return (plainMarkdown.parse(value) as any).children.flatMap(stripHtml);
}
const markdown = unified().use(remarkStringify, { bullet: '-', fences: true }).use(remarkGfm);

export function text(value: string): any { return { type: 'text', value }; }
export function paragraph(...children: any[]): any { return { type: 'paragraph', children }; }
export function heading(depth: number, value: string): any { return { type: 'heading', depth, children: [text(value)] }; }
export function list(items: any[][]): any { return { type: 'list', ordered: false, children: items.map(children => {
  const properties = children[0]?.data?.hProperties;
  if (!properties?.id) return { type: 'listItem', spread: false, children };
  const first = { ...children[0], data: { ...children[0].data, hProperties: undefined } };
  return { type: 'listItem', spread: true, children: [first, ...children.slice(1)], data: { hProperties: properties } };
}) }; }
export function link(url: string, value: string): any { return { type: 'link', url, children: [text(value)] }; }
export function code(value: string, lang?: string): any { return { type: 'code', lang, value }; }
export function root(children: any[]): any { return { type: 'root', children }; }
export function renderMarkdown(tree: any): string {
  const flatten = (node: any): any[] => {
    if (node.type === 'docApiPathHint') return [];
    if (['docApiParameter', 'docApiDisclosure', 'docApiVariant', 'docApiInfoCard', 'docApiInfoCards', 'docApiResponse', 'docApiResponseHeader'].includes(node.type)) return node.children.flatMap(flatten);
    return [node.children ? { ...node, children: node.children.flatMap(flatten) } : node];
  };
  return String(markdown.stringify({ ...tree, children: tree.children.flatMap(flatten) }));
}
