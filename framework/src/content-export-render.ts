import { parseFragment, serialize } from 'parse5';
import { publicTree } from './representation-tree.js';
import { renderHtmlWithHeadings } from './html-renderer.js';
import { heading, link, paragraph, root, text, renderMarkdown } from './content.js';
import { walkthroughMarkdown } from './walkthrough.js';
import type { ExportFormat } from './content-export-config.js';

/** Lower interactions while representation-specific source blocks still exist. */
export function portableTree(tree: any, format: ExportFormat, routes: Set<string>, basePath: string): any {
  // Provenance is internal export metadata. Keep it when component lowering
  // synthesizes headings so a slice can retain its full-source identities.
  const inherit = (node: any, key: string) => {
    if (!node || typeof node !== 'object') return;
    node.data = { ...node.data, exportSourceKey: node.data?.exportSourceKey ?? key };
    for (const [index, child] of (node.children ?? []).entries()) inherit(child, `${node.data.exportSourceKey}/${index}`);
  };
  const walk = (node: any): any[] => {
    const result = lower(node);
    if (node.data?.exportSourceKey) result.forEach((child, index) => inherit(child, `${node.data.exportSourceKey}:${index}`));
    return result;
  };
  const lower = (node: any): any[] => {
    if (node.type === 'docRepresentation') return node.representation === format ? node.children.flatMap(walk) : [];
    if (node.type === 'docComponent') return node.children.flatMap(walk);
    if (['docReaderFilter', 'docReaderChoice'].includes(node.type)) return [];
    if (node.type === 'docReaderSection') return [paragraph({ type: 'strong', children: [text(`For ${node.description}.`)] }), ...node.children.flatMap(walk)];
    if (node.type === 'docTabs') return node.children.flatMap((tab: any) => [heading(3, tab.label), ...tab.children.flatMap(walk)]);
    if (node.type === 'docWalkthrough') return walkthroughMarkdown(node, walk, { heading, paragraph, text });
    if (node.type === 'docCollapsible') return [heading(3, node.title), ...node.children.flatMap(walk)];
    if (['docTooltip', 'docInfoHint'].includes(node.type)) return [node.inline ? text(`${node.label} (${node.definition})`) : paragraph(text(`${node.label}: ${node.definition}`))];
    if (node.type === 'docMath') return [node.display ? { type: 'code', lang: 'latex', value: node.expression } : { type: 'inlineCode', value: node.expression }];
    if (node.type === 'docDiagram') return [paragraph({ type: 'image', url: node.url, alt: node.title }), paragraph(text(`${node.title}: ${node.summary}`)), ...(format === 'markdown' ? [{ type: 'code', lang: node.engine, value: node.source }] : [])];
    if (node.type === 'docCookbookChooser') return [paragraph(text(node.title)), ...node.options.flatMap((option: any) => [paragraph({ ...link(option.route, option.title), exportDocumentId: option.doc }), paragraph(text([option.when ?? option.summary, option.needs, option.outcome].filter(Boolean).join(' ')))])];
    if (node.type === 'docTable') return [{ ...node, filter: false, children: node.children.flatMap(walk) }];
    if (node.type === 'docDefinitionList') return [{ ...node, filter: false, items: node.items.map((item: any) => ({ ...item, term: item.term.flatMap(walk), definition: item.definition.flatMap(walk) })) }];
    if (node.type === 'docSteps' || node.type === 'docTimeline') return [{ ...node, items: node.items.map((item: any) => ({ ...item, children: item.children.flatMap(walk) })) }];
    return [{ ...node, ...(node.children ? { children: node.children.flatMap(walk) } : {}) }];
  };
  const lowered = publicTree(root((tree.children ?? []).flatMap(walk)), format, routes, 'light', basePath);
  const definitions = new Map<string, any>();
  const collectDefinitions = (node: any) => {
    if (node.type === 'definition') {
      const previous = definitions.get(node.identifier);
      if (previous && (previous.url !== node.url || previous.title !== node.title)) throw new Error(`Ambiguous export definition ${node.identifier}`);
      definitions.set(node.identifier, node);
    }
    for (const child of node.children ?? []) collectDefinitions(child);
  };
  collectDefinitions(lowered);
  const clean = (node: any): any => {
    if (node.data?.hName === 'svg' && node.data?.hProperties?.ariaHidden === 'true' && node.data?.hProperties?.['data-lucide']) return text('');
    if (node.type === 'linkReference' || node.type === 'imageReference') {
      const definition = definitions.get(node.identifier);
      if (!definition) throw new Error(`Missing export link definition ${node.identifier}`);
      node = { ...node, type: node.type === 'linkReference' ? 'link' : 'image', url: definition.url,
        ...(definition.title ? { title: definition.title } : {}), ...(definition.exportDocumentId ? { exportDocumentId: definition.exportDocumentId } : {}) };
    }
    // Browser-only data and injected SVG icons are not part of the content contract.
    const data = node.data ? { ...node.data } : undefined;
    if (data) { delete data.hChildren; delete data.mathMarkup; }
    return { ...node, ...(data ? { data } : {}), ...(node.children ? { children: node.children.filter((child: any) => child.type !== 'definition').map(clean) } : {}) };
  };
  return clean(lowered);
}

const tags = new Set('a abbr article b blockquote br caption code col colgroup dd del details div dl dt em figcaption figure h1 h2 h3 h4 h5 h6 hr i img input kbd li ol p pre progress s section small span strong sub summary sup table tbody td th thead time tr ul'.split(' '));
const attrs = new Set(['id', 'href', 'src', 'alt', 'title', 'colspan', 'rowspan', 'start', 'reversed', 'value', 'max', 'datetime', 'scope', 'align', 'type', 'checked', 'disabled', 'aria-label', 'aria-labelledby', 'aria-describedby', 'aria-hidden', 'role', 'tabindex', 'data-footnote-ref', 'data-footnote-backref', 'data-export-link']);
export function passiveHtml(tree: any, prefix: string, checkAnchors = true): { html: string; anchors: Array<{ id: string; exportedId: string; title?: string }> } {
  const rendered = renderHtmlWithHeadings(tree);
  const fragment: any = parseFragment(rendered.html);
  const anchors: Array<{ id: string; exportedId: string; title?: string }> = [];
  const ids = new Set<string>();
  const visit = (node: any) => {
    if (node.nodeName === '#text') return;
    if (node.tagName) {
      if (!tags.has(node.tagName)) throw new Error(`Unsupported passive HTML element <${node.tagName}>`);
      const original = node.attrs ?? [];
      for (const attr of original) {
        if (/^on/i.test(attr.name)) throw new Error('Event handlers are not allowed in exported HTML');
        if (['href', 'src'].includes(attr.name)) {
          const url = new URL(attr.value, 'https://export.invalid/');
          if (!['https:', 'http:', ...(attr.name === 'href' ? ['mailto:', 'tel:'] : [])].includes(url.protocol) || url.username || url.password) throw new Error(`Unsafe exported URL: ${attr.value}`);
        }
      }
      node.attrs = original.filter((attr: any) => attrs.has(attr.name));
      const id = node.attrs.find((attr: any) => attr.name === 'id');
      if (id) {
        if (ids.has(id.value)) throw new Error(`Duplicate exported anchor ${id.value}`);
        ids.add(id.value);
        const title = rendered.headings.find(heading => heading.id === id.value)?.title;
        anchors.push({ id: id.value, exportedId: `${prefix}-${id.value}`, ...(title ? { title } : {}) });
        id.value = `${prefix}-${id.value}`;
      }
      for (const attr of node.attrs) if (['aria-labelledby', 'aria-describedby'].includes(attr.name)) attr.value = attr.value.split(/\s+/).map((value: string) => `${prefix}-${value}`).join(' ');
      if (node.tagName === 'details') node.attrs.push({ name: 'open', value: '' });
      if (node.tagName === 'input') {
        if (original.find((attr: any) => attr.name === 'type')?.value !== 'checkbox') throw new Error('Only passive task-list checkboxes can be exported');
        node.attrs.push({ name: 'disabled', value: '' });
      }
    }
    for (const child of node.childNodes ?? []) visit(child);
  };
  for (const child of fragment.childNodes) visit(child);
  const references = (node: any) => {
    for (const attr of node.attrs ?? []) if (attr.name === 'href' && attr.value.startsWith('#')) {
      const fragmentId = decodeURIComponent(attr.value.slice(1));
      if (ids.has(fragmentId)) attr.value = `#${prefix}-${fragmentId}`;
      else if (checkAnchors && !anchors.some(anchor => anchor.exportedId === fragmentId)) throw new Error(`Missing local export anchor ${fragmentId}`);
    }
    for (const child of node.childNodes ?? []) references(child);
  };
  references(fragment);
  return { html: serialize(fragment) + '\n', anchors };
}
export function portableMarkdown(tree: any): string { return renderMarkdown(tree); }
