import { unified } from 'unified';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { highlightCode, type CodeHighlighter } from './highlight.js';
import { walkthroughCode } from './walkthrough.js';

export function renderHtmlWithHeadings(tree: any, highlighter?: CodeHighlighter, reservedIds: Iterable<string> = []): { html: string; headings: Array<{ depth: number; id: string; title: string }> } {
  const math = new Map<string, string>();
  const collectMath = (node: any) => {
    if (node.data?.mathMarkup) math.set(node.value, node.data.mathMarkup);
    node.children?.forEach(collectMath);
  };
  collectMath(tree);
  const html = unified().use(remarkRehype).use(highlightCode, highlighter).use(walkthroughCode).use(rehypeStringify);
  const hast: any = html.runSync(tree);
  const used = new Set<string>(reservedIds);
  const headings: Array<{ depth: number; id: string; title: string }> = [];
  const aliases = new Map<any, string>();
  const textOf = (node: any): string => node.type === 'text' ? node.value : (node.children ?? []).map(textOf).join('');
  const checkUrl = (value: unknown) => {
    if (typeof value !== 'string') return;
    const protocol = new URL(value, 'https://shoalrun.invalid/').protocol;
    if (!['https:', 'http:', 'mailto:'].includes(protocol)) throw new Error(`Unsafe URL in rendered content: ${value}`);
  };
  const collectIds = (node: any) => {
    if (node.tagName === 'a') checkUrl(node.properties?.href);
    if (node.tagName === 'img') checkUrl(node.properties?.src);
    if (typeof node.properties?.id === 'string') used.add(node.properties.id);
    node.children?.forEach(collectIds);
  };
  collectIds(hast);
  const visit = (node: any) => {
    const sectionId = node.properties?.['data-shoalrun-section-id'] ?? node.properties?.dataShoalrunSectionId;
    if (node.properties) {
      delete node.properties['data-shoalrun-section-id'];
      delete node.properties.dataShoalrunSectionId;
    }
    const match = /^h([2-6])$/.exec(node.tagName ?? '');
    if (match && !node.properties?.className?.some((name: string) => ['tab-fallback-heading', 'walkthrough-step-title'].includes(name))) {
      const title = textOf(node).trim();
      const depth = Number(match[1]);
      if (title) {
        let id = node.properties?.id;
        if (typeof id !== 'string' || !id) {
          const stem = title.normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section';
          id = stem;
          for (let suffix = 2; used.has(id); suffix++) id = `${stem}-${suffix}`;
          node.properties = { ...node.properties, id };
          used.add(id);
        }
        if (!node.properties?.className?.includes('doc-step-heading-toc-ignore')) headings.push({ depth, id, title });
        if (typeof sectionId === 'string' && sectionId !== id) aliases.set(node, sectionId);
      }
    }
    node.children?.forEach(visit);
  };
  visit(hast);
  // Preserve existing heading-derived URLs. Explicit identities add aliases,
  // rather than reserving names early and renumbering unrelated headings.
  for (const id of aliases.values()) {
    if (used.has(id)) throw new Error(`Explicit section ID ${id} conflicts with an existing HTML anchor`);
    used.add(id);
  }
  const addAliases = (node: any) => {
    if (!node.children) return;
    node.children = node.children.flatMap((child: any) => {
      addAliases(child);
      const id = aliases.get(child);
      return id ? [{ type: 'element', tagName: 'span', properties: { id, ariaHidden: 'true' }, children: [] }, child] : [child];
    });
  };
  addAliases(hast);
  let rendered = String(html.stringify(hast));
  for (const [marker, markup] of math) rendered = rendered.replaceAll(marker, markup);
  return { html: rendered, headings };
}
export function renderHtml(tree: any, highlighter?: CodeHighlighter): string { return renderHtmlWithHeadings(tree, highlighter).html; }
