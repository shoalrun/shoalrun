import { parseFragment } from 'parse5';
import { renderHtmlWithHeadings } from './html-renderer.js';

/** Expanded snippets may share nodes; give every authored occurrence its own identity. */
export function isolateExportTree(value: any): any {
  if (Array.isArray(value)) return value.map(isolateExportTree);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, isolateExportTree(item)]));
  return value;
}

/** Stable internal provenance survives cloning, slicing, and portable lowering. */
export function markExportSource(tree: any): void {
  let index = 0;
  const walk = (node: any) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (typeof node.type === 'string') node.data = { ...node.data, exportSourceKey: `source-${index++}` };
    for (const [key, value] of Object.entries(node)) if (!['data', 'position'].includes(key)) walk(value);
  };
  walk(tree);
}

/** Map semantic heading provenance to the actual IDs assigned by the renderer. */
export function exportHeadingInventory(tree: any, reservedIds: Iterable<string> = []): { headings: Map<string, string>; ids: Set<string> } {
  const copy = structuredClone(tree);
  const mark = (node: any) => {
    if (node.data?.exportSourceKey) node.data.hProperties = { ...node.data.hProperties, 'data-export-source-key': node.data.exportSourceKey };
    for (const child of node.children ?? []) mark(child);
  };
  mark(copy);
  const parsed: any = parseFragment(renderHtmlWithHeadings(copy, undefined, reservedIds).html);
  const headings = new Map<string, string>();
  const ids = new Set<string>();
  const visit = (node: any) => {
    const id = node.attrs?.find((attr: any) => attr.name === 'id')?.value;
    if (id) {
      ids.add(id);
      const key = node.attrs?.find((attr: any) => attr.name === 'data-export-source-key')?.value;
      if (/^h[2-6]$/.test(node.tagName ?? '') && key) headings.set(key, id);
    }
    for (const child of node.childNodes ?? []) visit(child);
  };
  visit(parsed);
  return { headings, ids };
}

/** HTML keeps source IDs; Markdown keeps clean headings and maps source to local IDs. */
export function preserveExportHeadingIds(tree: any, source: ReturnType<typeof exportHeadingInventory>, format: 'html' | 'markdown'): Map<string, string> {
  const local = exportHeadingInventory(tree);
  const aliases = new Map<string, string>();
  const walk = (node: any) => {
    const key = node.data?.exportSourceKey;
    if (key && (node.type === 'heading' || /^h[2-6]$/.test(node.data?.hName ?? '')) && local.headings.has(key)) {
      const original = source.headings.get(key);
      if (!original) throw new Error('Cannot determine full-source identity for an exported heading');
      aliases.set(original, format === 'html' ? original : local.headings.get(key)!);
      if (format === 'html') node.data.hProperties = { ...node.data.hProperties, id: original };
    }
    for (const child of node.children ?? []) walk(child);
  };
  walk(tree);
  // Non-heading anchors (explicit aliases, footnotes, component IDs) retain IDs.
  for (const id of local.ids) if (!Array.from(local.headings.values()).includes(id) && source.ids.has(id)) aliases.set(id, id);
  return aliases;
}
