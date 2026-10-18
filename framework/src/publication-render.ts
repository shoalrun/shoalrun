import { resolveAuthoredChange, authoredChangeNotice } from './authored-change.js';
import { resolveSubjectDeprecation, subjectDeprecationNotice } from './subject-deprecation.js';
import { markdownSections } from './markdown-sections.js';
import { contentDigest, type Freshness } from './freshness.js';
import { configField } from './compiler-config.js';
import { fictionalDocument, resolveLlmsDiscovery } from './llms-discovery.js';
import { publicationRelationships, resolveCardTree, type CardUse, validateRelationships } from './cards.js';
import { resolveCookbookTree, type Cookbooks } from './cookbook-chooser.js';
import { buildHtmlPage, heading, link, markdownRoute, paragraph, projectMetadata, renderMarkdown, root, text, type Document, type FooterConfig, type HeaderConfig, type Variant } from './content.js';
import { navigationPath, navigationTab, navigationTabRecord, resolveProjectNavigation, type OperationNavEntry, validateProjectNavigation } from './project-navigation.js';
import { outputUrl, publicTree, resolveOutputLinks } from './representation-tree.js';
import { presetCatalog, type Mode, type Palette } from './palettes.js';
import type { ReaderFiltersConfig } from './reader-filters.js';
import type { CodeHighlighter } from './highlight.js';
import type { MaterializedPage } from './page-materialization.js';
import type { ResolvedCompilerConfig, CompilerSiteConfig, CompilerPublicationsConfig } from './compiler-config.js';

const keyFor = (id: string, variant: Variant) => `${id}|${variant.channel}|${variant.version}|${variant.language}`;

export function renderPublicationPages({ rendered, docs, relationships, knownOperations, cardUses, publishedRelationships, cookbooks, documentRoutes,
  basePath, siteOrigin, colorMode, config, highlighter, editionLabel, customStyleFile, themePreset, palette,
  themeStyleFile, generatedPaletteCss, generatedBadgeCss, themeSwitcherData, generatedFontsCss, fontsPreload,
  shareFor, faviconRoute, modeToggle, header, footer, search, readerFilters, variants, externalDocuments,
  externalSiteLinks, navigationSpec, navigationEntries, navigationTagOrder, freshness }: {
  freshness?: Freshness;
  rendered: MaterializedPage[];
  docs: Map<string, Document>;
  relationships: ReturnType<typeof validateRelationships>;
  knownOperations: Map<string, { apiId: string; reference: string }>;
  cardUses: Map<Document, CardUse>;
  publishedRelationships: Array<ReturnType<typeof validateRelationships>[number] & { variant: Variant }>;
  cookbooks: Cookbooks;
  documentRoutes: Set<string>;
  basePath: string;
  siteOrigin?: string;
  colorMode: Mode | 'system';
  config: ResolvedCompilerConfig & { site: CompilerSiteConfig; publications: CompilerPublicationsConfig };
  highlighter: CodeHighlighter;
  editionLabel: (variant: Variant) => string;
  customStyleFile?: string;
  themePreset: string;
  palette: Palette;
  themeStyleFile?: string;
  generatedPaletteCss?: string;
  generatedBadgeCss?: string;
  themeSwitcherData?: string;
  generatedFontsCss?: string;
  fontsPreload?: string;
  shareFor: (doc: Document) => { route: string; generated: boolean; file?: string } | undefined;
  faviconRoute: string;
  modeToggle: boolean;
  header: HeaderConfig;
  footer?: FooterConfig;
  search: { provider: 'lexical' | 'custom' | 'none' };
  readerFilters?: ReaderFiltersConfig;
  variants: Variant[];
  externalDocuments: Map<string, Array<{ label: string; variant: Variant; url: string }>>;
  externalSiteLinks: Array<{ label: string; url: string; current: false }>;
  navigationSpec: ReturnType<typeof validateProjectNavigation>;
  navigationEntries: Map<string, OperationNavEntry[]>;
  navigationTagOrder: Map<string, Map<string, string[]>>;
}) {
  const resolvedNavigation = new Map<string, ReturnType<typeof resolveProjectNavigation>>();
  const scopedRelationships = new Map<string, ReturnType<typeof validateRelationships>>();
  const hasHome = rendered.some(page => page.doc.route === basePath || page.doc.route === '/');
  for (const page of rendered) {
    const navVariant = `${page.doc.variant.channel}|${page.doc.variant.version}|${page.doc.variant.language}`;
    let edges = scopedRelationships.get(navVariant);
    if (!edges) {
      const local = new Map([...docs.values()].filter(doc => keyFor(doc.frontmatter.id, doc.variant) === keyFor(doc.frontmatter.id, page.doc.variant)).map(doc => [doc.frontmatter.id, doc]));
      edges = publicationRelationships(relationships, local);
      scopedRelationships.set(navVariant, edges);
      publishedRelationships.push(...edges.map(edge => ({ ...edge, variant: page.doc.variant })));
    }
    const use: CardUse = { targets: [], queries: [] };
    page.doc.tree = resolveCardTree(page.doc.tree, page.doc, docs, edges, new Set(knownOperations.keys()), use, config);
    page.doc.tree = resolveCookbookTree(page.doc.tree, page.doc, docs, cookbooks, use.targets);
    cardUses.set(page.doc, use);
    page.htmlTree = resolveOutputLinks(publicTree(page.doc.tree, 'html', documentRoutes, colorMode, basePath), page.doc.route, undefined, 'html', documentRoutes, basePath);
    page.doc.subjectDeprecation = resolveSubjectDeprecation(page.doc, docs);
    page.doc.change = resolveAuthoredChange(page.doc, docs);
    const notices = (format: 'html' | 'markdown') => root([...subjectDeprecationNotice(page.doc.subjectDeprecation, format).children, ...authoredChangeNotice(page.doc.change, format).children]);
    const htmlNotice = resolveOutputLinks(notices('html'), page.doc.route, undefined, 'html', documentRoutes, basePath);
    (page.htmlTree as ReturnType<typeof root>).children.unshift(...htmlNotice.children);
    const mdNotice = resolveOutputLinks(notices('markdown'), page.doc.route, siteOrigin, 'markdown', documentRoutes, basePath);
    const noticeMarkdown = mdNotice.children.length ? renderMarkdown(mdNotice) + '\n' : '';
    const fictional = fictionalDocument(page.doc, resolveLlmsDiscovery(configField(config.outputs, 'llms')));
    const mdTree = resolveOutputLinks(publicTree(page.doc.tree, 'markdown', documentRoutes, 'light', basePath), page.doc.route, siteOrigin, 'markdown', documentRoutes, basePath);
    if (fictional) {
      for (const tree of [page.htmlTree, mdTree] as any[]) tree.children.unshift({ type: 'blockquote', children: [paragraph(text('Fictional API example. This page demonstrates documentation features; its operations do not describe a live service.'))] });
    }
    page.doc.contentDigest = contentDigest(page.doc, page.htmlTree, mdTree);
    if (freshness) page.doc.frontmatter.updated = freshness.resolve(page.doc, page.doc.contentDigest, typeof config.site.updated === 'string' ? config.site.updated : undefined);
    const subjectLifecycleLabel = page.doc.frontmatter.subjectLifecycle === 'in-development' ? 'In development' : page.doc.frontmatter.subjectLifecycle === 'beta' ? 'Beta' : page.doc.frontmatter.subjectLifecycle === 'deprecated' ? 'Deprecated' : page.doc.frontmatter.subjectLifecycle === 'experimental' ? 'Experimental' : undefined;
    const markdownLabel = (label: string, value: string) => renderMarkdown(root([paragraph({ type: 'strong', children: [text(`${label}: ${value}.`)] })])) + '\n';
    let navigation = resolvedNavigation.get(navVariant);
    if (!navigation) {
      navigation = resolveProjectNavigation(navigationSpec, page.doc.variant, docs, navigationEntries.get(navVariant) ?? [], navigationTagOrder.get(navVariant) ?? new Map());
      resolvedNavigation.set(navVariant, navigation);
    }
    const breadcrumbs = navigationPath(navigation, page.doc.route);
    const tab = navigationTab(navigation, page.doc.route);
    const tabRecord = tab ? navigationTabRecord(tab, page.doc.variant, basePath) : undefined;
    const tabMarkdown = tabRecord ? renderMarkdown(root([paragraph(text('Navigation section: '), link(outputUrl(tabRecord.indexUrl, page.doc.route, siteOrigin, 'markdown', documentRoutes, basePath), tabRecord.label), text(` (ID: ${tabRecord.id}). `), link(outputUrl(`${basePath}/llms.min.txt`, page.doc.route, siteOrigin, 'markdown', documentRoutes, basePath), 'All sections and pages'))])) + '\n' : '';
    const breadcrumbMarkdown = tabMarkdown + (breadcrumbs.length > 1 ? renderMarkdown(root([paragraph(text('Breadcrumbs: '), ...breadcrumbs.flatMap((crumb, index) => [
      ...(index ? [text(' > ')] : []),
      crumb.url && index < breadcrumbs.length - 1 ? link(outputUrl(markdownRoute(crumb.url, basePath), page.doc.route, siteOrigin, 'markdown', documentRoutes, basePath), crumb.label) : text(crumb.label)
    ]))])) + '\n' : '');
    page.markdown = projectMetadata(page.doc, config) + renderMarkdown(root([heading(1, page.doc.frontmatter.title)])) + '\n' + renderMarkdown(root([{ type: 'blockquote', children: [paragraph(text('Documentation index: '), link(outputUrl(`${basePath}/llms.min.txt`, page.doc.route, siteOrigin, 'markdown', documentRoutes, basePath), 'llms.min.txt'), text(' · Document manifest: '), link(outputUrl(`${basePath}/documents.json`, page.doc.route, siteOrigin, 'markdown', documentRoutes, basePath), 'documents.json'))] }])) + '\n' + breadcrumbMarkdown + (page.doc.frontmatter.date ? markdownLabel('Published', page.doc.frontmatter.date) : '') + (page.doc.frontmatter.updated && !(page.doc.frontmatter.type === 'changelog-entry' && page.doc.frontmatter.date) ? markdownLabel('Updated', page.doc.frontmatter.updated) : '') + (page.doc.frontmatter.verified ? markdownLabel('Verified', page.doc.frontmatter.verified) : '') + (page.doc.frontmatter.releaseVersion ? markdownLabel('Version', page.doc.frontmatter.releaseVersion) : '') + (subjectLifecycleLabel ? markdownLabel('Status', subjectLifecycleLabel) : '') + noticeMarkdown + renderMarkdown(mdTree);
    const body = renderMarkdown(mdTree);
    const sectionPrefix = page.markdown.slice(0, -body.length) + (fictional ? renderMarkdown(root([mdTree.children[0]])) + '\n' : '');
    page.sections = markdownSections(page.doc.tree, page.doc.markdownRoute, page.markdown, sectionPrefix, tree => {
      const resolved = resolveOutputLinks(publicTree(tree, 'markdown', documentRoutes, 'light', basePath), page.doc.route, siteOrigin, 'markdown', documentRoutes, basePath);
      // Fragment-only links refer to the full parent, not the smaller resource.
      const parentLinks = (node: any): any => ({ ...node,
        ...(typeof node.url === 'string' && node.url.startsWith('#') ? { url: `${siteOrigin ?? ''}${page.doc.markdownRoute}${node.url}` } : {}),
        ...(node.children ? { children: node.children.map(parentLinks) } : {}) });
      return renderMarkdown(parentLinks(resolved));
    }, page.doc.frontmatter.standaloneSections);
    const externalForPage = externalDocuments.get(page.doc.frontmatter.id) ?? [];
    const shownLanguages = new Set([...variants.map(variant => variant.language), ...externalForPage.map(item => item.variant.language)]).size > 1;
    const languageSuffix = (variant: Variant) => shownLanguages ? ` · ${variant.language}` : '';
    const localAlternates = variants.flatMap(variant => {
      const alternate = docs.get(keyFor(page.doc.frontmatter.id, variant));
      const label = `${variant.channel} · ${variant.version}${languageSuffix(variant)}`;
      if (alternate) return [{ label, url: alternate.route, current: alternate === page.doc }];
      const overview = [...docs.values()].filter(doc => doc.variant.channel === variant.channel && doc.variant.version === variant.version && doc.variant.language === variant.language && doc.frontmatter.access?.policy === 'public').sort((a, b) => a.route.length - b.route.length || a.route.localeCompare(b.route))[0];
      return overview ? [{ label: `${label} · page unavailable; open overview`, url: overview.route, current: false }] : [];
    });
    const publicationAlternates = [...localAlternates, ...externalSiteLinks, ...externalForPage.map(item => ({
      label: `${item.label}${item.label.toLowerCase() === item.variant.channel.toLowerCase() ? '' : ` · ${item.variant.channel}`} · ${item.variant.version}${languageSuffix(item.variant)}`,
      url: item.url, current: false
    }))];
    page.html = buildHtmlPage(page.doc, page.htmlTree, page.doc.markdownRoute, config.site.title, navigation, page.pageExamples, page.pageShapes, highlighter, editionLabel(page.doc.variant), !!customStyleFile, { preset: themePreset, palette: palette.name, themeCss: !!themeStyleFile, paletteCss: !!generatedPaletteCss, badgesCss: !!generatedBadgeCss, themeSwitcher: themeSwitcherData, fontsCss: !!generatedFontsCss, preloadFont: fontsPreload, masthead: presetCatalog.find(preset => preset.name === themePreset)?.masthead, share: shareFor(page.doc), favicon: faviconRoute, touchIcon: !faviconRoute.endsWith('.png'), origin: siteOrigin, indexing: config.site.indexing !== false, home: hasHome, mode: colorMode, toggle: modeToggle, header, footer, search: search.provider !== 'none', publicationAlternates, breadcrumbs }, page.pageCurl, page.pageSamples, { ...config, readerFilters });
  }
  return resolvedNavigation;
}
