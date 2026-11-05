import { documentKey, samePublication } from './publication-identity.js';
import { hasScaffoldPlaceholders } from './scaffold-placeholders.js';
import { validateFeatureClassification, matchesFeatures, type FeatureContext } from './deployment-profile.js';
import { matchesContentFilter } from './content-filter.js';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { markdownRoute, readDocument, routeFor, type Document, type Variant } from './content.js';
import type { PublicationRoutingConfig } from './content-source.js';
import { applyFormattingLocale, validateFrontmatter } from './frontmatter.js';
import { mergeProvidedMetadata, type MetadataProvider } from './metadata-provider.js';
import { pageReaderFilters, type ReaderSelection, type ReaderFiltersConfig } from './reader-filters.js';
import { resolvePublication, configField, type CompilerSiteConfig, type CompilerPublicationsConfig } from './compiler-config.js';

export type AuthoredPublicationConfig = PublicationRoutingConfig & { site: CompilerSiteConfig; publications: CompilerPublicationsConfig; frontmatter?: unknown };

export type AuthoredPublicationPlan = {
  contentDir: string;
  docs: Map<string, Document>;
  knownDocumentIds: Set<string>;
  knownDocumentTypes: Map<string, string>;
  authoredOperationIds: Set<string>;
  routeOwners: Map<string, string>;
};

const keyFor = documentKey;

async function files(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async entry => entry.isDirectory() ? files(path.join(dir, entry.name)) : /\.mdx?$/.test(entry.name) ? [path.join(dir, entry.name)] : []));
  return nested.flat().sort();
}

export async function planAuthoredDocuments({ base, basePath, config, variants, language, readerFilters, contentFilter, featureContext, metadataProvider, metadataDependencies, sourceOverrides, authoringFiles, allowRouteCollisions }: {
  base: string;
  basePath: string;
  config: AuthoredPublicationConfig;
  variants: Variant[];
  language: string;
  readerFilters?: ReaderFiltersConfig;
  contentFilter?: ReaderSelection;
  featureContext?: FeatureContext;
  metadataProvider?: { provide: MetadataProvider };
  metadataDependencies: Set<string>;
  allowRouteCollisions?: boolean;
  sourceOverrides?: ReadonlyMap<string, string>;
  // Isolated authoring validation can render excluded pages without rewriting
  // their authored or resolved publication metadata. Ordinary builds are unchanged.
  authoringFiles?: ReadonlySet<string>;
}): Promise<AuthoredPublicationPlan> {
  const docs = new Map<string, Document>();
  const knownDocumentIds = new Set<string>();
  const knownDocumentTypes = new Map<string, string>();
  const authoredOperationIds = new Set<string>();
  const routeOwners = new Map<string, string>();
  const contentDir = path.resolve(base, config.site.contentDir ?? 'content');
  const authoredFiles = new Set(await files(contentDir));
  // Authoring previews can supply absent pages without creating placeholders.
  // Virtual sources remain inside the configured authored content directory.
  for (const file of sourceOverrides?.keys() ?? []) {
    const relative = path.relative(contentDir, file);
    if (path.isAbsolute(file) && relative && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative) && /\.mdx?$/.test(file)) authoredFiles.add(file);
  }
  for (const file of [...authoredFiles].sort()) {
    const { frontmatter, sourceFrontmatter, body } = await readDocument(file, config.frontmatter, metadataProvider ? async source => {
      const result = await metadataProvider.provide({ file, source, projectRoot: base });
      const merged = mergeProvidedMetadata(source, result, file);
      for (const dependency of merged.dependencies) metadataDependencies.add(dependency);
      return merged.page;
    } : undefined, sourceOverrides?.get(file));
    frontmatter.language ??= language;
    // A product's release default never comes from the legacy global version.
    if (config.publications.products && frontmatter.product && !frontmatter.publications) {
      if (!Object.hasOwn(config.publications.products, frontmatter.product)) throw new Error(`${file}: unknown publication product ${frontmatter.product}`);
      const enforcedVersion = configField(configField(config.frontmatter, 'enforced'), 'version');
      if (sourceFrontmatter.version === undefined && enforcedVersion === undefined) frontmatter.version = resolvePublication(config.publications, { ...frontmatter, version: undefined }, language).version;
      resolvePublication(config.publications, frontmatter, language);
    }
    applyFormattingLocale(frontmatter, config.frontmatter, sourceFrontmatter);
    validateFrontmatter(frontmatter, config.frontmatter, file, sourceFrontmatter);
    const pagePublications = frontmatter.publications;
    if (pagePublications) {
      if (sourceFrontmatter.channel !== undefined || sourceFrontmatter.version !== undefined || (config.publications.products && sourceFrontmatter.product !== undefined)) throw new Error(`${file}: use publications instead of page-level channel or version`);
      for (const publication of pagePublications) {
        resolvePublication(config.publications, publication, language);
        const enforced = configField(config.frontmatter, 'enforced');
        if (configField(enforced, 'channel') && configField(enforced, 'channel') !== publication.channel || configField(enforced, 'version') && configField(enforced, 'version') !== publication.version || config.publications.products && configField(enforced, 'product') && configField(enforced, 'product') !== publication.product) throw new Error(`${file}: publications conflicts with enforced channel or version`);
      }
    }
    knownDocumentIds.add(frontmatter.id);
    const previousType = knownDocumentTypes.get(frontmatter.id);
    if (previousType !== undefined && previousType !== frontmatter.type) throw new Error(`${file}: stable document ID ${frontmatter.id} has inconsistent types across publications (${previousType} and ${frontmatter.type})`);
    knownDocumentTypes.set(frontmatter.id, frontmatter.type);
    if (frontmatter.type === 'api-reference') for (const operation of frontmatter.operations ?? []) authoredOperationIds.add(operation);
    const classificationVariants = featureContext?.classificationPublications ?? variants;
    const classificationEligible = frontmatter.access?.policy === 'public' && classificationVariants.some(variant =>
      (pagePublications ? pagePublications.some(item => samePublication({ ...item, language: frontmatter.language! }, variant)) : samePublication({ channel: frontmatter.channel!, version: frontmatter.version!, language: frontmatter.language!, ...(config.publications.products && frontmatter.product ? { product: frontmatter.product } : {}) }, variant)) && frontmatter.language === variant.language);
    if (classificationEligible) validateFeatureClassification(sourceFrontmatter, featureContext, `${file}: ${frontmatter.id}`);
    const included = matchesFeatures(frontmatter.requires, featureContext, `${file}: ${frontmatter.id}`);
    const decision = featureContext?.decisions.at(-1);
    if (!included) continue;
    if (frontmatter.access?.policy !== 'public' && !authoringFiles?.has(file)) { if (decision) decision.included = false; continue; }
    const marks = pageReaderFilters(frontmatter, readerFilters, file);
    if (!matchesContentFilter(marks, contentFilter)) { if (decision) decision.included = false; continue; }
    if (hasScaffoldPlaceholders(body) || /\[\[TODO:[\s\S]*?\]\]/.test(JSON.stringify(frontmatter)) || frontmatter.summary?.startsWith('Draft guide for ')) throw new Error(`${file}: unresolved scaffold placeholders cannot be published`);
    let selectedPublication = false;
    for (const variant of variants) {
      if (pagePublications ? !pagePublications.some(item => samePublication({ ...item, language: frontmatter.language! }, variant)) : (frontmatter.channel && frontmatter.channel !== variant.channel || frontmatter.version && frontmatter.version !== variant.version || (config.publications.products && frontmatter.product !== variant.product))) continue;
      if (frontmatter.language && frontmatter.language !== variant.language) continue;
      if (!pagePublications && (!frontmatter.channel || !frontmatter.version || !frontmatter.language)) throw new Error(`${file}: resolved frontmatter needs publication channel and version`);
      const publishedFrontmatter = pagePublications ? { ...frontmatter, channel: variant.channel, version: variant.version, ...(variant.product ? { product: variant.product } : {}) } : frontmatter;
      const key = keyFor(frontmatter.id, variant);
      if (docs.has(key)) throw new Error(`Duplicate document identity ${key}`);
      const route = routeFor(publishedFrontmatter, variant, config);
      const collision = routeOwners.get(route.toLowerCase());
      if (collision && !allowRouteCollisions) throw new Error(`Route collision ${route}: ${collision} and ${key}`);
      routeOwners.set(route.toLowerCase(), key);
      selectedPublication = true;
      docs.set(key, { featureContext, file, frontmatter: publishedFrontmatter, body, tree: null, variant, route, markdownRoute: markdownRoute(route, basePath), readerFilters: marks });
    }
    if (!selectedPublication && decision) decision.included = false;
  }
  return { contentDir, docs, knownDocumentIds, knownDocumentTypes, authoredOperationIds, routeOwners };
}
