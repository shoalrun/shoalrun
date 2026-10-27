import { markdownTokenEncoding } from './markdown-size.js';
import { addMcpArtifacts } from './mcp-artifacts.js';
import { mcpRuntimePath } from './mcp-integrity.js';
import { documentSnapshot, publicationBuildId } from './document-sync.js';
import { homeUrl } from './negotiation.js';
import { notFoundPage, type NotFoundAppearance } from './not-found.js';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { configField } from './compiler-config.js';
import { fictionalDocument, optionalDocument, resolveLlmsDiscovery } from './llms-discovery.js';
import { boundedDiscovery, type DiscoveryEntry } from './compact-discovery.js';
import { iconLicenseFile } from './icons.js';
import { peleLicenseFile } from './diagrams.js';
import { fontsCss, type SiteFonts } from './fonts.js';
import { defaultShareSvg, faviconSvg, fillShareTemplate, renderPng, touchIconSvg, type ShareSettings } from './share-images.js';
import { paletteCatalog, paletteCss, presetCatalog, resolvePalette, type Palette } from './palettes.js';
import { heading, link, list, paragraph, renderMarkdown, root, searchIndex, shareCardText, text, type Document } from './content.js';
import { outputUrl } from './representation-tree.js';
import type { ReaderFiltersConfig } from './reader-filters.js';
import type { DiagramAsset } from './diagrams.js';
import type { ApiReader } from './api.js';

export type ArtifactPage = { doc: Document; html: string; markdown: string; htmlTree: unknown; sections?: import('./markdown-sections.js').MarkdownSection[] };
export type ArtifactAssemblyInput = {
  base: string;
  basePath: string;
  publicPath: (route: string) => string;
  canonical: (file: string) => string;
  siteOrigin?: string;
  manifest: ReturnType<typeof import('./publication-manifest.js').buildPublicationManifest>['manifest'];
  provenanceRecord: Record<string, unknown>;
  rendered: ArtifactPage[];
  sitemaps: Map<string, string>;
  diagramAssets: DiagramAsset[];
  heroImages: Map<string, string>;
  focusedContracts: Map<string, { content: string }>;
  styleFiles: string[];
  themeStyleFile?: string;
  generatedPaletteCss?: string;
  generatedBadgeCss?: string;
  search: { provider: 'lexical' | 'custom' | 'none'; index: boolean; module?: string };
  synonyms: unknown[];
  config: { site: { title: string; basePath?: unknown; indexing?: boolean }; [key: string]: unknown };
  builtInSearchProvider: string;
  customReaderModule?: string;
  analyticsModule?: string;
  mcpAnalyticsModule?: string;
  previewFiles: string[];
  assetDirectory: string;
  themeSwitcher: boolean;
  themeDirectory: string;
  palette: Palette;
  colorMode: 'light' | 'dark' | 'system';
  generatedFontsCss?: string;
  fontFiles: string[];
  fonts: SiteFonts;
  shareImages: ShareSettings;
  shareFor: (doc: Document) => { route: string; generated: boolean; file?: string } | undefined;
  themePreset: string;
  shareFontFiles: string[];
  shareCache: string;
  faviconFile?: string;
  faviconRoute: string;
  customStyleFile?: string;
  scriptFiles: string[];
  componentAssets?: import('./component-plugins.js').ComponentAsset[];
  redirects: unknown[];
  apiPublications: Map<string, { sourceFile: string; sourceUrl: string }>;
  api: ApiReader;
  catalog: unknown;
  headers: Record<string, Record<string, string>>;
  documentRoutes: Set<string>;
  readerFilters?: ReaderFiltersConfig;
  apiSources: Array<{ apiId: string; channel: string; version: string; sourceUrl: string; mediaType: string }>;
};

export async function assembleArtifacts(input: ArtifactAssemblyInput): Promise<{ artifacts: Map<string, string | Buffer>; buildId: string }> {
  const { base, basePath, publicPath, canonical, siteOrigin, manifest, provenanceRecord, rendered, sitemaps,
    diagramAssets, heroImages, focusedContracts, styleFiles, themeStyleFile, generatedPaletteCss,
    generatedBadgeCss, search, synonyms, config, builtInSearchProvider, customReaderModule, analyticsModule, mcpAnalyticsModule,
    previewFiles, assetDirectory, themeSwitcher, themeDirectory, palette, colorMode, generatedFontsCss,
    fontFiles, fonts, shareImages, shareFor, themePreset, shareFontFiles, shareCache, faviconFile,
    faviconRoute, customStyleFile, scriptFiles, componentAssets, redirects, apiPublications, api, catalog, headers,
    documentRoutes, readerFilters, apiSources } = input;
  const artifacts = new Map<string, string | Buffer>();
  const artifactFiles = new Set<string>();
  const artifactDirectories = new Set<string>();
  const addArtifact = (route: string, data: string | Buffer) => {
    const normalized = path.posix.normalize(route);
    const key = normalized.toLowerCase();
    if (artifactFiles.has(key) || artifactDirectories.has(key)) throw new Error(`Output artifact collision: ${route}`);
    const parents: string[] = [];
    for (let parent = path.posix.dirname(key); parent !== '/'; parent = path.posix.dirname(parent)) {
      if (artifactFiles.has(parent)) throw new Error(`Output artifact collision: ${route}`);
      parents.push(parent);
    }
    artifactFiles.add(key);
    for (const parent of parents) artifactDirectories.add(parent);
    artifacts.set(normalized, data);
  };
  const addPublicArtifact = (route: string, data: string | Buffer) => addArtifact(publicPath(route), data);
  const addMetadataArtifact = (route: string, data: string) => {
    for (const url of new Set([route, publicPath(route)])) headers[url] = { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=0, must-revalidate', ...headers[url] };
    addArtifact(route, data);
    if (basePath) addPublicArtifact(route, data);
  };
  for (const item of rendered) {
    addArtifact(item.doc.route === '/' ? '/index.html' : `${item.doc.route}/index.html`, item.html);
    addArtifact(item.doc.markdownRoute, item.markdown);
    for (const section of item.sections ?? []) {
      addArtifact(section.markdownUrl, section.content);
      headers[section.markdownUrl] = { 'Content-Type': 'text/markdown; charset=utf-8', 'Cache-Control': 'public, max-age=0, must-revalidate', ETag: `"${section.digest}"`, Link: `<${section.parentMarkdownUrl}>; rel="up"; type="text/markdown"` };
    }
  }
  const recoveryHome = rendered.find(item => item.doc.route === (basePath || '/'))?.doc.route ?? homeUrl(rendered.map(item => ({ id: item.doc.frontmatter.id, url: item.doc.route }))) ?? `${basePath}/`;
  const errorAppearance: NotFoundAppearance = {
    theme: themePreset, palette: palette.name, mode: colorMode,
    stylesheets: [
      { url: publicPath('/assets/tokens.css') },
      ...(themeStyleFile ? [{ url: publicPath('/assets/theme.css'), kind: 'theme' as const }] : []),
      ...(generatedPaletteCss || themeSwitcher ? [{ url: publicPath('/assets/palette.css'), kind: 'palette' as const }] : []),
      ...(generatedFontsCss ? [{ url: publicPath('/assets/fonts.css') }] : []),
      ...(customStyleFile ? [{ url: publicPath('/assets/project.css') }] : [])
    ],
    ...(colorMode === 'system' && configField(config.theme, 'toggle') !== false ? { modeScript: publicPath('/assets/mode.js') } : {}),
    ...(themeSwitcher ? { switcher: { url: publicPath('/assets/theme-switcher.js'), settings: JSON.stringify({ presets: presetCatalog.map(({ name, palette, masthead }) => ({ name, palette, masthead })), palettes: paletteCatalog.map(entry => entry.name), demo: configField(configField(config.outputs, 'html'), 'themeSwitcher') === 'demo' }) } } : {})
  };
  addPublicArtifact('/404.html', notFoundPage(basePath, recoveryHome, false, undefined, !!search.index, errorAppearance));
  addPublicArtifact('/404.md', notFoundPage(basePath, recoveryHome, true, undefined, !!search.index));
  headers[publicPath('/404.html')] = { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex' };
  headers[publicPath('/404.md')] = { 'Content-Type': 'text/markdown; charset=utf-8', 'X-Robots-Tag': 'noindex' };
  addArtifact(publicPath('/robots.txt'), config.site.indexing === false
    ? `User-agent: *\nDisallow: ${basePath || '/'}\n`
    : `User-agent: *\nAllow: ${basePath || '/'}\n${sitemaps.size ? `Sitemap: ${siteOrigin}${publicPath('/sitemap.xml')}\n` : ''}`);
  for (const [route, xml] of sitemaps) addArtifact(route, xml);
  for (const asset of diagramAssets) addArtifact(asset.route, asset.svg);
  for (const [route, file] of heroImages) addArtifact(route, await readFile(file));
  for (const [url, contract] of focusedContracts) addArtifact(url, contract.content);
  // Published paths must not reveal the build machine's layout; symlinked node_modules (pnpm) resolve outside the framework, so compare real paths.
  const projectRoot = canonical(base);
  const frameworkRoot = canonical(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
  const publicDependency = (file: string) => {
    const resolved = canonical(file);
    const packageMatch = /.*[\\/]node_modules[\\/](.+)$/.exec(resolved);
    if (packageMatch) return `package:${packageMatch[1].split(path.sep).join('/')}`;
    const inside = (directory: string) => { const relative = path.relative(directory, resolved); return relative && !relative.startsWith('..') && !path.isAbsolute(relative) ? relative.split(path.sep).join('/') : undefined; };
    const project = inside(projectRoot);
    if (project) return project;
    const framework = inside(frameworkRoot);
    if (framework) return `shoalrun:${framework}`;
    return `external:${path.basename(resolved)}`;
  };
  addMetadataArtifact('/documents.json', JSON.stringify({ ...manifest, dependencies: [...new Set(manifest.dependencies.map(publicDependency))].sort() }, null, 2) + '\n');
  addMetadataArtifact('/build-info.json', JSON.stringify(provenanceRecord, null, 2) + '\n');
  for (const styleFile of styleFiles) addPublicArtifact(`/assets/${path.basename(styleFile)}`, await readFile(styleFile, 'utf8'));
  if (themeStyleFile) addPublicArtifact('/assets/theme.css', await readFile(themeStyleFile, 'utf8'));
  if (generatedPaletteCss || themeSwitcher) addPublicArtifact('/assets/palette.css', generatedPaletteCss ?? paletteCss(palette, colorMode));
  if (generatedBadgeCss) addPublicArtifact('/assets/badges.css', generatedBadgeCss);
  if (search.index) {
    const records = new Map(manifest.documents.map(doc => [doc.markdownUrl, doc]));
    const baseIndex = searchIndex(rendered, { ...config, searchSynonyms: synonyms });
    const index = { ...baseIndex, documents: baseIndex.documents.map(doc => {
      const page = records.get(doc.markdownUrl)!;
      return { ...doc, ...(page.navigationTab ? { navigationTab: page.navigationTab } : {}), markdownBytes: page.markdownBytes, markdownTokens: page.markdownTokens, markdownTokenEncoding: page.markdownTokenEncoding,
        ...(page.sections.length ? { sections: page.sections.map(({ id, title, markdownUrl, markdownBytes, markdownTokens, standalone }) => ({ id, title, markdownUrl, markdownBytes, markdownTokens, ...(standalone ? { standalone } : {}) })) } : {}) };
    }) };
    addMetadataArtifact('/search-index.json', JSON.stringify(index) + '\n');
    // An explicit projection prevents article text and reader segments from leaking into discovery.
    const sizes = new Map(manifest.documents.map(({ markdownUrl, markdownBytes, markdownTokens, markdownTokenEncoding }) => [markdownUrl, { markdownBytes, markdownTokens, markdownTokenEncoding }]));
    const compact = { schemaVersion: 1, documents: index.documents.map(({ id, demo, url, markdownUrl, title, summary, type, variant, headings, sections, navigationTab }) => ({ id, demo, url, markdownUrl, title, summary, type, variant, headings, ...(navigationTab ? { navigationTab } : {}), ...(sections ? { sections } : {}), ...sizes.get(markdownUrl) })) };
    addMetadataArtifact('/search-index.min.json', JSON.stringify(compact) + '\n');
  }
  if (search.provider === 'custom' && search.index) addPublicArtifact('/assets/search-lexical.js', await readFile(builtInSearchProvider, 'utf8'));
  if (search.module) addPublicArtifact('/assets/search-provider.js', await readFile(search.module, 'utf8'));
  if (customReaderModule) addPublicArtifact('/assets/reader-view-custom.js', await readFile(customReaderModule, 'utf8'));
  if (analyticsModule) addPublicArtifact('/assets/analytics-adapter.js', await readFile(analyticsModule, 'utf8'));
  if (previewFiles.length) {
    addPublicArtifact('/assets/theme-preview.js', await readFile(path.join(assetDirectory, 'theme-preview.js'), 'utf8'));
    addPublicArtifact('/assets/theme-preview.css', await readFile(path.join(assetDirectory, 'theme-preview.css'), 'utf8'));
    if (themeSwitcher) addPublicArtifact('/assets/theme-switcher.js', await readFile(path.join(assetDirectory, 'theme-switcher.js'), 'utf8'));
    for (const preset of presetCatalog) if (preset.name !== 'shoal') addPublicArtifact(`/assets/themes/${preset.name}.css`, await readFile(path.join(themeDirectory, `${preset.name}.css`), 'utf8'));
    for (const entry of paletteCatalog) addPublicArtifact(`/assets/themes/palette-${entry.name}.css`, paletteCss(await resolvePalette(entry.name, entry.name), 'system'));
    if (palette.name === 'custom') addPublicArtifact('/assets/themes/palette-custom.css', paletteCss(palette, 'system'));
  }
  if (generatedFontsCss) addPublicArtifact('/assets/fonts.css', generatedFontsCss.replaceAll('url("/assets/', `url("${basePath}/assets/`));
  for (const file of fontFiles) addPublicArtifact(`/assets/fonts/${path.basename(file)}`, await readFile(file));
  for (const route of new Set(fonts.faces.map(face => face.route))) addPublicArtifact(route, await readFile(fonts.faces.find(face => face.route === route)!.file));
  const shareTemplate = shareImages.template ? await readFile(shareImages.template, 'utf8') : undefined;
  for (const page of rendered) {
    const share = shareFor(page.doc);
    if (!share) continue;
    if (!share.generated) { addArtifact(share.route, await readFile(share.file!)); continue; }
    const card = { ...shareCardText(page.doc, config), site: String(config.site.title), url: siteOrigin ? `${siteOrigin.replace(/^https?:\/\//, '')}${page.doc.route === '/' ? '' : page.doc.route}` : '' };
    const svg = shareTemplate ? fillShareTemplate(shareTemplate, card, shareImages.template!) : await defaultShareSvg(card, themePreset, palette);
    addArtifact(share.route, await renderPng(svg, shareFontFiles, shareCache));
  }
  const favicon = faviconFile ? await readFile(faviconFile) : Buffer.from(faviconSvg(themePreset, palette));
  addArtifact(faviconRoute, faviconRoute.endsWith('.png') ? favicon : favicon.toString('utf8'));
  if (!faviconRoute.endsWith('.png')) addPublicArtifact('/apple-touch-icon.png', await renderPng(touchIconSvg(favicon.toString('utf8'), palette), shareFontFiles, shareCache, 180));
  if (customStyleFile) addPublicArtifact('/assets/project.css', await readFile(customStyleFile, 'utf8'));
  for (const asset of componentAssets ?? []) addPublicArtifact(asset.route, asset.content);
  for (const scriptFile of scriptFiles) addPublicArtifact(`/assets/${path.basename(scriptFile)}`, await readFile(scriptFile, 'utf8'));
  addPublicArtifact('/assets/lucide-LICENSE.txt', await readFile(iconLicenseFile, 'utf8'));
  if (diagramAssets.some(asset => asset.route.includes('/mermaid-'))) addPublicArtifact('/assets/pele-LICENSE.txt', await readFile(peleLicenseFile, 'utf8'));
  addMetadataArtifact('/redirects.json', JSON.stringify(redirects, null, 2) + '\n');
  for (const publication of apiPublications.values()) {
    const dependencies = await api.collectReferences(publication.sourceFile);
    for (const dependency of dependencies) {
      const relative = path.relative(path.dirname(publication.sourceFile), dependency);
      if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error(`Published OpenAPI dependency escapes its source directory: ${dependency}`);
      const target = path.posix.join(path.posix.dirname(publication.sourceUrl), relative.split(path.sep).join('/'));
      addArtifact(target, await readFile(dependency, 'utf8'));
    }
  }
  if (catalog) addPublicArtifact('/.well-known/api-catalog', JSON.stringify(catalog, null, 2) + '\n');
  headers['/documents.sync.json'] = { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=0, must-revalidate' };
  headers[publicPath('/documents.sync.json')] = headers['/documents.sync.json'];
  addMetadataArtifact('/resource-headers.json', JSON.stringify(headers, null, 2) + '\n');
  const discoveryLinks = (entries: Array<{ title: string; url: string; summary: string }>) => entries.length
    ? renderMarkdown(root([list(entries.map(entry => [paragraph(link(outputUrl(entry.url, '/', siteOrigin, 'markdown', documentRoutes, basePath), entry.title), ...(entry.summary ? [text(`: ${entry.summary}`)] : []))]))])).trimEnd()
    : '';
  const llms = resolveLlmsDiscovery(configField(config.outputs, 'llms'));
  const discoveryEntry = ({ doc }: ArtifactPage, includeType = false) => ({ title: `${fictionalDocument(doc, llms) ? 'Fictional example: ' : ''}${doc.frontmatter.title}`, url: doc.markdownRoute, summary: `${includeType ? `${doc.frontmatter.type} — ` : ''}${fictionalDocument(doc, llms) ? 'Demonstration only; not a live API. ' : ''}${doc.frontmatter.summary}` });
  const tabs = manifest.navigationTabs ?? [];
  const tabLinks = tabs.length ? '\n\n## Navigation sections\n\n' + discoveryLinks(tabs.map(tab => ({
    title: `${tab.label} (${tab.variant.channel}/${tab.variant.version}/${tab.variant.language})`, url: tab.indexUrl,
    summary: `Section ID: ${tab.id}. Scoped page index.`
  }))) : '';
  const groups = new Map<string, ArtifactPage[]>();
  const optional: ArtifactPage[] = [];
  for (const page of rendered) {
    if (optionalDocument(page.doc, llms)) optional.push(page);
    else {
      const pages = groups.get(page.doc.frontmatter.type) ?? [];
      pages.push(page);
      groups.set(page.doc.frontmatter.type, pages);
    }
  }
  const groupLabels: Record<string, string> = { overview: 'Overview', 'how-to': 'How-to guides', explanation: 'Explanations', reference: 'Reference', tutorial: 'Tutorials', 'api-reference': 'API reference' };
  const order = ['overview', 'how-to', 'explanation', 'tutorial', 'reference', 'api-reference'];
  const groupedSections = [...groups].sort(([a], [b]) => (order.indexOf(a) < 0 ? 99 : order.indexOf(a)) - (order.indexOf(b) < 0 ? 99 : order.indexOf(b)) || a.localeCompare(b)).flatMap(([type, pages]) => ['', `## ${groupLabels[type] ?? type}`, '', discoveryLinks(pages.sort((a, b) => a.doc.frontmatter.title.localeCompare(b.doc.frontmatter.title) || a.doc.route.localeCompare(b.doc.route)).map(page => discoveryEntry(page)))]);
  const sections = llms.format === 'flat'
    ? ['', '## Pages', '', discoveryLinks([...rendered].sort((a, b) => a.doc.frontmatter.title.localeCompare(b.doc.frontmatter.title) || a.doc.route.localeCompare(b.doc.route)).map(page => discoveryEntry(page)))]
    : groupedSections;
  const fictionalApis = new Set(rendered.filter(page => fictionalDocument(page.doc, llms)).flatMap(page => page.doc.frontmatter.operations?.map(operation => operation.split('.')[0]) ?? []));
  const optionalGroups = new Map<string, ArtifactPage[]>();
  for (const page of optional) {
    const key = fictionalDocument(page.doc, llms) ? 'Fictional examples' : page.doc.frontmatter.type === 'reference' ? 'Component and supporting references' : ['recipe', 'ingredient', 'cookbook'].includes(page.doc.frontmatter.type) ? 'Recipes, ingredients, and cookbooks' : `Additional ${groupLabels[page.doc.frontmatter.type] ?? page.doc.frontmatter.type} pages`;
    const pages = optionalGroups.get(key) ?? [];
    pages.push(page);
    optionalGroups.set(key, pages);
  }
  const optionalList = renderMarkdown(root([list([...optionalGroups].sort(([a], [b]) => a.localeCompare(b)).map(([label, pages]) => {
    pages.sort((a, b) => a.doc.frontmatter.title.localeCompare(b.doc.frontmatter.title) || a.doc.route.localeCompare(b.doc.route));
    const hub = label === 'Component and supporting references' ? rendered.find(page => llms.primaryIds.includes(page.doc.frontmatter.id) && page.doc.frontmatter.type === 'reference') : undefined;
    const entry = discoveryEntry(hub ?? pages[0]);
    const children = pages.map(page => discoveryEntry(page, true));
    if (label === 'Fictional examples') children.push(...apiSources.filter(item => fictionalApis.has(item.apiId)).map(item => ({ title: `Fictional example: ${item.apiId} ${item.channel} ${item.version} OpenAPI`, url: item.sourceUrl, summary: 'Demonstration contract; not a live service.' })));
    return [paragraph(link(outputUrl(entry.url, '/', siteOrigin, 'markdown', documentRoutes, basePath), label)), list(children.map(child => [paragraph(link(outputUrl(child.url, '/', siteOrigin, 'markdown', documentRoutes, basePath), child.title), text(`: ${child.summary}`))]))];
  }))])).trimEnd();
  const discovery = [renderMarkdown(root([heading(1, String(config.site.title))])).trimEnd(), '', '> Documentation and API contracts published by this site.', ...(readerFilters ? ['', 'Reader views affect the interactive HTML only. This index lists every published page, and each Markdown page includes all reader-marked sections with readable labels. The document manifest records configured reader facets and each page’s marks.'] : []), ...(llms.fictionalPrefixes.length ? ['', 'Entries labeled Fictional example demonstrate documentation features. Their operations and API contracts do not describe a live service.'] : []), '', '## Discovery', '', discoveryLinks([{ title: 'Compact documentation index', url: publicPath('/llms.min.txt'), summary: 'Start here: full-page Markdown links and author-declared standalone section links with sizes and full-page fallbacks. No tools or JSON processing required.' }, ...(search.index ? [{ title: 'Compact heading index', url: publicPath('/search-index.min.json'), summary: 'Page summaries, headings, and smaller section Markdown URLs with sizes; no article text.' }] : []), { title: 'Resource response headers', url: publicPath('/resource-headers.json'), summary: 'Published hosting metadata: content types and representation Link headers for host adapters.' }, { title: 'Document sync snapshot', url: publicPath('/documents.sync.json'), summary: 'Save and compare compact page signatures between builds; build-info.json identifies the current build.' }, { title: 'Structured document manifest', url: publicPath('/documents.json'), summary: 'Stable page IDs, HTML and Markdown URLs, and content digests.' }, ...(sitemaps.size ? [{ title: 'XML sitemap', url: publicPath('/sitemap.xml'), summary: 'Canonical URLs for indexable pages.' }] : []), ...(search.index ? [{ title: 'Lexical search index', url: publicPath('/search-index.json'), summary: 'Downloadable page titles, summaries, headings, and bounded HTML article text. It is an index file, not a query endpoint.' }] : []), ...(catalog ? [{ title: 'API catalog', url: publicPath('/.well-known/api-catalog'), summary: '' }] : [])]), ...sections, ...(apiSources.some(item => llms.format === 'flat' || !fictionalApis.has(item.apiId)) ? ['', '## API contracts', '', discoveryLinks(apiSources.filter(item => llms.format === 'flat' || !fictionalApis.has(item.apiId)).map(item => ({ title: `${fictionalApis.has(item.apiId) ? 'Fictional example: ' : ''}${item.apiId} ${item.channel} ${item.version} OpenAPI`, url: item.sourceUrl, summary: `Pinned ${item.mediaType} source used for the reference.` })))] : []), ...(llms.format === 'grouped' && optional.length ? ['', '## Optional', '', optionalList] : [])].join('\n') + '\n';
  addPublicArtifact('/llms.txt', discovery + tabLinks + (tabLinks ? '\n' : ''));
  const publications = [...new Set(rendered.map(page => `${page.doc.variant.channel}/${page.doc.variant.version}/${page.doc.variant.language}`))].sort();
  const pageSizes = new Map(manifest.documents.map(page => [page.markdownUrl, page]));
  const compactSummary = (page: ArtifactPage) => {
    const size = pageSizes.get(page.doc.markdownRoute)!;
    return `${page.doc.frontmatter.type}; ${size.markdownTokens} tokens. ${discoveryEntry(page).summary}`;
  };
  const compactEntries = [...rendered].sort((a, b) => a.doc.route.localeCompare(b.doc.route)).map(page => {
    const entry = discoveryEntry(page);
    const publication = `${page.doc.variant.channel}/${page.doc.variant.version}/${page.doc.variant.language}`;
    const approved = (page.sections ?? []).filter(section => section.standalone === true);
    return [paragraph(link(entry.url, `${page.doc.frontmatter.id} · ${entry.title}${publications.length > 1 ? ` (${publication})` : ''}`), text(`: ${compactSummary(page)}`)),
      ...(approved.length ? [list(approved.map(section => [paragraph(
        text('Standalone section: '), link(section.markdownUrl, section.title),
        text(` — ${section.markdownTokens} tokens (${section.markdownTokenEncoding}), ${section.markdownBytes} UTF-8 bytes. `),
        link(entry.url, 'Full page'), text('.'))]))] : [])];
  });
  const compactList = renderMarkdown(root([list(compactEntries)])).trimEnd();
  const compactIntro = renderMarkdown(root([
    heading(1, String(config.site.title)),
    paragraph(text(`Full-page token counts use ${markdownTokenEncoding}. Fetch a matching full Markdown page by default. Use a listed standalone section only for its stated topic; for setup, broader questions, or missing context, follow Full page. Standalone is an author declaration, not proof of completeness.`)),
    paragraph(text(publications.length === 1 ? `Publication (channel/version/language): ${publications[0]}.` : 'Choose the matching channel/version/language shown on each page; keep that publication when following links.')),
    paragraph(link(publicPath('/llms.txt'), 'Full documentation index'), text('. Full manifests and search indexes are optional. A missing match does not establish that a feature exists or does not exist.')),
  ])).trimEnd();
  const topicEntries: DiscoveryEntry[] = rendered.flatMap(page => {
    const entry = discoveryEntry(page);
    const publication = `${page.doc.variant.channel}/${page.doc.variant.version}/${page.doc.variant.language}`;
    const area = Array.isArray(page.doc.frontmatter.area) ? page.doc.frontmatter.area[0] : page.doc.frontmatter.area;
    const topic = JSON.stringify([publication, area ?? page.doc.frontmatter.type]);
    const topicLabel = `${(area && manifest.taxonomy?.areas[area]?.label) || area || page.doc.frontmatter.type}${publications.length > 1 ? ` (${publication})` : ''}`;
    const title = `${page.doc.frontmatter.id} · ${entry.title}${publications.length > 1 ? ` (${publication})` : ''}`;
    const main = { key: entry.url, title, topic, topicLabel, markdown: renderMarkdown(root([list([[paragraph(link(entry.url, title), text(`: ${compactSummary(page)}`))]])])) };
    // Separate standalone records keep a page with many approved sections from
    // becoming one unsplittable entry. Each retains its full-page fallback.
    return [main, ...(page.sections ?? []).filter(section => section.standalone === true).map(section => ({
      key: section.markdownUrl, title: `${title} · ${section.title}`, topic, topicLabel,
      markdown: renderMarkdown(root([list([[paragraph(text(`${title} — Standalone section: `), link(section.markdownUrl, section.title), text(` — ${section.markdownTokens} tokens (${section.markdownTokenEncoding}), ${section.markdownBytes} UTF-8 bytes. `), link(entry.url, 'Full page'), text('.'))]])])),
    }))];
  });
  const addIndexes = (indexes: Map<string, string>) => {
    for (const [url, content] of indexes) {
      addArtifact(url, content);
      headers[url] = { 'Content-Type': 'text/plain; charset=utf-8' };
    }
  };
  addIndexes(boundedDiscovery({ route: publicPath('/llms.min.txt'), directory: publicPath('/.well-known/shoalrun/discovery'), intro: compactIntro, flat: `${compactIntro}${tabLinks}\n\n${compactList}\n`, entries: topicEntries }));
  for (const tab of tabs) {
    const members = manifest.documents.filter(doc => doc.navigationTab?.indexUrl === tab.indexUrl);
    const intro = renderMarkdown(root([
      heading(1, tab.label),
      paragraph(text(`Full-page token counts use ${markdownTokenEncoding}. Navigation section ID: ${tab.id}. Publication: ${tab.variant.channel}/${tab.variant.version}/${tab.variant.language}.`)),
      paragraph(link(outputUrl(publicPath('/llms.min.txt'), '/', siteOrigin, 'markdown', documentRoutes, basePath), 'All sections and published pages'), text('. This index covers this section only; shared and unlisted pages remain reachable through the global index. Reader views do not remove pages from this index.')),
    ])).trimEnd();
    const memberUrls = new Set(members.flatMap(doc => [doc.markdownUrl, ...doc.sections.filter(section => section.standalone === true).map(section => section.markdownUrl)]));
    const flat = intro + '\n\n' + renderMarkdown(root([list(members.map(doc => [paragraph(link(outputUrl(doc.markdownUrl, '/', siteOrigin, 'markdown', documentRoutes, basePath), doc.title), text(` — ID: ${doc.id}. ${doc.type}; ${doc.markdownTokens} tokens. ${doc.demo ? 'Fictional example. ' : ''}${doc.summary}`))]))]));
    addIndexes(boundedDiscovery({ route: tab.indexUrl, directory: `${tab.indexUrl.slice(0, -4)}-indexes`, intro, flat, entries: topicEntries.filter(entry => memberUrls.has(entry.key)) }));
  }
  for (const route of new Set(['/resource-headers.json', publicPath('/resource-headers.json')])) artifacts.set(route, JSON.stringify(headers, null, 2) + '\n');
  await addMcpArtifacts(artifacts, { ...config, searchSynonyms: synonyms }, manifest, rendered, headers, mcpAnalyticsModule);
  const buildId = publicationBuildId(artifacts);
  if (artifacts.has(mcpRuntimePath)) artifacts.set(mcpRuntimePath, JSON.stringify({ ...JSON.parse(String(artifacts.get(mcpRuntimePath))), buildId }));
  // Stamp existing metadata only after hashing to avoid self-referential digests.
  for (const route of new Set(['/documents.json', publicPath('/documents.json'), '/build-info.json', publicPath('/build-info.json')])) {
    const data = JSON.parse(String(artifacts.get(route)));
    artifacts.set(route, JSON.stringify({ ...data, buildId }, null, 2) + '\n');
  }
  addMetadataArtifact('/documents.sync.json', JSON.stringify(documentSnapshot(manifest, buildId)) + '\n');
  return { artifacts, buildId };
}
