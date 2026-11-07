import { publicationKey } from './publication-identity.js';
import { parseFragment } from 'parse5';
import { buildTermIndex, type Marks, type TermDocument, type TermField } from './search-terms.js';
import type { Document } from './content-source.js';

/** Compile already-filtered HTML, never source or Markdown-only content. */
export function compileSearchTerms(pages: Array<{ doc: Document; html: string; htmlTree?: unknown }>, records: TermDocument[], synonyms: string[][]) {
  const fields: TermField[] = [];
  const byId = new Map(records.map((doc, at) => [`${doc.variant}:${doc.id}`, at]));
  for (const page of pages) {
    const variant = publicationKey(page.doc.variant);
    const document = byId.get(`${variant}:${page.doc.frontmatter.id}`);
    if (document === undefined) throw new Error('Missing precompiled search document');
    const record = records[document];
    fields.push({ document, kind: 0, text: record.title }, { document, kind: 1, text: record.summary });
    if (record.releaseVersion) fields.push({ document, kind: 0, text: record.releaseVersion });
    const bodies = new Map<string, { filters: Marks[]; section?: number; words: string[] }>();
    let section: number | undefined;
    const attr = (node: any, name: string) => node.attrs?.find((attr: any) => attr.name === name)?.value;
    const text = (node: any): string => node.nodeName === '#text' ? node.value : (node.childNodes ?? []).map(text).join('');
    const add = (value: string, filters: Marks[]) => {
      const key = JSON.stringify([section ?? -1, filters]);
      const body: { filters: Marks[]; section?: number; words: string[] } = bodies.get(key) ?? { filters, section, words: [] };
      body.words.push(value); bodies.set(key, body);
    };
    const visit = (node: any, inherited: Marks[]) => {
      if (['script', 'style', 'template'].includes(node.tagName)) return;
      const raw = attr(node, 'data-reader-filters');
      const filters = raw === undefined ? inherited : [...inherited, JSON.parse(raw)];
      const previous = section;
      if (/^h[2-4]$/.test(node.tagName ?? '')) {
        const id = attr(node, 'id');
        section = id === undefined ? undefined : record.headings.findIndex(heading => heading.id === id);
        if (section !== undefined && section < 0) throw new Error(`Search heading inventory differs for ${record.id}: ${id}`);
        fields.push({ document, kind: 2, section, filters, text: text(node) });
      } else {
        const block = /^(p|div|section|pre|li|td|th|tr|blockquote|h[1-6]|br|ul|ol|dl|dt|dd)$/.test(node.tagName ?? '');
        if (block) add(' ', filters);
        if (node.nodeName === '#text') add(node.value, filters);
        for (const child of node.childNodes ?? []) visit(child, filters);
        if (block) add(' ', filters);
      }
      // A hidden section heading must not label shared prose after its wrapper.
      if (raw !== undefined) section = previous;
    };
    const article = page.html.match(/<article>([^]*)<\/article>/)?.[1];
    if (article === undefined) throw new Error(`Missing search article for ${record.id}`);
    visit(parseFragment(article), []);
    for (const body of bodies.values()) fields.push({ document, kind: 3, section: body.section, filters: body.filters, text: body.words.join('') });
  }
  return buildTermIndex(records, fields, synonyms);
}
