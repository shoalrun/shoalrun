import { validateContentFilter } from './content-filter.js';
import { loadComponentPlugins } from './component-plugins.js';
import { resolveTaxonomy } from './taxonomy.js';
import { resolveMcp } from './mcp-config.js';
import { fictionalDocument, resolveLlmsDiscovery } from './llms-discovery.js';
import { resolveAnalytics } from './analytics.js';
import { navigationCounts } from './compiler-config.js';
import { validateAuthoringGuidance } from './authoring-guidance.js';
import { loadFreshness } from './freshness.js';
import { resolveAgentDiscovery } from './agent-discovery.js';
import { iconLicenseFile } from './icons.js';
import { bundledFontLicenses, bundledFonts, fontsCss, resolveFonts } from './fonts.js';
import { bundledShareFonts, resolveShareImages, shareRoute } from './share-images.js';
import { buildInfo, type BuildProvenance } from './build-info.js';
import { CardUse, publicationRelationships, resolveCardTree, validateRelationships } from './cards.js';
import { resolveCookbookTree, validateCookbooks } from './cookbook-chooser.js';
import { createHash } from 'node:crypto';
import { existsSync, realpathSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { commitArtifacts } from './output-commit.js';
import { validateSearchSynonyms } from './search-synonyms.js';
import { fileURLToPath } from 'node:url';
import { createCodeHighlighter } from './highlight.js';
import { resolveDiagramTrees } from './diagrams.js';
import { ApiShape, NamedExample } from './api.js';
import { ApiEmbedUse, resolveApiEmbedTree } from './api-embeds.js';
import { calloutToneProblems, contrastProblems, Mode, paletteCatalog, paletteCss, presetCatalog, resolvePalette } from './palettes.js';
import { buildHtmlPage, Document, FooterConfig, HeaderConfig, SiteLink, heading, link, list, markdownRoute, parse, paragraph, projectMetadata, renderMarkdown, root, text, transformMdx, Variant } from './content.js';
import { resolveCalloutTypes } from './callouts.js';
import { badgeContrastProblems, badgeCss, resolveBadgeVariants } from './badges.js';
import { explain, explainSegments, loadConfig } from './config.js';
import { focusedOpenApi } from './focused-openapi.js';
import { frontmatterReference, frontmatterSchema, defaultLanguage } from './frontmatter.js';
import { OperationNavEntry, navigationPath, resolveProjectNavigation, validateProjectNavigation } from './project-navigation.js';
import { SnippetDefinition, SnippetUse, validateSnippetConfig } from './snippets.js';
import { loadMetadataProvider } from './metadata-provider.js';
import { surfaceText, validateTextSurfaces } from './surface-text.js';
import { validateReaderFilters } from './reader-filters.js';
import { planAuthoredDocuments } from './publication-plan.js';
import { assembleArtifacts } from './artifact-bundle.js';
import { materializeApiReferences } from './api-publication-plan.js';
import { materializePages } from './page-materialization.js';
import { renderPublicationPages } from './publication-render.js';
import { buildPublicationManifest } from './publication-manifest.js';
import { configField, isConfigMapping, requirePublicationsSection, requireSiteSection, resolvedCompilerConfig, type CompilerSiteConfig, type CompilerPublicationsConfig } from './compiler-config.js';
import { validateRetrieval } from './retrieval-config.js';
import { validateChat } from './chat-config.js';
import { sitemapFiles } from './sitemap.js';
import { normalizeBasePath, sitePath } from './site-path.js';
import { outputUrl, publicTree, resolveOutputLinks } from './representation-tree.js';
const generatedReferenceBody = 'This reference is generated from the OpenAPI description. It shows the operation contract; follow any related guides below for task steps and context.\n';
const generatedWebhookBody = 'This webhook reference is generated from the OpenAPI description. The provider sends this event to the receiver.\n';

const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const keyFor = (id: string, variant: Variant) => `${id}|${variant.channel}|${variant.version}|${variant.language}`;
// Real paths, resolved through the nearest existing parent so paths not yet created compare correctly.
const canonical = (file: string): string => {
  const resolved = path.resolve(file);
  try { return realpathSync(resolved); }
  catch {
    const parent = path.dirname(resolved);
    return parent === resolved ? resolved : path.join(canonical(parent), path.basename(resolved));
  }
};
const within = (directory: string, file: string) => {
  const relative = path.relative(directory, file);
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
};
// The build deletes its output directory, so that directory must not hold the project or anything the build reads.
function checkOutputDirectory(destination: string, projectRoot: string, contentDir: string, inputs: string[]) {
  const target = canonical(destination);
  for (const [label, directory] of [['project directory', projectRoot], ['content directory', contentDir]]) {
    if (within(target, canonical(directory))) throw new Error(`Output directory ${target} is or contains the ${label} ${canonical(directory)}; the build deletes its output, so choose a separate directory such as ${path.join(canonical(projectRoot), 'dist')}`);
  }
  if (within(canonical(contentDir), target)) throw new Error(`Output directory ${target} is inside the content directory; later builds would read its Markdown as pages`);
  const input = inputs.map(canonical).find(file => within(target, file));
  if (input) throw new Error(`Output directory ${target} contains build input ${input}; the build deletes its output, so choose a separate directory`);
}
type SearchSetup = { provider: 'lexical' | 'custom' | 'none'; module?: string; index: boolean };
function validateSearch(value: unknown, declaringFile: string): SearchSetup {
  if (value === undefined) return { provider: 'lexical', module: builtInSearchProvider, index: true };
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('outputs.html.search must be a mapping');
  const config = value as Record<string, unknown>;
  const provider = config.provider ?? 'lexical';
  const allowed = provider === 'custom' ? ['provider', 'module', 'index'] : ['provider'];
  for (const key of Object.keys(config)) if (!allowed.includes(key)) throw new Error(`Unsupported search setting ${key} for ${provider}`);
  if (provider === 'none') return { provider, index: false };
  if (provider === 'lexical') return { provider, module: builtInSearchProvider, index: true };
  if (provider !== 'custom') throw new Error(`Unknown search provider ${provider}`);
  if (typeof config.module !== 'string' || !/\.m?js$/.test(config.module)) throw new Error('Custom search needs a local .js or .mjs browser module');
  if (config.index !== undefined && typeof config.index !== 'boolean') throw new Error('outputs.html.search.index must be true or false');
  return { provider, module: path.resolve(path.dirname(declaringFile), config.module), index: config.index ?? false };
}
const builtInSearchProvider = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../assets/search-lexical.js');

// Each shape preset has a default palette; palettes live in styles/themes/palettes.
export const themePresets: Record<string, string> = Object.fromEntries(presetCatalog.map(preset => [preset.name, preset.palette]));

function validateHeader(value: unknown): HeaderConfig {
  if (value === undefined) return { links: [] };
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('site.header must be a mapping');
  const { links = [], ...extra } = value as Record<string, unknown>;
  if (Object.keys(extra).length) throw new Error(`site.header does not accept ${Object.keys(extra).join(', ')}`);
  if (!Array.isArray(links)) throw new Error('site.header.links must be a list');
  return {
    links: links.map((link, index) => {
      const where = `site.header.links[${index}]`;
      const { style = 'link', ...rest } = (link && typeof link === 'object' && !Array.isArray(link) ? link : {}) as Record<string, unknown>;
      const checked = validateSiteLink(link, where, rest);
      if (style !== 'link' && style !== 'button' && style !== 'primary') throw new Error(`${where}.style must be link, button, or primary`);
      return { ...checked, style };
    })
  };
}

// Header and footer links share one rule: a label and a site path, http(s) URL, or mailto link.
function validateSiteLink(link: unknown, where: string, fields = link as Record<string, unknown>): SiteLink {
  if (!link || typeof link !== 'object' || Array.isArray(link)) throw new Error(`${where} must be a mapping`);
  const { label, href, ...rest } = fields;
  if (Object.keys(rest).length) throw new Error(`${where} does not accept ${Object.keys(rest).join(', ')}`);
  if (typeof label !== 'string' || !label.trim()) throw new Error(`${where}.label is required`);
  if (typeof href !== 'string' || !/^(\/|https?:\/\/|mailto:)/.test(href)) throw new Error(`${where}.href must be a site path, http(s) URL, or mailto link`);
  return { label, href };
}

function validateFooter(value: unknown): FooterConfig | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('site.footer must be a mapping');
  const { columns = [], links = [], text, ...extra } = value as Record<string, unknown>;
  if (Object.keys(extra).length) throw new Error(`site.footer does not accept ${Object.keys(extra).join(', ')}`);
  if (!Array.isArray(columns)) throw new Error('site.footer.columns must be a list');
  if (!Array.isArray(links)) throw new Error('site.footer.links must be a list');
  if (text !== undefined && (typeof text !== 'string' || !text.trim())) throw new Error('site.footer.text must be non-empty text');
  const footer: FooterConfig = {
    columns: columns.map((column, index) => {
      const where = `site.footer.columns[${index}]`;
      if (!column || typeof column !== 'object' || Array.isArray(column)) throw new Error(`${where} must be a mapping`);
      const { title, links: columnLinks, ...rest } = column as Record<string, unknown>;
      if (Object.keys(rest).length) throw new Error(`${where} does not accept ${Object.keys(rest).join(', ')}`);
      if (typeof title !== 'string' || !title.trim()) throw new Error(`${where}.title is required`);
      if (!Array.isArray(columnLinks) || !columnLinks.length) throw new Error(`${where}.links must list at least one link`);
      return { title, links: columnLinks.map((link, linkIndex) => validateSiteLink(link, `${where}.links[${linkIndex}]`)) };
    }),
    links: links.map((link, index) => validateSiteLink(link, `site.footer.links[${index}]`)),
    ...(typeof text === 'string' ? { text } : {})
  };
  if (!footer.columns.length && !footer.links.length && !footer.text) throw new Error('site.footer needs columns, links, or text');
  return footer;
}

const contrastFailuresFor = (palette: Awaited<ReturnType<typeof resolvePalette>>, modes: Mode[], calloutTypes: ReturnType<typeof resolveCalloutTypes>, badgeVariants: ReturnType<typeof resolveBadgeVariants>) => {
  const customTones = new Map([...calloutTypes.values()].flatMap(type => type.colors ? [[type.tone, type.colors] as const] : []));
  return [...contrastProblems(palette, modes), ...calloutToneProblems(customTones, palette, modes), ...badgeContrastProblems(badgeVariants, palette, modes)];
};
const contrastMessage = (failures: string[]) => `Theme colors fail WCAG 2.2 contrast:\n${failures.map(line => `  - ${line}`).join('\n')}`;

// The contrast check the build runs, without building: `config validate` uses it so CI can check colors quickly.
export async function checkThemeContrast(configFile: string): Promise<{ modes: Mode[]; palette: string }> {
  const config = resolvedCompilerConfig((await loadConfig(configFile)).value);
  const preset = configField(config.theme, 'preset') ?? 'shoal';
  if (typeof preset !== 'string' || !Object.hasOwn(themePresets, preset)) throw new Error(`theme.preset must be one of ${Object.keys(themePresets).join(', ')}`);
  const mode = configField(config.theme, 'mode') ?? 'light';
  if (mode !== 'light' && mode !== 'dark' && mode !== 'system') throw new Error('theme.mode must be light, dark, or system');
  const modes: Mode[] = mode === 'system' ? ['light', 'dark'] : [mode];
  const palette = await resolvePalette(configField(config.theme, 'palette'), themePresets[preset]);
  const failures = contrastFailuresFor(palette, modes, resolveCalloutTypes(config.callouts, configFile), resolveBadgeVariants(config.badges, configFile));
  if (failures.length) throw new Error(contrastMessage(failures));
  return { modes, palette: palette.name };
}

export async function compile(configFile: string, destination?: string, provenance: BuildProvenance = {}, options: { apiReview?: 'report'; sourceOverrides?: ReadonlyMap<string, string>; authoringFiles?: ReadonlySet<string> } = {}) {
  const loaded = await loadConfig(configFile);
  const componentPlugins = await loadComponentPlugins(loaded);
  const provenanceRecord = buildInfo(loaded.digest, provenance);
  const resolvedConfig = resolvedCompilerConfig(loaded.value);
  const synonyms = validateSearchSynonyms(configField(resolvedConfig.search, 'synonyms'));
  const cookbooks = validateCookbooks(resolvedConfig.cookbooks, configFile);
  const mapping = (value: unknown) => !!value && typeof value === 'object' && !Array.isArray(value);
  const site = requireSiteSection(resolvedConfig);
  const basePath = normalizeBasePath(site.basePath);
  site.basePath = basePath;
  const publicPath = (route: string) => sitePath(basePath, route);
  requirePublicationsSection(resolvedConfig);
  const config = resolvedConfig as typeof resolvedConfig & { site: CompilerSiteConfig; publications: CompilerPublicationsConfig };
  const calloutTypes = resolveCalloutTypes(config.callouts, configFile);
  const badgeVariants = resolveBadgeVariants(config.badges, configFile);
  const htmlOptions = configField(config.outputs, 'html');
  const highlighting = configField(htmlOptions, 'highlighting');
  const highlightingOrigin = configField(highlighting, 'module') === undefined ? configFile : explainSegments(loaded, ['outputs', 'html', 'highlighting', 'module']).source.file;
  const highlighter = await createCodeHighlighter(highlighting, highlightingOrigin);
  const base = path.dirname(path.resolve(configFile));
  if (config.site.customCss !== undefined && (typeof config.site.customCss !== 'string' || !config.site.customCss.endsWith('.css'))) throw new Error('site.customCss must be a local .css path');
  const customStyleFile = config.site.customCss === undefined ? undefined : path.resolve(path.dirname(explainSegments(loaded, ['site', 'customCss']).source.file), config.site.customCss);
  const rawTheme = config.theme ?? {};
  if (typeof rawTheme !== 'object' || Array.isArray(rawTheme) || Object.keys(rawTheme).some(key => !['preset', 'palette', 'mode', 'toggle', 'fonts'].includes(key))) throw new Error('theme accepts only preset, palette, mode, toggle, and fonts');
  const theme = rawTheme as Record<string, unknown>;
  const themePreset = theme.preset ?? 'shoal';
  if (typeof themePreset !== 'string' || !Object.hasOwn(themePresets, themePreset)) throw new Error(`theme.preset must be one of ${Object.keys(themePresets).join(', ')}`);
  const rawColorMode = theme.mode ?? 'light';
  if (rawColorMode !== 'light' && rawColorMode !== 'dark' && rawColorMode !== 'system') throw new Error('theme.mode must be light, dark, or system');
  const colorMode: Mode | 'system' = rawColorMode;
  const modeToggle = theme.toggle ?? (colorMode === 'system');
  if (typeof modeToggle !== 'boolean') throw new Error('theme.toggle must be true or false');
  if (modeToggle && colorMode !== 'system') throw new Error('theme.toggle needs theme.mode: system');
  const palette = await resolvePalette(theme.palette, themePresets[themePreset]);
  const shownModes: Mode[] = colorMode === 'system' ? ['light', 'dark'] : [colorMode];
  const contrastFailures = contrastFailuresFor(palette, shownModes, calloutTypes, badgeVariants);
  if (contrastFailures.length) throw new Error(contrastMessage(contrastFailures));
  const themeDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../styles/themes');
  const themeStyleFile = themePreset === 'shoal' ? undefined : path.join(themeDirectory, `${themePreset}.css`);
  // kelp in light mode is the base token set in tokens.css, so it needs no extra stylesheet.
  const generatedPaletteCss = palette.name === 'kelp' && colorMode === 'light' ? undefined : paletteCss(palette, colorMode);
  const generatedBadgeCss = badgeCss(badgeVariants, colorMode);
  const fonts = resolveFonts(theme.fonts, themePreset, theme.fonts === undefined ? configFile : explainSegments(loaded, ['theme', 'fonts']).source.file);
  for (const face of fonts.faces) if (!existsSync(face.file)) throw new Error(`theme.fonts: font file not found: ${face.file}`);
  for (const face of fonts.faces) if (fonts.faces.some(other => other.route === face.route && other.file !== face.file)) throw new Error(`theme.fonts: two font files share the name ${path.basename(face.file)}; rename one`);
  const generatedFontsCss = fontsCss(fonts);
  // A temporary preview aid: a floating shape and palette switcher on every page. Remove it before launch.
  // `demo` ships it hidden until a page is opened with ?theme-switcher.
  const themeSwitcherSetting = configField(htmlOptions, 'themeSwitcher') ?? false;
  navigationCounts(config.outputs);
  if (typeof themeSwitcherSetting !== 'boolean' && themeSwitcherSetting !== 'demo') throw new Error('outputs.html.themeSwitcher must be true, false, or demo');
  const themeSwitcher = themeSwitcherSetting !== false;
  const themeSwitcherData = themeSwitcher ? JSON.stringify({ presets: presetCatalog.map(({ name, palette, masthead }) => ({ name, palette, masthead })), palettes: paletteCatalog.map(palette => palette.name), demo: themeSwitcherSetting === 'demo' }) : undefined;
  const shareImageSetting = configField(htmlOptions, 'shareImages');
  const shareImages = resolveShareImages(shareImageSetting, shareImageSetting === undefined ? configFile : explainSegments(loaded, ['outputs', 'html', 'shareImages']).source.file);
  const siteOrigin = typeof config.site.origin === 'string' ? config.site.origin.replace(/\/+$/, '') : undefined;
  if (config.site.indexing !== undefined && typeof config.site.indexing !== 'boolean') throw new Error('site.indexing must be true or false');
  if (config.site.updated !== undefined && (typeof config.site.updated !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(config.site.updated) || Number.isNaN(Date.parse(`${config.site.updated}T00:00:00Z`)) || new Date(`${config.site.updated}T00:00:00Z`).toISOString().slice(0, 10) !== config.site.updated)) throw new Error('site.updated must be a real YYYY-MM-DD date');
  if (siteOrigin && (new URL(siteOrigin).protocol !== 'https:' || new URL(siteOrigin).origin !== siteOrigin)) throw new Error('site.origin must be an HTTPS origin without a path');
  if (config.site.favicon !== undefined && (typeof config.site.favicon !== 'string' || !/\.(?:svg|png)$/i.test(config.site.favicon))) throw new Error('site.favicon must be a local .svg or .png file');
  const faviconFile = config.site.favicon === undefined ? undefined : path.resolve(path.dirname(explainSegments(loaded, ['site', 'favicon']).source.file), config.site.favicon);
  if (faviconFile && !existsSync(faviconFile)) throw new Error(`site.favicon: file not found: ${faviconFile}`);
  const faviconRoute = publicPath(faviconFile?.toLowerCase().endsWith('.png') ? '/favicon.png' : '/favicon.svg');
  const shareFontFiles = [...bundledShareFonts(), ...shareImages.fonts, ...fonts.faces.map(face => face.file).filter(file => /\.(?:ttf|otf)$/i.test(file))];
  const shareCache = path.join(base, '.shoalrun/cache/share-images');
  const fontDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../styles/fonts');
  const fontFiles = fonts.bundled ? [...bundledFonts.map(font => font.file), ...bundledFontLicenses].map(name => path.join(fontDirectory, name)) : [];
  resolveAgentDiscovery(config.site.agentDiscovery);
  const header = validateHeader(config.site.header);
  const footer = validateFooter(config.site.footer);
  const searchSetting = configField(htmlOptions, 'search');
  const search = validateSearch(searchSetting, searchSetting === undefined ? configFile : explainSegments(loaded, ['outputs', 'html', 'search']).source.file);
  const readerFilters = validateReaderFilters(config.readerFilters);
  const contentFilter = validateContentFilter(config.site.contentFilter, readerFilters);
  const customReaderModule = readerFilters?.module ? path.resolve(path.dirname(explainSegments(loaded, ['readerFilters', 'module']).source.file), readerFilters.module) : undefined;
  const mcp = resolveMcp(config.mcp);
  const mcpAnalyticsModule = mcp?.analytics ? path.resolve(path.dirname(explainSegments(loaded, ['mcp', 'analytics', 'module']).source.file), mcp.analytics.module) : undefined;
  const analyticsModule = resolveAnalytics(config.analytics, config.analytics === undefined || config.analytics === false ? configFile : explainSegments(loaded, ['analytics', 'module']).source.file);
  validateTextSurfaces(configField(config.outputs, 'text'));
  validateAuthoringGuidance(config.authoring);
  validateRetrieval(config.retrieval);
  validateChat(config.chat, readerFilters);
  if (config.metadata !== undefined && (!config.metadata || typeof config.metadata !== 'object' || Array.isArray(config.metadata) || Object.keys(config.metadata).some(key => key !== 'provider'))) throw new Error('metadata accepts only provider');
  const providerSetting = configField(config.metadata, 'provider');
  const metadataProvider = await loadMetadataProvider(providerSetting, providerSetting ? explainSegments(loaded, ['metadata', 'provider', 'module']).source.file : configFile);
  const metadataDependencies = new Set<string>();
  const language = defaultLanguage(config);
  const enabledVariants = config.publications.enabled ?? [];
  if (!Array.isArray(enabledVariants)) throw new Error('publications.enabled must declare at least one variant');
  const variants: Variant[] = enabledVariants.map((variant: unknown) => {
    if (!isConfigMapping(variant) || typeof variant.channel !== 'string' || typeof variant.version !== 'string' || (variant.language !== undefined && typeof variant.language !== 'string')) throw new Error('publications.enabled needs channel, version, and optional language');
    return { ...variant, channel: variant.channel, version: variant.version, language: variant.language ?? language } as Variant;
  });
  if (!variants.length) throw new Error('publications.enabled must declare at least one variant');
  const externalSites = config.publications.externalSites ?? [];
  if (!Array.isArray(externalSites)) throw new Error('publications.externalSites must be a list');
  const externalManifestFiles: string[] = [];
  const externalSiteLinks: Array<{ label: string; url: string; current: false }> = [];
  const externalDocuments = new Map<string, Array<{ label: string; variant: Variant; url: string }>>();
  for (const [index, site] of externalSites.entries()) {
    const setting = `publications.externalSites.${index}`;
    if (!mapping(site) || Object.keys(site).some(key => !['label', 'baseUrl', 'manifest'].includes(key)) || typeof site.label !== 'string' || !site.label.trim() || typeof site.baseUrl !== 'string' || (site.manifest !== undefined && (typeof site.manifest !== 'string' || !site.manifest.trim()))) {
      throw new Error(`${setting} needs label and baseUrl; manifest must be a local path when provided`);
    }
    let baseUrl: URL;
    try { baseUrl = new URL(site.baseUrl); }
    catch { throw new Error(`${setting}.baseUrl must be an HTTP(S) URL without a query or fragment`); }
    if (!['http:', 'https:'].includes(baseUrl.protocol) || baseUrl.username || baseUrl.password || baseUrl.search || baseUrl.hash) {
      throw new Error(`${setting}.baseUrl must be an HTTP(S) URL without credentials, query, or fragment`);
    }
    if (site.manifest === undefined) {
      externalSiteLinks.push({ label: site.label.trim(), url: `${baseUrl.href.replace(/\/+$/, '')}/`, current: false });
      continue;
    }
    const origin = explainSegments(loaded, ['publications', 'externalSites', String(index), 'manifest']).source.file;
    const file = path.resolve(path.dirname(origin), site.manifest);
    externalManifestFiles.push(file);
    let published: unknown;
    try { published = JSON.parse(await readFile(file, 'utf8')); }
    catch (error) { throw new Error(`${setting}.manifest cannot be read as JSON: ${(error as Error).message}`); }
    if (!isConfigMapping(published) || published.schemaVersion !== 1 || !Array.isArray(published.documents)) throw new Error(`${setting}.manifest needs a Shoalrun documents.json`);
    const seen = new Set<string>();
    for (const rawDocument of published.documents as unknown[]) {
      const document = isConfigMapping(rawDocument) ? rawDocument : {};
      const rawVariant = document.variant;
      const route = document.url;
      if (typeof document.id !== 'string' || !document.id || !isConfigMapping(rawVariant) || ['channel', 'version', 'language'].some(field => typeof rawVariant[field] !== 'string' || !rawVariant[field]) || typeof route !== 'string' || !route.startsWith('/') || route.startsWith('//') || route.includes('..') || /[?#\\]|%2f|%5c/i.test(route)) {
        throw new Error(`${setting}.manifest has an invalid document identity, publication, or URL`);
      }
      const variant = rawVariant as Variant;
      const key = keyFor(document.id, variant);
      if (seen.has(key)) throw new Error(`${setting}.manifest has duplicate document ${key}`);
      seen.add(key);
      const url = new URL(route.slice(1), `${baseUrl.href.replace(/\/+$/, '')}/`);
      if (url.origin !== baseUrl.origin || !url.pathname.startsWith(`${baseUrl.pathname.replace(/\/+$/, '')}/`)) throw new Error(`${setting}.manifest has a URL outside baseUrl`);
      const matches = externalDocuments.get(document.id) ?? [];
      matches.push({ label: site.label.trim(), variant, url: url.href });
      externalDocuments.set(document.id, matches);
    }
  }
  const editionBadge = config.site.editionBadge ?? 'auto';
  if (editionBadge !== 'auto' && editionBadge !== 'always' && editionBadge !== 'never') throw new Error('site.editionBadge must be auto, always, or never');
  const varying = (field: keyof Variant) => new Set(variants.map(variant => variant[field])).size > 1;
  const editionLabel = (variant: Variant) => editionBadge === 'never' ? '' : (['channel', 'version', 'language'] as const)
    .filter(field => editionBadge === 'always' || varying(field)).map(field => variant[field]).join(' · ');
  const { docs, knownDocumentIds, knownDocumentTypes, authoredOperationIds, routeOwners, contentDir } = await planAuthoredDocuments({
    base, basePath, config, variants, language, readerFilters, contentFilter, metadataProvider, metadataDependencies, sourceOverrides: options.sourceOverrides, authoringFiles: options.authoringFiles
  });
  if (config.snippets !== undefined && (!config.snippets || typeof config.snippets !== 'object' || Array.isArray(config.snippets))) throw new Error('snippets must be a mapping');
  const snippets = new Map<string, SnippetDefinition>();
  for (const [id, definition] of Object.entries(config.snippets as Record<string, unknown> ?? {})) {
    const variables = validateSnippetConfig(id, definition);
    const source = explainSegments(loaded, ['snippets', id, 'file']).source.file;
    const file = path.resolve(path.dirname(source), (definition as { file: string }).file);
    const body = await readFile(file, 'utf8');
    if (/^---\r?\n/.test(body)) throw new Error(`${file}: snippets use plain Markdown without page frontmatter`);
    snippets.set(id, { file, tree: parse.parse(body), variables });
  }
  if (config.variables !== undefined && (!config.variables || typeof config.variables !== 'object' || Array.isArray(config.variables))) throw new Error('variables must be a mapping');
  const apiPlan = await materializeApiReferences({
    config, loaded, variants, docs, knownDocumentIds, knownDocumentTypes, authoredOperationIds, routeOwners, basePath, readerFilters, contentFilter
  });
  const { api, sourceForVariant, knownOperations } = apiPlan;
  if (contentFilter && !docs.size) throw new Error('site.contentFilter matched no published pages; check page facets and enabled publications');
  const relatedApiTargets = new Map<string, Document[]>();
  const guidesByApi = new Map<string, Document[]>();
  for (const doc of docs.values()) {
    const targets: Document[] = [];
    for (const id of doc.frontmatter.relatedApiReferences ?? []) {
      if (!knownDocumentIds.has(id)) throw new Error(`${doc.file}: unknown related API reference ${id}`);
      if (knownDocumentTypes.get(id) !== 'api-reference') throw new Error(`${doc.file}: related API reference ${id} must identify an api-reference page`);
      const target = docs.get(keyFor(id, doc.variant));
      if (!target) continue;
      targets.push(target);
      const key = keyFor(target.frontmatter.id, target.variant);
      const guides = guidesByApi.get(key) ?? [];
      guides.push(doc);
      guidesByApi.set(key, guides);
    }
    relatedApiTargets.set(keyFor(doc.frontmatter.id, doc.variant), targets);
  }
  const sourceForOperation = (operationId: string, variant: Variant) => {
    const known = knownOperations.get(operationId);
    if (!known) throw new Error(`unknown stable operation ${operationId}`);
    const definition = apiPlan.apiDefinitions[known.apiId];
    const operation = definition?.operations?.find(entry => entry.id === operationId);
    if (!definition || !operation) throw new Error(`unknown stable operation ${operationId}`);
    if (!operation.sourceOperationId) throw new Error(`API ${known.apiId} operation needs sourceOperationId`);
    const binding = sourceForVariant(known.apiId, definition, variant);
    if (!binding) throw new Error(`no OpenAPI source for ${variant.channel}/${variant.version} (${operationId})`);
    return { ...binding, sourceOperationId: operation.sourceOperationId };
  };
  let navigationSpec: ReturnType<typeof validateProjectNavigation>;
  try {
    navigationSpec = validateProjectNavigation(config.navigation ?? [], docs, knownOperations, new Set(Object.keys(config.apis ?? {})));
  } catch (error) {
    const source = config.navigation === undefined ? configFile : explain(loaded, 'navigation').source.file;
    throw new Error(`${(error as Error).message} (navigation source: ${source})`);
  }
  let relationships: ReturnType<typeof validateRelationships>;
  try { relationships = validateRelationships(config.relationships, knownDocumentIds); }
  catch (error) {
    const origin = config.relationships === undefined ? configFile : explain(loaded, 'relationships').source.file;
    throw new Error(`${origin}: ${(error as Error).message}`);
  }
  const cardUses = new Map<Document, CardUse>();
  const publishedRelationships: Array<ReturnType<typeof validateRelationships>[number] & { variant: Variant }> = [];
  const styleFiles = ['site.css', 'tokens.css', 'header.css'].map(name => path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../styles', name));
  const scriptFiles = [...(analyticsModule ? ['analytics.js'] : []), 'code-samples.js', 'cookbook-chooser.js', 'example-panel.js', 'mode.js', 'copy-markdown.js', 'components.js', 'navigation.js', 'reader.js', ...(readerFilters ? ['reader-filters.js'] : []), 'search-highlight.js', 'search.js', 'table-filter.js', 'tabs.js', 'tooltips.js', 'file-tree.js', 'image-viewer.js', 'walkthrough.js'].map(name => path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../assets', name));
  const documentRoutes = new Set([...docs.values()].map(doc => doc.route));
  const { apiPublications, focusedContracts, navigationEntries, navigationTagOrder, rendered, snippetUses, apiEmbedUses, operations } = await materializePages({
    variables: isConfigMapping(config.variables) ? config.variables : {}, frontmatterConfig: config.frontmatter,
    publications: config.publications, docs, apiPlan, sourceForOperation, snippets, calloutTypes, badgeVariants, componentPlugins: componentPlugins.registry,
    readerFilters, base, publicPath, relatedApiTargets, guidesByApi
  });
  const diagramAssets = await resolveDiagramTrees(rendered.map(page => page.doc.tree), path.join(base, '.shoalrun/cache/diagrams'), basePath, palette);
  // A page's own image replaces its generated card; shareImages: false keeps only those.
  const shareFor = (doc: Document) => {
    if (doc.frontmatter.image) {
      const file = path.resolve(path.dirname(doc.file), doc.frontmatter.image);
      if (!existsSync(file)) throw new Error(`${doc.file}: image not found: ${file}`);
      return { route: publicPath(`/assets/share${doc.route === basePath || doc.route === '/' ? '/index' : doc.route.slice(basePath.length)}${path.extname(file).toLowerCase()}`), generated: false, file };
    }
    return shareImages.enabled ? { route: publicPath(shareRoute(doc.route.slice(basePath.length) || '/')), generated: true } : undefined;
  };
  // Local component and Markdown images publish beside their page under /assets/pages.
  const heroImages = new Map<string, string>();
  const walkthroughSources = new Set<string>();
  const collectPageAssets = (value: unknown) => {
    if (!isConfigMapping(value)) return;
    const image = value.image;
    if (value.type === 'docHero' && isConfigMapping(image) && typeof image.url === 'string' && typeof image.file === 'string') {
      const route = publicPath(image.url);
      image.url = route;
      heroImages.set(route, image.file);
    }
    if (['docImage', 'image', 'definition'].includes(String(value.type)) && typeof value.url === 'string' && typeof value.file === 'string') {
      const route = publicPath(value.url);
      value.url = route;
      heroImages.set(route.split(/[?#]/)[0], value.file);
    }
    if (value.type === 'docWalkthrough' && Array.isArray(value.sources)) {
      for (const file of value.sources) if (typeof file === 'string') walkthroughSources.add(file);
    }
    if (Array.isArray(value.children)) for (const child of value.children) collectPageAssets(child);
    // Procedure bodies live on items rather than the container's children.
    if ((value.type === 'docSteps' || value.type === 'docTimeline') && Array.isArray(value.items)) {
      for (const item of value.items) collectPageAssets(item);
    }
  };
  for (const page of rendered) {
    collectPageAssets(page.doc.tree);
  }
  const freshness = await loadFreshness(config.site.freshness, base);
  const resolvedNavigation = renderPublicationPages({
    freshness,
    rendered, docs, relationships, knownOperations, cardUses, publishedRelationships, cookbooks, documentRoutes,
    basePath, siteOrigin, colorMode, config, highlighter, editionLabel, customStyleFile, themePreset, palette,
    themeStyleFile, generatedPaletteCss, generatedBadgeCss, themeSwitcherData, generatedFontsCss, fontsPreload: fonts.preload,
    shareFor, faviconRoute, modeToggle, header, footer, search, readerFilters, variants, externalDocuments,
    externalSiteLinks, navigationSpec, navigationEntries, navigationTagOrder
  });
  // The theme previewer and switcher re-theme pages in the browser, so every preset and palette ships only when one is used.
  const assetDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../assets');
  const previewFiles = themeSwitcher || rendered.some(page => page.html.includes('data-theme-preview')) ? [
    path.join(assetDirectory, 'theme-preview.js'), path.join(assetDirectory, 'theme-preview.css'), ...(themeSwitcher ? [path.join(assetDirectory, 'theme-switcher.js')] : []),
    ...presetCatalog.filter(preset => preset.name !== 'shoal').map(preset => path.join(themeDirectory, `${preset.name}.css`)),
    ...paletteCatalog.map(entry => path.join(themeDirectory, 'palettes', `${entry.name}.yaml`))
  ] : [];
  for (const [operationId, bindings] of Object.entries(operations)) {
    for (const variant of variants) {
      const inVariant = bindings.filter(b => b.channel === variant.channel && b.version === variant.version && b.language === variant.language);
      if (inVariant.filter(b => b.type === 'api-reference').length > 1) throw new Error(`Multiple canonical references for ${operationId}`);
    }
  }
  const redirects: Array<{ from: string; to: string; markdownFrom: string; markdownTo: string; status: number }> = [];
  const redirectSources = new Set<string>();
  const redirectRules = config.redirects ?? [];
  if (!Array.isArray(redirectRules)) throw new Error('redirects must be a list');
  for (const rule of redirectRules as unknown[]) {
    if (!isConfigMapping(rule) || typeof rule.from !== 'string' || !rule.from.startsWith('/')) throw new Error('Redirect source must be an absolute path');
    const sourceRoute = publicPath(rule.from);
    if (redirectSources.has(sourceRoute.toLowerCase())) throw new Error(`Duplicate redirect source ${rule.from}`);
    redirectSources.add(sourceRoute.toLowerCase());
    if (routeOwners.has(sourceRoute.toLowerCase())) throw new Error(`Redirect shadows a page: ${rule.from}`);
    if (rule.from.toLowerCase() === '/robots.txt' || /^\/sitemap(?:-\d+)?\.xml$/i.test(rule.from)) throw new Error(`Redirect shadows search discovery: ${rule.from}`);
    const to = rule.to;
    if (!isConfigMapping(to) || typeof to.doc !== 'string' || !to.doc || typeof to.channel !== 'string' || !to.channel || typeof to.version !== 'string' || !to.version || typeof to.language !== 'string' || !to.language) throw new Error(`Redirect ${rule.from} needs an explicit target variant`);
    const target = docs.get(keyFor(to.doc, { channel: to.channel, version: to.version, language: to.language }));
    if (!target) throw new Error(`Redirect ${rule.from} targets missing document variant`);
    const status = rule.status ?? 308;
    if (typeof status !== 'number' || ![301, 302, 303, 307, 308].includes(status)) throw new Error(`Redirect ${rule.from} status must be 301, 302, 303, 307, or 308`);
    // The old page's Markdown twin moves too, so its .md URL redirects to the target's twin.
    redirects.push({ from: sourceRoute, to: target.route, markdownFrom: markdownRoute(sourceRoute.replace(/(.)\/+$/, '$1'), basePath), markdownTo: target.markdownRoute, status });
  }
  const apiSources = [...apiPublications.values()].map(({ apiId, variant, endpoint, referenceUrl, sourceUrl, mediaType }) => ({ apiId, channel: variant.channel, version: variant.version, endpoint: endpoint ?? null, referenceUrl, sourceUrl, mediaType }));
  let catalog: { linkset: Array<Record<string, unknown>> } | null = null;
  const discoverable = apiSources.filter(item => item.endpoint);
  if (discoverable.length) {
    const origin = config.site.origin;
    if (typeof origin !== 'string' || !/^https:\/\/[^/]+$/.test(origin)) throw new Error('site.origin must be an HTTPS origin to publish the API catalog');
    for (const item of discoverable) if (!/^https:\/\/[^/]+/.test(item.endpoint!)) throw new Error(`API endpoint must be HTTPS: ${item.endpoint}`);
    catalog = { linkset: [
      { anchor: `${origin}${publicPath('/.well-known/api-catalog')}`, item: discoverable.map(item => ({ href: item.endpoint })) },
      ...discoverable.map(item => ({ anchor: item.endpoint, 'service-desc': [{ href: `${origin}${item.sourceUrl}`, type: item.mediaType }], 'service-doc': [{ href: `${origin}${item.referenceUrl}`, type: 'text/html' }] }))
    ] };
  }
  // Pin the source bytes and the API selections exposed by public pages. Authored
  // page copy can change without requiring a new review of imported material.
  const apiPublicationReview: Array<{ apiId: string; digest: string; pages: Array<{ id: string; url: string; markdownUrl: string }>; focusedContracts: string[]; fullSources: string[]; inputs: Array<{ source: string; files: Array<{ path: string; digest: string }> }> }> = [];
  for (const [apiId, definition] of Object.entries(apiPlan.apiDefinitions)) {
    const pages = rendered.filter(({ doc }) => {
      const reference = doc.frontmatter.type === 'api-reference' && doc.frontmatter.operations?.some(id => knownOperations.get(id)?.apiId === apiId);
      const embedded = apiEmbedUses.some(use => use.documentKey === keyFor(doc.frontmatter.id, doc.variant) && (use.api === apiId || (use.operation && knownOperations.get(use.operation)?.apiId === apiId)));
      return reference || embedded;
    }).sort((a, b) => a.doc.route.localeCompare(b.doc.route) || keyFor(a.doc.frontmatter.id, a.doc.variant).localeCompare(keyFor(b.doc.frontmatter.id, b.doc.variant)));
    if (!pages.length) continue;
    const bindings = new Map<string, ReturnType<typeof sourceForVariant>>();
    for (const { doc } of pages) {
      const key = `${doc.variant.channel}|${doc.variant.version}`;
      if (!bindings.has(key)) bindings.set(key, sourceForVariant(apiId, definition, doc.variant));
    }
    const inputs: Array<{ source: string; files: Array<{ path: string; digest: string }> }> = [];
    for (const [publication, binding] of [...bindings].sort(([a], [b]) => a.localeCompare(b))) {
      if (!binding) throw new Error(`Missing OpenAPI source for public API ${apiId} ${publication}`);
      const files = await api.collectReferences(binding.file);
      inputs.push({ source: publication, files: await Promise.all(files.map(async file => ({
        path: path.relative(path.dirname(binding.file), file).split(path.sep).join('/'),
        digest: createHash('sha256').update(await readFile(file)).digest('hex')
      }))) });
    }
    const reviewedPages = pages.map(({ doc }) => ({ id: doc.frontmatter.id, url: doc.route, markdownUrl: doc.markdownRoute }));
    const references = pages.filter(({ doc }) => doc.frontmatter.type === 'api-reference').flatMap(({ doc }) =>
      (doc.frontmatter.operations ?? []).filter(id => knownOperations.get(id)?.apiId === apiId).map(id => ({
        channel: doc.variant.channel, version: doc.variant.version, language: doc.variant.language,
        operation: sourceForOperation(id, doc.variant).sourceOperationId
      }))
    ).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    const embeds = apiEmbedUses.filter(use => use.api === apiId || (use.operation && knownOperations.get(use.operation)?.apiId === apiId))
      .map(({ sourceFile, documentKey, ...request }) => request)
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    const contracts = [...new Set(pages.map(({ doc }) => doc.focusedContractUrl).filter((url): url is string => !!url))].sort().map(url => ({ url, digest: focusedContracts.get(url)!.digest }));
    const fullSources = apiSources.filter(source => source.apiId === apiId).map(source => source.sourceUrl).sort();
    const fingerprint = digest(JSON.stringify({ version: 2, apiId, inputs, references, embeds, contracts: contracts.map(item => item.digest), fullSourcePublished: fullSources.length > 0 }));
    const review = definition.publicReview;
    if (review !== undefined && (!isConfigMapping(review) || Object.keys(review).some(key => key !== 'digest') || typeof review.digest !== 'string' || !/^[a-f0-9]{64}$/.test(review.digest))) {
      throw new Error(`apis.${apiId}.publicReview needs a lowercase SHA-256 digest`);
    }
    const reviewDigest = isConfigMapping(review) ? review.digest : undefined;
    apiPublicationReview.push({ apiId, digest: fingerprint, pages: reviewedPages, focusedContracts: contracts.map(item => item.url), fullSources, inputs });
    if (options.apiReview !== 'report' && reviewDigest !== fingerprint) {
      throw new Error(`apis.${apiId}.publicReview.digest is ${review ? 'stale' : 'missing'}; run shoalrun api review ${configFile} --output <local-directory>, inspect the candidate site, and pin the reported digest`);
    }
  }
  const manifestDependencies = [...new Set([...loaded.dependencies, ...componentPlugins.dependencies, ...externalManifestFiles, ...api.dependencies, ...(metadataProvider ? [metadataProvider.module] : []), ...metadataDependencies, ...(highlighter.dependency ? [highlighter.dependency] : []), ...styleFiles, ...(themeStyleFile ? [themeStyleFile] : []), ...palette.files, ...(search.module ? [search.module] : []), ...previewFiles, ...(customStyleFile ? [customStyleFile] : []), ...(customReaderModule ? [customReaderModule] : []), ...(analyticsModule ? [analyticsModule] : []), ...(mcpAnalyticsModule ? [mcpAnalyticsModule] : []), ...(shareImages.template ? [shareImages.template] : []), ...shareImages.fonts, ...(faviconFile ? [faviconFile] : []), ...heroImages.values(), ...walkthroughSources, ...fontFiles, ...fonts.faces.map(face => face.file), ...scriptFiles, iconLicenseFile, ...[...snippets.values()].map(s => s.file), ...[...docs.values()].map(d => d.file)])].sort();
  const llmsDiscovery = resolveLlmsDiscovery(configField(config.outputs, 'llms'));
  const { manifest, headers, sitemaps } = buildPublicationManifest({
    fictionalDocuments: new Set(rendered.filter(({ doc }) => fictionalDocument(doc, llmsDiscovery)).map(({ doc }) => doc)),
    configDigest: loaded.digest, synonyms, basePath, publicPath, readerFilters, taxonomy: resolveTaxonomy(configField(config.frontmatter, 'taxonomy')), dependencies: manifestDependencies,
    rendered, resolvedNavigation, cardUses, snippetUses, apiEmbedUses, focusedContracts, operations,
    publishedRelationships, redirects, apiSources, siteOrigin, siteIndexing: config.site.indexing !== false,
    siteUpdated: config.site.updated, diagramAssets, heroImages, faviconRoute, catalog
  });
  const artifactConfig = options.authoringFiles ? { ...config, mcp: false } : config;
  const { artifacts, buildId } = await assembleArtifacts({
    base, basePath, publicPath, canonical, siteOrigin, manifest, provenanceRecord, rendered, sitemaps,
    diagramAssets, heroImages, focusedContracts, styleFiles, themeStyleFile, generatedPaletteCss,
    generatedBadgeCss, search, synonyms, config: artifactConfig, builtInSearchProvider, customReaderModule, analyticsModule, mcpAnalyticsModule,
    previewFiles, assetDirectory, themeSwitcher, themeDirectory, palette, colorMode, generatedFontsCss,
    fontFiles, fonts, shareImages, shareFor, themePreset, shareFontFiles, shareCache, faviconFile,
    faviconRoute, customStyleFile, scriptFiles, componentAssets: componentPlugins.assets, redirects, apiPublications, api, catalog, headers,
    documentRoutes, readerFilters, apiSources
  });
  if (destination) {
    checkOutputDirectory(destination, base, contentDir, manifest.dependencies);
    const target = path.resolve(destination);
    await commitArtifacts(target, artifacts, async () => {
      const localGuide = path.join(base, '.shoalrun');
      await mkdir(localGuide, { recursive: true });
      await writeFile(path.join(localGuide, 'frontmatter-reference.md'), frontmatterReference(config.frontmatter));
      await writeFile(path.join(localGuide, 'frontmatter.schema.json'), JSON.stringify(frontmatterSchema(config.frontmatter), null, 2) + '\n');
    });
    // Authoring captures resolve revision dates without changing captured inputs.
    if (!options.authoringFiles) await freshness?.commit();
  }
  return { ...manifest, buildId, apiPublicationReview, ...(options.authoringFiles ? { authoringSources: rendered.map(({ doc }) => ({ id: doc.frontmatter.id, file: doc.file, url: doc.route, markdownUrl: doc.markdownRoute })) } : {}) };
}
