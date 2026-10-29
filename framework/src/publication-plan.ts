import { hasScaffoldPlaceholders } from './scaffold-placeholders.js';
import { matchesContentFilter } from './content-filter.js';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { markdownRoute, readDocument, routeFor, type Document, type Variant } from './content.js';
import type { PublicationRoutingConfig } from './content-source.js';
import { applyFormattingLocale, validateFrontmatter } from './frontmatter.js';
import { mergeProvidedMetadata, type MetadataProvider } from './metadata-provider.js';
import { pageReaderFilters, type ReaderSelection, type ReaderFiltersConfig } from './reader-filters.js';
import { configField, type CompilerSiteConfig, type CompilerPublicationsConfig } from './compiler-config.js';

export type AuthoredPublicationConfig = PublicationRoutingConfig & { site: CompilerSiteConfig; publications: CompilerPublicationsConfig; frontmatter?: unknown };

export type AuthoredPublicationPlan = {
  contentDir: string;
  docs: Map<string, Document>;
  knownDocumentIds: Set<string>;
  knownDocumentTypes: Map<string, string>;
  authoredOperationIds: Set<string>;
  routeOwners: Map<string, string>;
};

const keyFor = (id: string, variant: Variant) => `${id}|${variant.channel}|${variant.version}|${variant.language}`;

async function files(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async entry => entry.isDirectory() ? files(path.join(dir, entry.name)) : /\.mdx?$/.test(entry.name) ? [path.join(dir, entry.name)] : []));
  return nested.flat().sort();
}

export async function planAuthoredDocuments({ base, basePath, config, variants, language, readerFilters, contentFilter, metadataProvider, metadataDependencies, sourceOverrides, authoringFiles, allowRouteCollisions }: {
  base: string;
  basePath: string;
  config: AuthoredPublicationConfig;
  variants: Variant[];
  language: string;
  readerFilters?: ReaderFiltersConfig;
  contentFilter?: ReaderSelection;
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
    applyFormattingLocale(frontmatter, config.frontmatter, sourceFrontmatter);
    validateFrontmatter(frontmatter, config.frontmatter, file, sourceFrontmatter);
    const pagePublications = frontmatter.publications;
    if (pagePublications) {
      if (sourceFrontmatter.channel !== undefined || sourceFrontmatter.version !== undefined) throw new Error(`${file}: use publications instead of page-level channel or version`);
      for (const publication of pagePublications) {
        if (!config.publications.channels[publication.channel] || !config.publications.versions[publication.version]) throw new Error(`${file}: unknown publication ${publication.channel}/${publication.version}`);
        const enforced = configField(config.frontmatter, 'enforced');
        if (configField(enforced, 'channel') && configField(enforced, 'channel') !== publication.channel || configField(enforced, 'version') && configField(enforced, 'version') !== publication.version) throw new Error(`${file}: publications conflicts with enforced channel or version`);
      }
    }
    knownDocumentIds.add(frontmatter.id);
    knownDocumentTypes.set(frontmatter.id, frontmatter.type);
    if (frontmatter.type === 'api-reference') for (const operation of frontmatter.operations ?? []) authoredOperationIds.add(operation);
    if (frontmatter.access?.policy !== 'public' && !authoringFiles?.has(file)) continue;
    const marks = pageReaderFilters(frontmatter, readerFilters, file);
    if (!matchesContentFilter(marks, contentFilter)) continue;
    if (hasScaffoldPlaceholders(body) || /\[\[TODO:[\s\S]*?\]\]/.test(JSON.stringify(frontmatter)) || frontmatter.summary?.startsWith('Draft guide for ')) throw new Error(`${file}: unresolved scaffold placeholders cannot be published`);
    for (const variant of variants) {
      if (pagePublications ? !pagePublications.some(item => item.channel === variant.channel && item.version === variant.version) : (frontmatter.channel && frontmatter.channel !== variant.channel || frontmatter.version && frontmatter.version !== variant.version)) continue;
      if (frontmatter.language && frontmatter.language !== variant.language) continue;
      if (!pagePublications && (!frontmatter.channel || !frontmatter.version || !frontmatter.language)) throw new Error(`${file}: resolved frontmatter needs publication channel and version`);
      const publishedFrontmatter = pagePublications ? { ...frontmatter, channel: variant.channel, version: variant.version } : frontmatter;
      const key = keyFor(frontmatter.id, variant);
      if (docs.has(key)) throw new Error(`Duplicate document identity ${key}`);
      const route = routeFor(publishedFrontmatter, variant, config);
      const collision = routeOwners.get(route.toLowerCase());
      if (collision && !allowRouteCollisions) throw new Error(`Route collision ${route}: ${collision} and ${key}`);
      routeOwners.set(route.toLowerCase(), key);
      docs.set(key, { file, frontmatter: publishedFrontmatter, body, tree: null, variant, route, markdownRoute: markdownRoute(route, basePath), readerFilters: marks });
    }
  }
  return { contentDir, docs, knownDocumentIds, knownDocumentTypes, authoredOperationIds, routeOwners };
}
