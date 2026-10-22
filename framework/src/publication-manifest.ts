import { markdownSize } from './markdown-size.js';
import { createHash } from 'node:crypto';
import type { ApiEmbedUse } from './api-embeds.js';
import type { CardUse, validateRelationships } from './cards.js';
import type { Document, Variant } from './content.js';
import type { DiagramAsset } from './diagrams.js';
import type { materializePages } from './page-materialization.js';
import { navigationPath, navigationTab, navigationTabRecord, type resolveProjectNavigation } from './project-navigation.js';
import type { ReaderFiltersConfig } from './reader-filters.js';
import { sitemapFiles } from './sitemap.js';
import type { Taxonomy } from './taxonomy.js';
import type { SnippetUse } from './snippets.js';

const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const keyFor = (id: string, variant: Variant) => `${id}|${variant.channel}|${variant.version}|${variant.language}`;

export function buildPublicationManifest({ fictionalDocuments, configDigest, synonyms, basePath, publicPath, readerFilters, taxonomy, dependencies, rendered,
  resolvedNavigation, cardUses, snippetUses, apiEmbedUses, focusedContracts, operations, publishedRelationships,
  redirects, apiSources, siteOrigin, siteIndexing, siteUpdated, diagramAssets, heroImages, faviconRoute, catalog }: {
  fictionalDocuments: Set<Document>;
  configDigest: string;
  synonyms: unknown[];
  basePath: string;
  publicPath: (route: string) => string;
  readerFilters?: ReaderFiltersConfig;
  taxonomy?: Taxonomy;
  dependencies: string[];
  rendered: Awaited<ReturnType<typeof materializePages>>['rendered'];
  resolvedNavigation: Map<string, ReturnType<typeof resolveProjectNavigation>>;
  cardUses: Map<Document, CardUse>;
  snippetUses: SnippetUse[];
  apiEmbedUses: ApiEmbedUse[];
  focusedContracts: Map<string, { bytes: number; digest: string }>;
  operations: Awaited<ReturnType<typeof materializePages>>['operations'];
  publishedRelationships: Array<ReturnType<typeof validateRelationships>[number] & { variant: Variant }>;
  redirects: Array<{ from: string; to: string; markdownFrom: string; markdownTo: string; status: number }>;
  apiSources: Array<{ apiId: string; channel: string; version: string; endpoint: string | null; referenceUrl: string; sourceUrl: string; mediaType: string }>;
  siteOrigin?: string;
  siteIndexing: boolean;
  siteUpdated?: string;
  diagramAssets: DiagramAsset[];
  heroImages: Map<string, string>;
  faviconRoute: string;
  catalog: unknown;
}) {
  const indexable = (doc: Document) => siteIndexing && doc.frontmatter.seo?.noindex !== true;
  const updatedFor = (doc: Document) => doc.frontmatter.updated ?? siteUpdated;
  const tabs = [...resolvedNavigation].flatMap(([key, nodes]) => {
    const [channel, version, language] = key.split('|');
    return nodes.filter(node => node.tab).map(node => navigationTabRecord(node, { channel, version, language }, basePath));
  });
  const tabFor = (doc: Document) => {
    const node = navigationTab(resolvedNavigation.get(`${doc.variant.channel}|${doc.variant.version}|${doc.variant.language}`) ?? [], doc.route);
    return node ? { navigationTab: navigationTabRecord(node, doc.variant, basePath) } : {};
  };
  const sitemaps = siteOrigin && siteIndexing ? sitemapFiles(siteOrigin, rendered.filter(page => indexable(page.doc)).map(page => ({ route: page.doc.route, updated: updatedFor(page.doc) })).concat([{ route: publicPath('/llms.txt'), updated: undefined }]), {}, basePath) : new Map<string, string>();
  const manifest = {
    schemaVersion: 1,
    configDigest: configDigest,
    ...(synonyms.length ? { searchSynonyms: synonyms } : {}),
    basePath,
    ...(sitemaps.size ? { sitemap: publicPath('/sitemap.xml') } : {}),
    ...(readerFilters ? { readerFacets: readerFilters.facets } : {}),
    ...(taxonomy ? { taxonomy } : {}),
    dependencies,
    ...(tabs.length ? { navigationTabs: tabs } : {}),
    documents: rendered.map(({ doc, markdown, sections }) => ({ id: doc.frontmatter.id, demo: fictionalDocuments.has(doc), type: doc.frontmatter.type, title: doc.frontmatter.title, summary: doc.frontmatter.summary, subjectLifecycle: doc.frontmatter.subjectLifecycle ?? null, ...(doc.change ? { change: doc.change } : {}), ...(doc.subjectDeprecation ? { subjectDeprecation: doc.subjectDeprecation } : {}), variant: doc.variant, url: doc.route, markdownUrl: doc.markdownRoute, ...tabFor(doc), indexable: indexable(doc), ...(updatedFor(doc) ? { updated: updatedFor(doc) } : {}), ...(doc.frontmatter.verified ? { verified: doc.frontmatter.verified } : {}), contentDigest: doc.contentDigest, breadcrumbs: navigationPath(resolvedNavigation.get(`${doc.variant.channel}|${doc.variant.version}|${doc.variant.language}`) ?? [], doc.route), ...(doc.frontmatter.product !== undefined ? { product: doc.frontmatter.product } : {}), ...(doc.frontmatter.area !== undefined ? { area: doc.frontmatter.area } : {}), ...(doc.frontmatter.subarea !== undefined ? { subarea: doc.frontmatter.subarea } : {}), ...(readerFilters ? { readerFilters: doc.readerFilters ?? {} } : {}), cardTargets: cardUses.get(doc)?.targets ?? [], cardQueries: cardUses.get(doc)?.queries ?? [], snippets: [...new Set(snippetUses.filter(use => use.documentId === doc.frontmatter.id).map(use => use.id))], apiEmbeds: apiEmbedUses.filter(use => use.documentKey === keyFor(doc.frontmatter.id, doc.variant)).map(({ sourceFile, documentKey, ...request }) => request), focusedContractUrl: doc.focusedContractUrl ?? null, focusedContractBytes: doc.focusedContractUrl ? focusedContracts.get(doc.focusedContractUrl)?.bytes : null, focusedContractDigest: doc.focusedContractUrl ? focusedContracts.get(doc.focusedContractUrl)?.digest : null, sections: (sections ?? []).map(({ content, ...record }) => record), ...markdownSize(markdown), digest: digest(markdown) })),
    operations,
    relationships: publishedRelationships,
    redirects,
    apiSources
  };
  const headers: Record<string, Record<string, string>> = {
    [publicPath('/llms.min.txt')]: { 'Content-Type': 'text/plain; charset=utf-8' },
    [publicPath('/llms.txt')]: { 'Content-Type': 'text/plain; charset=utf-8' },
    ...Object.fromEntries(tabs.map(tab => [tab.indexUrl, { 'Content-Type': 'text/plain; charset=utf-8' }])),
    ...Object.fromEntries(['/documents.json', '/build-info.json'].flatMap(route =>
      [...new Set([route, publicPath(route)])].map(url => [url, { 'Content-Type': 'application/json' }]))),
    [publicPath('/robots.txt')]: { 'Content-Type': 'text/plain; charset=utf-8' },
    ...Object.fromEntries([...sitemaps.keys()].map(route => [route, { 'Content-Type': 'application/xml; charset=utf-8' }])),
    ...Object.fromEntries(rendered.map(({ doc }) => [doc.route, { 'Content-Type': 'text/html; charset=utf-8', Link: `<${doc.markdownRoute}>; rel="alternate"; type="text/markdown"` }])),
    ...Object.fromEntries(rendered.map(({ doc, markdown }, index) => [doc.markdownRoute, { 'Content-Type': 'text/markdown; charset=utf-8', 'Cache-Control': 'public, max-age=0, must-revalidate', ETag: `"${digest(markdown)}"`, Link: `<${siteOrigin ?? ''}${doc.route}>; rel="canonical", <${publicPath('/documents.json')}#/documents/${index}>; rel="describedby"; type="application/json"` }])),
    ...Object.fromEntries(apiSources.map(item => [item.sourceUrl, { 'Content-Type': item.mediaType }])),
    ...Object.fromEntries([...focusedContracts].map(([url, contract]) => [url, { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=31536000, immutable', ETag: `"${contract.digest}"` }])),
    ...Object.fromEntries(diagramAssets.map(asset => [asset.route, { 'Content-Type': 'image/svg+xml', 'Content-Security-Policy': 'sandbox', 'X-Content-Type-Options': 'nosniff' }])),
    ...Object.fromEntries([...heroImages.keys()].filter(route => route.toLowerCase().endsWith('.svg')).map(route => [route, { 'Content-Type': 'image/svg+xml', 'Content-Security-Policy': 'sandbox', 'X-Content-Type-Options': 'nosniff' }])),
    ...(faviconRoute.endsWith('.svg') ? { [faviconRoute]: { 'Content-Type': 'image/svg+xml', 'Content-Security-Policy': 'sandbox', 'X-Content-Type-Options': 'nosniff' } } : {})
  };
  if (catalog) headers[publicPath('/.well-known/api-catalog')] = { 'Content-Type': 'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"' };
  return { manifest, headers, sitemaps };
}
