import { fictionalDocument, resolveLlmsDiscovery } from './llms-discovery.js';
import YAML from 'yaml';
import { nativePublicFields, protectedMetadataRoots, publicFrontmatterPaths } from './frontmatter.js';
import { surfaceText } from './surface-text.js';
import type { ReaderSelection } from './reader-filters.js';

import type { Document, Frontmatter, Variant } from './content-source.js';
export type { Document, Frontmatter, NavigationNode, Variant } from './content-source.js';
export { readDocument, routeFor, markdownRoute } from './content-source.js';
export { parse, parsePlainMarkdown, text, paragraph, heading, list, link, code, root, renderMarkdown } from './semantic-markdown.js';
export { transformMdx } from './component-transform.js';
export { renderHtml } from './html-renderer.js';
export { buildHtmlPage, shareCardText, typeLabel } from './page-renderer.js';
export type { SiteLink, HeaderConfig, FooterConfig, PageShell } from './page-renderer.js';
// API separators are visually hidden punctuation; join them to the preceding text so search reads "integer; default: 0".
const variantKey = (variant: Variant) => `${variant.channel}|${variant.version}|${variant.language}`;
const plainText = (html: string) => html.replace(/<(script|style)[^]*?<\/\1>/g, ' ').replace(/(?:<\/[a-z]+>)?<span class="api-separator">([^<]*)<\/span>/g, '$1').replace(/<[^>]+>/g, ' ')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

// One compact record per published page; headings allow results to deep-link into a section.
export function searchIndex(pages: Array<{ doc: Document; html: string; htmlTree?: any }>, config: any = {}) {
  const discovery = resolveLlmsDiscovery(config.outputs?.llms);
  const readerSegments = (tree: any): Array<{ filters: ReaderSelection; text: string }> => {
    const parts = new Map<string, string[]>();
    const walk = (node: any, filters: ReaderSelection) => {
      if (!node) return;
      const local = node.data?.hProperties?.['data-reader-filters'];
      const next = typeof local === 'string' ? { ...filters, ...JSON.parse(local) } : filters;
      if (typeof node.value === 'string') {
        const key = JSON.stringify(next);
        const values = parts.get(key) ?? [];
        if (node.data?.hProperties?.className?.includes('api-separator') && values.length) values[values.length - 1] += node.value.trimEnd();
        else values.push(node.value);
        parts.set(key, values);
      }
      for (const child of node.children ?? []) walk(child, next);
    };
    walk(tree, {});
    return [...parts].map(([filters, words]) => ({ filters: JSON.parse(filters), text: words.join(' ').replace(/\s+/g, ' ').trim().slice(0, 5000) }));
  };
  return {
    schemaVersion: 1,
    ...(config.searchSynonyms?.length ? { synonyms: config.searchSynonyms } : {}),
    documents: pages.map(({ doc, html, htmlTree }) => {
      const article = html.match(/<article>([^]*)<\/article>/)?.[1] ?? '';
      const headings = [...article.matchAll(/<h([2-4])\b[^>]*?\bid="([^"]+)"[^>]*>([^]*?)<\/h\1>/g)].map(match => ({ id: match[2], title: plainText(match[3]) }));
      return { id: doc.frontmatter.id, demo: fictionalDocument(doc, discovery), url: doc.route, markdownUrl: doc.markdownRoute, title: doc.frontmatter.title, summary: surfaceText(doc.frontmatter, 'search', config) ?? '', type: doc.frontmatter.type, variant: variantKey(doc.variant), ...(doc.frontmatter.product !== undefined ? { product: doc.frontmatter.product } : {}), ...(doc.frontmatter.area !== undefined ? { area: doc.frontmatter.area } : {}), ...(doc.frontmatter.subarea !== undefined ? { subarea: doc.frontmatter.subarea } : {}), headings, text: plainText(article).slice(0, 5000), ...(config.readerFilters ? { readerFilters: doc.readerFilters ?? {}, readerSegments: readerSegments(htmlTree) } : {}) };
    })
  };
}

export function projectMetadata(doc: Document, config: any): string {
  const projection = config.outputs?.markdown?.metadata;
  if (!projection) return '';
  if (typeof projection !== 'object' || Array.isArray(projection)) throw new Error('Markdown metadata projection must be a mapping');
  const object = (value: unknown): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value);
  const safePath = (value: string) => /^[A-Za-z_][A-Za-z0-9_-]*(?:\.[A-Za-z_][A-Za-z0-9_-]*)*$/.test(value);
  const publicationFields = new Set(['channel', 'version', 'language', 'canonicalUrl']);
  const approved = publicFrontmatterPaths(config.frontmatter);
  const validateSource = (source: string) => {
    if (!safePath(source)) throw new Error(`Invalid metadata source path ${source}`);
    const [namespace, field] = source.split('.');
    if (namespace === 'publication' && publicationFields.has(field) && source.split('.').length === 2) return;
    if (namespace !== 'frontmatter' || !field) throw new Error(`Unknown metadata source ${source}`);
    if (protectedMetadataRoots.has(field)) throw new Error(`Field ${source} is protected from public Markdown`);
    if (nativePublicFields.has(field) && source.split('.').length === 2) return;
    if (!approved.has(source)) throw new Error(`Field ${source} is not approved for public Markdown`);
  };
  let format = projection.format ?? 'none';
  let omitNull = projection.omitNull ?? true;
  let fields: Record<string, string> = {};
  const apply = (layer: any, label: string) => {
    if (!object(layer)) throw new Error(`${label} must be a mapping`);
    for (const key of Object.keys(layer)) if (!['format', 'fields', 'addFields', 'removeFields', 'omitNull'].includes(key)) throw new Error(`Unknown ${label} setting ${key}`);
    if (layer.format !== undefined) format = layer.format;
    if (layer.omitNull !== undefined) {
      if (typeof layer.omitNull !== 'boolean') throw new Error(`${label}.omitNull must be true or false`);
      omitNull = layer.omitNull;
    }
    if (layer.fields !== undefined) {
      if (!object(layer.fields)) throw new Error(`${label}.fields must map output names to source paths`);
      fields = { ...layer.fields };
    }
    if (layer.addFields !== undefined) {
      if (!object(layer.addFields)) throw new Error(`${label}.addFields must map output names to source paths`);
      fields = { ...fields, ...layer.addFields };
    }
    if (layer.removeFields !== undefined) {
      if (!Array.isArray(layer.removeFields) || layer.removeFields.some((name: unknown) => typeof name !== 'string')) throw new Error(`${label}.removeFields must be a list of output names`);
      for (const name of layer.removeFields) {
        if (!(name in fields)) throw new Error(`${label}.removeFields names missing output ${name}`);
        delete fields[name];
      }
    }
  };
  for (const key of Object.keys(projection)) if (!['format', 'fields', 'addFields', 'removeFields', 'omitNull', 'byType', 'profiles'].includes(key)) throw new Error(`Unknown metadata setting ${key}`);
  apply(Object.fromEntries(Object.entries(projection).filter(([key]) => ['format', 'fields', 'addFields', 'removeFields', 'omitNull'].includes(key))), 'metadata');
  const byType = projection.byType ?? {};
  if (!object(byType)) throw new Error('metadata.byType must be a mapping');
  if (byType[doc.frontmatter.type]) apply(byType[doc.frontmatter.type], `metadata.byType.${doc.frontmatter.type}`);
  const profiles = projection.profiles ?? {};
  if (!object(profiles)) throw new Error('metadata.profiles must be a mapping');
  const pageSetting = doc.frontmatter.markdownMetadata;
  if (pageSetting !== undefined) {
    const page = typeof pageSetting === 'string' ? { profile: pageSetting } : pageSetting;
    if (!object(page)) throw new Error(`${doc.file}: markdownMetadata must be a profile name or mapping`);
    for (const key of Object.keys(page)) if (!['profile', 'format', 'fields', 'addFields', 'removeFields', 'omitNull'].includes(key)) throw new Error(`${doc.file}: unknown markdownMetadata setting ${key}`);
    if (page.profile !== undefined) {
      if (typeof page.profile !== 'string' || !profiles[page.profile]) throw new Error(`${doc.file}: unknown markdownMetadata profile ${page.profile}`);
      apply(profiles[page.profile], `metadata.profiles.${page.profile}`);
    }
    const { profile, ...override } = page;
    apply(override, `${doc.file}: markdownMetadata`);
  }
  if (format === 'none') return '';
  if (format !== 'yaml-frontmatter') throw new Error(`Unsupported Markdown metadata format ${format}`);
  const publication = { ...doc.variant, canonicalUrl: doc.route };
  const output: Record<string, unknown> = {};
  const readPath = (source: string) => {
    const [namespace, ...segments] = source.split('.');
    const root: any = namespace === 'frontmatter' ? doc.frontmatter : publication;
    return segments.reduce<any>((at, segment) => at !== null && at !== undefined && Object.prototype.hasOwnProperty.call(at, segment) ? at[segment] : undefined, root);
  };
  for (const [name, source] of Object.entries(fields)) {
    if (!safePath(name) || ['__proto__', 'prototype', 'constructor'].some(segment => name.split('.').includes(segment))) throw new Error(`Invalid metadata output name ${name}`);
    if (typeof source !== 'string') throw new Error(`Metadata source for ${name} must be a path`);
    validateSource(source);
    const value = readPath(source);
    if (value === undefined || value === null) { if (omitNull) continue; throw new Error(`Missing metadata ${source} in ${doc.file}`); }
    const segments = name.split('.');
    let at: Record<string, any> = output;
    for (const segment of segments.slice(0, -1)) {
      if (at[segment] === undefined) at[segment] = {};
      if (!object(at[segment])) throw new Error(`Metadata output conflict at ${name}`);
      at = at[segment];
    }
    const last = segments.at(-1)!;
    if (at[last] !== undefined) throw new Error(`Duplicate metadata output ${name}`);
    at[last] = value;
  }
  return Object.keys(output).length ? `---\n${YAML.stringify(output)}---\n\n` : '';
}
