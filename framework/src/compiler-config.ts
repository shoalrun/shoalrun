/**
 * Structural types for the resolved YAML configuration consumed by the
 * compiler. loadConfig validates syntax, includes, top-level keys,
 * schemaVersion, and selected dedicated sections, but not every setting.
 * Nested values therefore stay unknown until a compiler validator narrows
 * them.
 */
export type ConfigMapping = Record<string, unknown>;

export interface ResolvedCompilerConfig extends ConfigMapping {
  schemaVersion: 1;
  site?: unknown;
  navigation?: unknown;
  redirects?: unknown;
  apis?: unknown;
  relationships?: unknown;
  variables?: unknown;
  snippets?: unknown;
  callouts?: unknown;
  badges?: unknown;
  publications?: unknown;
  outputs?: unknown;
  templates?: unknown;
  theme?: unknown;
  frontmatter?: unknown;
  metadata?: unknown;
  audit?: unknown;
  readerFilters?: unknown;
  retrieval?: unknown;
  chat?: unknown;
  authoring?: unknown;
  search?: unknown;
  cookbooks?: unknown;
  analytics?: unknown;
  mcp?: unknown;
}

export interface CompilerSiteConfig extends ConfigMapping {
  title: string;
  basePath?: unknown;
  contentDir?: string;
}

export interface CompilerPublicationsConfig extends ConfigMapping {
  channels: Record<string, { pathPrefix?: string }>;
  versions: Record<string, { pathPrefix?: string }>;
  defaults?: { channel?: string; version?: string; language?: string };
}

export function isConfigMapping(value: unknown): value is ConfigMapping {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// Mirrors optional property access on YAML values without assigning an unvalidated shape.
export function configField(value: unknown, key: string): unknown {
  return value === null || value === undefined ? undefined : (Object(value) as ConfigMapping)[key];
}

/** Narrow only invariants already guaranteed by loadConfig. */
export function resolvedCompilerConfig(value: unknown): ResolvedCompilerConfig {
  if (!isConfigMapping(value) || value.schemaVersion !== 1) {
    throw new Error('Resolved configuration must be a schemaVersion 1 mapping');
  }
  return value as ResolvedCompilerConfig;
}

/** A section-level mapping guard for validators that accept arbitrary YAML. */
export function configMappingAt(value: unknown, setting: string): ConfigMapping {
  if (!isConfigMapping(value)) throw new Error(`${setting} must be a mapping`);
  return value;
}

export function navigationCounts(outputs: unknown): boolean {
  const navigation = configField(configField(outputs, 'html'), 'navigation');
  if (navigation === undefined) return true;
  const settings = configMappingAt(navigation, 'outputs.html.navigation');
  const showCounts = settings.showCounts;
  if (showCounts === undefined) return true;
  if (typeof showCounts !== 'boolean') throw new Error('outputs.html.navigation.showCounts must be true or false');
  return showCounts;
}

/**
 * Apply the compiler's existing required-section checks at their original
 * points in the build. Publication entries stay unknown until later checks.
 */
export function requireSiteSection(config: ResolvedCompilerConfig): CompilerSiteConfig {
  const site = config.site;
  if (!isConfigMapping(site) || typeof site.title !== 'string' || !site.title.trim()) {
    throw new Error('site must be a mapping with a nonempty title');
  }
  if (site.contentDir !== undefined && typeof site.contentDir !== 'string') throw new Error('site.contentDir must be a path');
  return site as CompilerSiteConfig;
}

export function requirePublicationsSection(config: ResolvedCompilerConfig): CompilerPublicationsConfig {
  const publications = config.publications;
  if (!isConfigMapping(publications) || !isConfigMapping(publications.channels) || !isConfigMapping(publications.versions)) {
    throw new Error('publications needs channels and versions mappings');
  }
  if (publications.defaults !== undefined && !isConfigMapping(publications.defaults)) {
    throw new Error('publications.defaults must be a mapping of channel, version, and language');
  }
  for (const group of ['channels', 'versions'] as const) {
    for (const [name, value] of Object.entries(publications[group] as ConfigMapping)) {
      if (!isConfigMapping(value) || (value.pathPrefix !== undefined && typeof value.pathPrefix !== 'string')) {
        throw new Error(`publications.${group}.${name} needs a mapping with an optional pathPrefix string`);
      }
    }
  }
  const defaults = publications.defaults;
  if (isConfigMapping(defaults) && ['channel', 'version', 'language'].some(key => defaults[key] !== undefined && typeof defaults[key] !== 'string')) {
    throw new Error('publications.defaults must be a mapping of channel, version, and language');
  }

  return publications as CompilerPublicationsConfig;
}
