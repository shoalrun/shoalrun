import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig, explainSegments } from './config.js';
import { configField, isConfigMapping, requirePublicationsSection, requireSiteSection, resolvedCompilerConfig } from './compiler-config.js';
import { defaultLanguage } from './frontmatter.js';
import { normalizeBasePath, sitePath } from './site-path.js';
import { prepareContentWorkspace } from './content-workspace.js';
import { materializePages } from './page-materialization.js';
import { loadComponentPlugins } from './component-plugins.js';
import { loadMetadataProvider } from './metadata-provider.js';
import { validateReaderFilters } from './reader-filters.js';
import { matchesContentFilter, validateContentFilter } from './content-filter.js';
import { resolveCalloutTypes } from './callouts.js';
import { resolveBadgeVariants } from './badges.js';
import { resolveCardTree, publicationRelationships, validateRelationships } from './cards.js';
import { resolveCookbookTree, validateCookbooks } from './cookbook-chooser.js';
import { resolveDiagramTrees, peleLicenseFile } from './diagrams.js';
import { reviewApiPublication } from './api-publication-review.js';
import { validateExportTarget, type ExportFormat } from './content-export-config.js';
import { ExportAssets, exportDigest, type ExportAsset } from './content-export-assets.js';
import { portableTree, passiveHtml, portableMarkdown } from './content-export-render.js';
import { checkOutputDirectory } from './output-location.js';
import { commitArtifacts } from './output-commit.js';
import { heading, root, parse, transformMdx, type Document, type Variant } from './content.js';
import { outputUrl, publicTree } from './representation-tree.js';
import { resolveSubjectDeprecation, subjectDeprecationNotice } from './subject-deprecation.js';
import { resolveAuthoredChange, authoredChangeNotice } from './authored-change.js';

import { resolveSnippetValues } from './snippets.js';
import { isolateExportTree, markExportSource, exportHeadingInventory, preserveExportHeadingIds } from './content-export-anchors.js';
import { selectSection } from './section-identity.js';
import { compareContentManifests } from './content-export-comparison.js';
import type { ContentRef, ContentResource, ContentLink } from './content-delivery-contract.js';

export type ContentExportOptions = { target?: string; formats?: ExportFormat[]; documents?: string[]; publication?: Variant; publicBase?: string; review?: boolean; previousManifest?: string; failOnRemoved?: boolean };
type ExportLink = ContentLink;
type Representation = { path: string; mediaType: string; bytes: number; digest: string; anchors: Array<{ id: string; exportedId: string; title?: string }>; links: ExportLink[] };
const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const keyFor = (doc: Document) => `${doc.frontmatter.id}|${doc.variant.channel}|${doc.variant.version}|${doc.variant.language}`;
type SelectedResource = { ref: ContentRef; doc: Document; tree: any; meaningTree?: any; title: string; summary: string; type: string; source?: {documentId?: string; snippetId?: string; valuesDigest?: string} };
const resourceIdentity = (item: SelectedResource) => JSON.stringify([item.ref.kind, item.ref.kind === 'snippet' ? item.ref.id : item.ref.documentId, item.ref.kind === 'section' ? item.ref.sectionId : null, item.doc.variant.channel, item.doc.variant.version, item.doc.variant.language]);
// Pages and their sections share a source; named snippet instances do not.
const sourceKeyFor = (doc: Document, kind: 'document' | 'snippet' = 'document') => JSON.stringify([kind, doc.frontmatter.id, doc.variant.channel, doc.variant.version, doc.variant.language]);
const selectedSourceKey = (item: SelectedResource) => sourceKeyFor(item.doc, item.ref.kind === 'snippet' ? 'snippet' : 'document');
const resourceKey = (item: SelectedResource) => `resource-${exportDigest(resourceIdentity(item)).slice(0, 24)}`;
const sameVariant = (a: Variant, b: Variant) => ['channel', 'version', 'language'].every(key => a[key as keyof Variant] === b[key as keyof Variant]);
const visitTree = (node: any, visit: (node: any) => void) => {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { for (const child of node) visitTree(child, visit); return; }
  visit(node);
  for (const [key, value] of Object.entries(node)) if (!['data', 'frontmatter'].includes(key) && value && typeof value === 'object') visitTree(value, visit);
};

/** Export selected source content; never invoke the website shell/compiler. */
export async function exportContent(configFile: string, destination: string, options: ContentExportOptions = {}) {
  const loaded = await loadConfig(configFile);
  const resolved = resolvedCompilerConfig(loaded.value);
  // Export has no masthead, so a website title is optional in a content-only project.
  if (resolved.site !== undefined && !isConfigMapping(resolved.site)) throw new Error('site must be a mapping when provided');
  const site = requireSiteSection({ ...resolved, site: { title: 'Content export', ...(isConfigMapping(resolved.site) ? resolved.site : {}) } });
  const publications = requirePublicationsSection(resolved);
  const config = { ...resolved, site, publications };
  const base = path.dirname(path.resolve(configFile));
  const basePath = normalizeBasePath(site.basePath);
  const publicPath = (route: string) => sitePath(basePath, route);
  const origin = typeof site.origin === 'string' ? site.origin.replace(/\/+$/, '') : site.origin;
  if (origin !== undefined && (typeof origin !== 'string' || !/^https:\/\//.test(origin) || new URL(origin).origin !== origin)) throw new Error('site.origin must be an HTTPS origin without a path');
  let raw: Record<string, unknown> = {};
  if (options.target) {
    if (!isConfigMapping(config.exports) || !Object.hasOwn(config.exports, options.target)) throw new Error(`Unknown export target ${options.target}`);
    raw = config.exports[options.target] as Record<string, unknown>;
  }
  const target = validateExportTarget({ ...raw, ...(options.formats ? { formats: options.formats } : {}), ...(options.documents ? { documents: options.documents } : {}), ...(options.publication ? { publication: options.publication } : {}), ...(options.publicBase ? { publicBase: options.publicBase } : {}) }, config.readerFilters);
  const language = defaultLanguage(config);
  const enabled = config.publications.enabled;
  if (!Array.isArray(enabled) || !enabled.length || enabled.some(value => !isConfigMapping(value) || typeof value.channel !== 'string' || typeof value.version !== 'string' || value.language !== undefined && typeof value.language !== 'string')) throw new Error('publications.enabled must declare valid publication combinations');
  const variants = enabled.map(value => ({ channel: value.channel as string, version: value.version as string, language: (value.language as string | undefined) ?? language }));
  const unique = [...new Map(variants.map(variant => [JSON.stringify(variant), variant])).values()];
  const publication = target.publication ?? (unique.length === 1 ? unique[0] : undefined);
  if (!publication) throw new Error('Export has multiple enabled publications; select one channel/version/language in the target or command');
  if (!unique.some(variant => sameVariant(variant, publication))) throw new Error('The selected export publication is not enabled');
  const readerFilters = validateReaderFilters(config.readerFilters);
  if (config.metadata !== undefined && (!isConfigMapping(config.metadata) || Object.keys(config.metadata).some(key => key !== 'provider'))) throw new Error('metadata accepts only provider');
  const providerSetting = configField(config.metadata, 'provider');
  const metadataProvider = await loadMetadataProvider(providerSetting, providerSetting ? explainSegments(loaded, ['metadata', 'provider', 'module']).source.file : configFile);
  const metadataDependencies = new Set<string>();
  const workspace = await prepareContentWorkspace({ base, basePath, config, loaded, variants: [publication], language, readerFilters, metadataProvider, metadataDependencies, allowRouteCollisions: true });
  const { docs: eligible, apiPlan, snippets, sourceForOperation } = workspace;
  const ids = new Set(target.resources ? target.resources.filter(item => item.kind !== 'snippet').map(item => item.documentId) : target.documents);
  for (const id of ids) {
    const doc = [...eligible.values()].find(doc => doc.frontmatter.id === id);
    if (!doc) throw new Error(`Requested export document ${id} is missing, non-public, or unavailable in the selected publication`);
    if (!matchesContentFilter(doc.readerFilters, target.contentFilter)) throw new Error(`Requested export document ${id} is excluded by the export contentFilter`);
  }
  const docs = new Map([...eligible].filter(([, doc]) => (!(target.documents || target.resources) || ids.has(doc.frontmatter.id)) && matchesContentFilter(doc.readerFilters, target.contentFilter)).sort(([, a], [, b]) => compare(keyFor(a), keyFor(b))));
  if (!docs.size && !target.resources?.some(item => item.kind === 'snippet')) throw new Error('Export selection matched no eligible pages');
  const plugins = await loadComponentPlugins(loaded, { browser: false });
  const materialized = await materializePages({ variables: isConfigMapping(config.variables) ? config.variables : {}, frontmatterConfig: config.frontmatter, publications, docs, linkDocuments: eligible, apiPlan, sourceForOperation,
    snippets, calloutTypes: resolveCalloutTypes(config.callouts, configFile), badgeVariants: resolveBadgeVariants(config.badges, configFile), componentPlugins: plugins.registry,
    readerFilters, base, publicPath, relatedApiTargets: new Map(), guidesByApi: new Map() });
  // Explicit related-reading components resolve against eligible source content. The
  // website's automatically appended related-document lists are not export chrome.
  const edges = validateRelationships(config.relationships, workspace.knownDocumentIds);
  const cookbooks = validateCookbooks(config.cookbooks, configFile);
  const local = new Map([...eligible.values()].map(doc => [doc.frontmatter.id, doc]));
  const diagnostics: Array<{ code: string; documentId?: string; message: string }> = [];
  const requiredNotices = new Map<string, any[]>();
  for (const page of materialized.rendered) {
    const use = { targets: [] as string[], queries: [] as any[] };
    page.doc.tree = resolveCardTree(page.doc.tree, page.doc, eligible, publicationRelationships(edges, local), new Set(apiPlan.knownOperations.keys()), use, config);
    page.doc.tree = resolveCookbookTree(page.doc.tree, page.doc, eligible, cookbooks, use.targets);
    const deprecation = resolveSubjectDeprecation(page.doc, eligible);
    const change = resolveAuthoredChange(page.doc, eligible);
    const existing = page.doc.tree as any;
    // Preserve authored notices in both output representations.
    const notices = [
      { type: 'docRepresentation', representation: 'html', children: [...subjectDeprecationNotice(deprecation, 'html').children, ...authoredChangeNotice(change, 'html').children] },
      { type: 'docRepresentation', representation: 'markdown', children: [...subjectDeprecationNotice(deprecation, 'markdown').children, ...authoredChangeNotice(change, 'markdown').children] }
    ];
    requiredNotices.set(keyFor(page.doc), notices);
    page.doc.tree = root([...notices, ...existing.children]);
    const found = new Set<string>();
    visitTree(page.doc.tree, node => { if (['docTabs', 'docWalkthrough', 'docReaderSection', 'docCollapsible', 'docTooltip', 'docInfoHint', 'docCookbookChooser'].includes(node.type)) found.add(node.type); });
    if (found.size) diagnostics.push({ code: 'static-content', documentId: page.doc.frontmatter.id, message: 'Interactions and reader sections are exported as complete labeled content.' });
  }
  // Materialized snippets can share nodes with their registry definition.
  // Isolate each document before assigning source provenance.
  for (const doc of docs.values()) { doc.tree = isolateExportTree(doc.tree); markExportSource(doc.tree); }
  const selected: SelectedResource[] = [];
  const selections = target.resources ?? [...docs.values()].map(doc => ({ kind: 'page' as const, documentId: doc.frontmatter.id }));
  for (const selection of selections) {
    if (selection.kind === 'snippet') {
      const definition = snippets.get(selection.snippetId);
      if (!definition) throw new Error(`Unknown export snippet ${selection.snippetId}`);
      // This is an explicit isolated context. It has no containing page, operations,
      // relationships, page variables, or inherited publication/access metadata.
      const snippetDocument: Document = { file: definition.file, body: '', tree: root([]), variant: publication,
        route: `/__content_snippets/${encodeURIComponent(selection.id)}`, markdownRoute: '',
        frontmatter: { id: selection.id, title: selection.title, summary: selection.summary, type: 'snippet', slug: '/', access: { policy: 'public' } } };
      const checkSnippet = (id: string, seen = new Set<string>()) => {
        if (seen.has(id)) return; seen.add(id);
        const source = snippets.get(id); if (!source) throw new Error(`Unknown snippet ${id}`);
        visitTree(source.tree, node => {
          if (['RelatedReading', 'DocCard', 'DocCards', 'DocCollection', 'CookbookChooser', 'ApiExample', 'ApiSchema', 'FrontmatterReference', 'Anchor'].includes(node.name)) throw new Error(`Snippet instance ${selection.id}: <${node.name}> needs page context`);
          if (node.name === 'Snippet') { const child = node.attributes?.find((a: any) => a.name === 'id')?.value; if (typeof child === 'string') checkSnippet(child, seen); }
        });
      };
      checkSnippet(selection.snippetId);
      const invocation = parse.parse(`<Snippet id=${JSON.stringify(selection.snippetId)} values={${JSON.stringify(selection.values ?? {})}} />`);
      snippetDocument.tree = transformMdx(invocation, snippetDocument, new Map([...eligible.values()].map(doc => [doc.frontmatter.id, doc])), snippets,
        isConfigMapping(config.variables) ? config.variables : {}, [], resolveCalloutTypes(config.callouts, configFile), base, readerFilters,
        {}, publications, resolveBadgeVariants(config.badges, configFile), plugins.registry);
      visitTree(snippetDocument.tree, node => { if (/^doc(?:Card|Collection|Related|Cookbook|Api)/.test(node.type)) throw new Error(`Snippet instance ${selection.id} needs page context`); });
      snippetDocument.tree = isolateExportTree(snippetDocument.tree);
      markExportSource(snippetDocument.tree);
      selected.push({ ref: { kind: 'snippet', id: selection.id }, doc: snippetDocument, tree: snippetDocument.tree,
        title: selection.title, summary: selection.summary, type: 'snippet', source: { snippetId: selection.snippetId, valuesDigest: exportDigest(JSON.stringify(resolveSnippetValues(selection.snippetId, definition, config.variables, undefined, selection.values ?? {}))) } });
    } else {
      const doc = [...docs.values()].find(doc => doc.frontmatter.id === selection.documentId)!;
      if (selection.kind === 'page') selected.push({ ref: { kind: 'page', documentId: doc.frontmatter.id }, doc,
        tree: root([heading(1, doc.frontmatter.title), ...(doc.tree as any).children]), title: doc.frontmatter.title, summary: doc.frontmatter.summary, type: doc.frontmatter.type });
      else {
        const slice = selectSection(doc.tree, selection.sectionId, doc.frontmatter.standaloneSections ?? [], doc.frontmatter.id);
        selected.push({ ref: { kind: 'section', documentId: doc.frontmatter.id, sectionId: selection.sectionId }, doc,
          tree: root([...(requiredNotices.get(keyFor(doc)) ?? []), ...slice.tree.children]), meaningTree: slice.tree, title: slice.section.title,
          summary: doc.frontmatter.summary, type: 'section', source: { documentId: doc.frontmatter.id } });
      }
    }
  }
  selected.sort((a, b) => compare(resourceIdentity(a), resourceIdentity(b)));
  const diagrams = await resolveDiagramTrees(selected.map(item => item.tree));
  const assets = new ExportAssets(target.publicBase);
  const assetRootsOrigin = options.target && target.assetRoots.length ? explainSegments(loaded, ['exports', options.target, 'assetRoots']).source.file : configFile;
  const roots = [workspace.contentDir, ...target.assetRoots.map(root => path.resolve(path.dirname(assetRootsOrigin), root))];
  await assets.allow(roots);
  for (const asset of diagrams) assets.register(asset.route, { content: asset.svg });
  for (const [url, contract] of materialized.focusedContracts) assets.register(url, { content: contract.content });
  for (const item of selected) { const doc = item.doc; visitTree(item.tree, node => {
    if (typeof node.file === 'string' && typeof node.url === 'string' && ['docImage', 'image', 'definition'].includes(node.type)) assets.register(node.url, { file: node.file }, selectedSourceKey(item));
    if (node.type === 'docHero' && node.image?.file) assets.register(node.image.url, { file: node.image.file }, selectedSourceKey(item));
  }); }
  const reviews = await reviewApiPublication(configFile, apiPlan, materialized.rendered, materialized.apiEmbedUses, materialized.focusedContracts, [...materialized.apiPublications.values()].map(source => ({ apiId: source.apiId, sourceUrl: source.sourceUrl })), sourceForOperation, 'report');
  const unreviewed = reviews.filter(review => (target.apiReview[review.apiId] ?? configField(apiPlan.apiDefinitions[review.apiId].publicReview, 'digest')) !== review.digest);
  if (unreviewed.length && !options.review) throw new Error(`Export API review required: ${unreviewed.map(row => `${row.apiId}=${row.digest}`).join(', ')}. Run export with --review, inspect the candidate, and pin these digests in exports.<target>.apiReview`);
  const siteSelection = validateContentFilter(site.contentFilter, readerFilters);
  const website = [...eligible.values()].filter(doc => matchesContentFilter(doc.readerFilters, siteSelection));
  const canonicalDestination = (doc: Document) => website.includes(doc) && website.filter(other => other.route.toLowerCase() === doc.route.toLowerCase()).length === 1;
  const byId = new Map([...eligible.values()].map(doc => [doc.frontmatter.id, doc]));
  const byRoute = (pathname: string) => {
    const matches = [...eligible.values()].filter(doc => doc.route === pathname.replace(/\/$/, '') || doc.route === pathname || doc.markdownRoute === pathname);
    if (matches.length > 1) throw new Error(`Ambiguous document URL ${pathname}; use a doc: link`);
    return matches[0];
  };
  const trees = new Map<string, any>();
  const anchors = new Map<string, ReturnType<typeof passiveHtml>['anchors']>();
  const routes = new Set([...eligible.values()].map(doc => doc.route));
  const sourceInventories = new Map<string, ReturnType<typeof exportHeadingInventory>>();
  const sourceAliases = new Map<string, Map<string, string>>();
  for (const item of selected) for (const format of target.formats) {
    const sourceKey = `${selectedSourceKey(item)}:${format}`;
    if (!sourceInventories.has(sourceKey)) sourceInventories.set(sourceKey, exportHeadingInventory(portableTree(structuredClone(item.doc.tree), format, routes, basePath)));
    const tree = portableTree(structuredClone(item.tree), format, routes, basePath);
    if (item.ref.kind !== 'page') {
      const meaning = item.meaningTree ? portableTree(structuredClone(item.meaningTree), format, routes, basePath) : tree;
      const body = (meaning.children ?? []).filter((node: any) => node.type !== 'heading' && node.type !== 'definition' && node.type !== 'footnoteDefinition');
      if (!portableMarkdown(root(body)).trim()) throw new Error(`Resource ${resourceIdentity(item)} has no content in ${format}`);
    }
    const aliases = preserveExportHeadingIds(tree, sourceInventories.get(sourceKey)!, format);
    sourceAliases.set(`${resourceIdentity(item)}:${format}`, aliases);
    trees.set(`${resourceIdentity(item)}:${format}`, tree);
    // Resolve anchors independently in each representation, before URL rewriting.
    anchors.set(`${resourceIdentity(item)}:${format}`, passiveHtml(tree, `sr-${resourceKey(item)}`, false).anchors);
  }
  const canonicalAnchors = new Map<string, Set<string>>();
  const verifiedCanonicalAnchors = (destination: Document, format: ExportFormat) => {
    const key = `${sourceKeyFor(destination)}:${format}`;
    if (canonicalAnchors.has(key)) return canonicalAnchors.get(key)!;
    const source = sourceInventories.get(key);
    if (!source || destination.endpoint) throw new Error(`Cannot validate canonical fragments in ${destination.frontmatter.id}; select the target resource explicitly`);
    const reserved = ['main', 'docs-navigation', 'docs-sections', 'documentation-menu', 'page-outline', 'nav-filter', 'examples-title', 'api-view-select'];
    const explicit = new Set<string>();
    visitTree(destination.tree, node => {
      if (node.type === 'docSection' && node.sectionId) reserved.push(node.sectionId);
      const alias = node.data?.hProperties?.['data-shoalrun-section-id'];
      if (typeof alias === 'string') explicit.add(alias);
    });
    const native = exportHeadingInventory(publicTree(structuredClone(destination.tree), 'html', routes, 'light', basePath), reserved);
    const verified = new Set([...explicit].filter(id => native.ids.has(id)));
    for (const [headingKey, id] of source.headings) if (native.headings.get(headingKey) === id) verified.add(id);
    canonicalAnchors.set(key, verified);
    return verified;
  };
  const records: ContentResource[] = [];
  const artifacts = new Map<string, string | Buffer>();
  for (const item of selected) {
    const doc = item.doc;
    const externalDependencies = new Map<string, { url: string; kind: 'image' }>();
    const usedAssets = new Set<string>();
    const representations: Partial<Record<ExportFormat, Representation>> = {};
    const canonicalUrl = item.ref.kind !== 'snippet' && origin && canonicalDestination(doc) ? `${origin}${doc.route}` : undefined;
    for (const format of target.formats) {
      const links: ExportLink[] = [];
      const tree = trees.get(`${resourceIdentity(item)}:${format}`);
      const resolve = async (node: any): Promise<void> => {
        // Native adapters can express ordinary links/images as semantic elements.
        const properties = node.data?.hProperties;
        const attr = node.data?.hName === 'a' ? 'href' : node.data?.hName === 'img' ? 'src' : undefined;
        if (attr && typeof properties?.[attr] === 'string') {
          const virtual: any = { type: attr === 'src' ? 'image' : 'link', url: properties[attr], children: [] };
          await resolve(virtual);
          properties[attr] = virtual.url;
          if (virtual.data?.hProperties?.['data-export-link']) properties['data-export-link'] = virtual.data.hProperties['data-export-link'];
        }
        if (typeof node.url === 'string' && ['link', 'image', 'definition'].includes(node.type)) {
          const value = node.url;
          const parsed = new URL(value, `https://export.invalid${doc.route === basePath ? `${doc.route}/` : doc.route}`);
          if (!['http:', 'https:', ...(node.type !== 'image' ? ['mailto:', 'tel:'] : [])].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error(`Unsafe export URL ${value}`);
          let destination: Document | undefined;
          if (node.type !== 'image') {
            destination = node.exportDocumentId ? byId.get(node.exportDocumentId) : value.startsWith('#') || value.startsWith('?') ? doc : undefined;
            if (!destination && parsed.origin === 'https://export.invalid') {
              const pathUrl = outputUrl(value, doc.route, undefined, 'html', routes, basePath);
              destination = byRoute(new URL(pathUrl, 'https://export.invalid').pathname);
              if (!destination && /\.mdx?$/.test(parsed.pathname) && !value.startsWith('/')) {
                const file = path.resolve(path.dirname(doc.file), decodeURIComponent(value.split(/[?#]/)[0]));
                destination = [...eligible.values()].find(other => path.resolve(other.file) === file);
              }
            }
          }
          if (destination) {
            let href: string;
            let kind: ExportLink['kind'];
            const fragment = decodeURIComponent(parsed.hash.slice(1));
            const candidates = selected.filter(candidate => candidate.ref.kind !== 'snippet' && keyFor(candidate.doc) === keyFor(destination!));
            const hasAnchor = (candidate: SelectedResource) => sourceAliases.get(`${resourceIdentity(candidate)}:${format}`)?.has(fragment);
            let chosen = destination === doc && fragment && hasAnchor(item) ? item : undefined;
            if (!chosen && fragment) {
              const matching = candidates.filter(candidate => candidate.ref.kind === 'section' && hasAnchor(candidate));
              if (matching.length > 1) throw new Error(`Ambiguous fragment ${fragment} in ${destination.frontmatter.id}`);
              chosen = matching[0];
            }
            chosen ??= candidates.find(candidate => candidate.ref.kind === 'page');
            // Clean Markdown has no explicit alias anchors. Prefer an actual
            // section resource for those references, otherwise the canonical HTML.
            if (chosen && format === 'markdown' && fragment && chosen.ref.kind === 'page') {
              const targetId = sourceAliases.get(`${resourceIdentity(chosen)}:${format}`)?.get(fragment);
              const target = anchors.get(`${resourceIdentity(chosen)}:${format}`)?.find(entry => entry.id === targetId);
              if (target && !target.title) chosen = candidates.find(candidate => candidate.ref.kind === 'section' && candidate.ref.sectionId === fragment);
            }
            if (chosen) {
              const targetAnchors = anchors.get(`${resourceIdentity(chosen)}:${format}`)!;
              const targetId = sourceAliases.get(`${resourceIdentity(chosen)}:${format}`)?.get(fragment);
              const anchor = fragment ? targetAnchors.find(entry => entry.id === targetId) : undefined;
              if (fragment && !anchor) throw new Error(`Missing export anchor ${fragment} in ${destination.frontmatter.id} (${format})`);
              // A section-resource URL is sufficient when addressing its leading
              // section; clean Markdown does not publish explicit HTML anchors.
              const leadingSection = chosen.ref.kind === 'section' && chosen.ref.sectionId === fragment;
              const markdownAnchor = anchor?.id ?? fragment;
              const suffix = parsed.search + (fragment && !(format === 'markdown' && leadingSection) ? `#${format === 'html' ? anchor!.exportedId : markdownAnchor}` : '');
              href = chosen === item && !parsed.search && fragment && format === 'html' ? suffix : `${target.publicBase}content/${resourceKey(chosen)}.${format === 'html' ? 'html' : 'md'}${suffix}`;
              kind = 'resource';
            } else {
              if (!origin || !canonicalDestination(destination)) throw new Error(`Document ${destination.frontmatter.id} is outside the export and has no eligible canonical website fallback`);
              if (fragment) {
                const inventory = sourceInventories.get(`${sourceKeyFor(destination)}:${format}`);
                if (!inventory) throw new Error(`Cannot validate canonical anchor ${fragment} in unselected document ${destination.frontmatter.id}; select that page or section explicitly`);
                if (!inventory.ids.has(fragment)) throw new Error(`Missing source anchor ${fragment} in ${destination.frontmatter.id} (${format})`);
                if (!verifiedCanonicalAnchors(destination, format).has(fragment)) throw new Error(`Cannot verify canonical anchor ${fragment} in ${destination.frontmatter.id}; select its target resource explicitly`);
              }
              href = `${origin}${destination.route}${parsed.search}${parsed.hash}`;
              kind = 'canonical';
            }
            const key = `link-${links.length + 1}`;
            links.push({ key, kind, href, ...(chosen ? { ref: chosen.ref } : {}), ...(fragment ? { fragment } : {}), ...(parsed.search ? { query: parsed.search.slice(1) } : {}) });
            node.url = href;
            if (format === 'html' && node.type === 'link') node.data = { ...node.data, hProperties: { ...node.data?.hProperties, 'data-export-link': key } };
          } else if (parsed.origin !== 'https://export.invalid') {
            node.url = value.startsWith('//') ? `https:${value}` : value;
            if (node.type === 'image') externalDependencies.set(node.url, { url: node.url, kind: 'image' });
            else links.push({ key: `link-${links.length + 1}`, kind: 'external', href: node.url });
          } else {
            const asset = await assets.resolve(value, doc.file, selectedSourceKey(item));
            if (!asset) throw new Error(`Unresolved local export ${node.type === 'image' ? 'image' : 'link'} ${value} in ${doc.frontmatter.id}`);
            usedAssets.add(asset.path);
            node.url = `${target.publicBase}${asset.path}${parsed.search}${parsed.hash}`;
            if (node.type !== 'image') links.push({ key: `link-${links.length + 1}`, kind: 'asset', href: node.url, asset: asset.path });
          }
        }
        for (const child of node.children ?? []) await resolve(child);
      };
      await resolve(tree);
      const filename = `content/${resourceKey(item)}.${format === 'html' ? 'html' : 'md'}`;
      const rendered = format === 'html' ? passiveHtml(tree, `sr-${resourceKey(item)}`) : undefined;
      const content = rendered?.html ?? portableMarkdown(tree);
      artifacts.set(filename, content);
      representations[format] = { path: filename, mediaType: format === 'html' ? 'text/html' : 'text/markdown', bytes: Buffer.byteLength(content), digest: exportDigest(content), anchors: rendered?.anchors ?? [], links };
    }
    if (externalDependencies.size) diagnostics.push({ code: 'external-render-dependencies', documentId: doc.frontmatter.id, message: `${externalDependencies.size} remote image(s) remain external; this document is not offline-complete.` });
    records.push({ ref: item.ref, publication, title: item.title, summary: item.summary, type: item.type, ...(item.source ? { source: item.source } : {}), ...(canonicalUrl ? { canonicalUrl } : {}), representations, assets: [...usedAssets].sort(), externalDependencies: [...externalDependencies.values()].sort((a, b) => compare(a.url, b.url)) });
  }
  for (const [filename, bytes] of assets.artifacts) artifacts.set(filename, bytes);
  let notices = 'Content retains its owner\'s license. This bundle contains static content, not a Shoalrun runtime.\n';
  if (diagrams.some(asset => asset.route.includes('/mermaid-'))) notices += '\nPele diagram renderer notice:\n' + await readFile(peleLicenseFile, 'utf8');
  if (diagrams.some(asset => asset.route.includes('/d2-'))) {
    let directory = path.dirname(fileURLToPath(import.meta.resolve('@d2lang/d2')));
    while (true) {
      const pkg = await readFile(path.join(directory, 'package.json'), 'utf8').then(JSON.parse).catch(() => undefined);
      if (pkg?.name === '@d2lang/d2') break;
      if (path.dirname(directory) === directory) throw new Error('Cannot locate D2 renderer notices');
      directory = path.dirname(directory);
    }
    for (const file of ['LICENSE.txt', 'THIRD_PARTY_NOTICES.txt']) notices += `\nD2 ${file}:\n${await readFile(path.join(directory, file), 'utf8')}\n`;
  }
  const noticeOrigin = options.target && target.notices.length ? explainSegments(loaded, ['exports', options.target, 'notices']).source.file : configFile;
  const noticeFiles = target.notices.map(file => path.resolve(path.dirname(noticeOrigin), file));
  for (const file of noticeFiles) {
    const resolvedNotice = await realpath(file);
    if (!/\.(?:txt|md)$/i.test(file) && !/^(?:LICENSE|COPYING|NOTICE|NOTICES)$/i.test(path.basename(file))) throw new Error('Export notices must be text or Markdown license/notice files');
    if (resolvedNotice.split(path.sep).some(part => /^\.env(?:\.|$)|^\.git$|^(?:PROJECT|DEPLOYMENT)\.local\.md$|^AGENTS\.override\.md$/i.test(part))) throw new Error('Private local files cannot be exported as notices');
    notices += `\n${path.basename(file)}:\n${await readFile(resolvedNotice, 'utf8')}\n`;
  }
  artifacts.set('NOTICES.txt', notices);
  const manifest = { schemaVersion: 1, kind: 'shoalrun-content-export', publicBase: target.publicBase, publication,
    review: { status: unreviewed.length ? 'required' : 'ok', apis: reviews.map(row => ({ apiId: row.apiId, digest: row.digest })) },
    resources: records, assets: [...assets.records.values()].sort((a, b) => compare(a.path, b.path)),
    files: [...artifacts].map(([filename, content]) => ({ path: filename, bytes: Buffer.byteLength(content), digest: exportDigest(content) })).sort((a, b) => compare(a.path, b.path)), diagnostics };
  const previous = options.previousManifest ? JSON.parse(await readFile(options.previousManifest, 'utf8')) : undefined;
  const comparison = compareContentManifests(previous, manifest);
  if (options.failOnRemoved && !options.previousManifest) throw new Error('failOnRemoved requires previousManifest');
  if (options.failOnRemoved && comparison.removed.length) throw new Error(`Export removes ${comparison.removed.length} previously exported resource(s)`);
  diagnostics.push(...comparison.diagnostics);
  const bundleDigest = exportDigest(JSON.stringify(manifest));
  artifacts.set('manifest.json', JSON.stringify({ ...manifest, digest: bundleDigest }, null, 2) + '\n');
  const inputs = [...noticeFiles, ...loaded.dependencies, ...metadataDependencies, ...plugins.dependencies, ...apiPlan.api.dependencies, ...[...eligible.values()].map(doc => doc.file), ...[...snippets.values()].map(snippet => snippet.file)];
  checkOutputDirectory(destination, base, workspace.contentDir, inputs);
  // No export can replace a directory containing an allowed asset root.
  for (const directory of roots) checkOutputDirectory(destination, base, directory, inputs);
  if (unreviewed.length) {
    const prior = await readFile(path.join(destination, 'manifest.json'), 'utf8').then(JSON.parse).catch(() => undefined);
    if (prior?.review?.status === 'ok') throw new Error('Review candidate cannot overwrite an approved export; choose a separate review destination');
  }
  await commitArtifacts(path.resolve(destination), artifacts, undefined, 'export');
  return { status: unreviewed.length ? 'needs-review' : 'ok', output: path.resolve(destination), publication, formats: target.formats,
    resources: records.length, documents: records.filter(item => item.ref.kind === 'page').length, documentIds: records.flatMap(item => item.ref.kind === 'page' ? [item.ref.documentId] : []), comparison, assets: assets.records.size, digest: bundleDigest,
    apiReview: reviews.map(row => ({ apiId: row.apiId, digest: row.digest })), diagnostics };
}
