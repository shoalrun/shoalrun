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
  exports?: unknown;
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

export type ProductPublicationConfig = { label?: string; pathPrefix: string; defaultVersion: string; versions: Record<string, { pathPrefix?: string }> };

export interface CompilerPublicationsConfig extends ConfigMapping {
  channels: Record<string, { pathPrefix?: string }>;
  versions: Record<string, { pathPrefix?: string }>;
  products?: Record<string, ProductPublicationConfig>;
  defaults?: { product?: string; channel?: string; version?: string; language?: string };
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

export function navigationHeading(outputs: unknown): string | false {
  const navigation = configField(configField(outputs, 'html'), 'navigation');
  if (navigation === undefined) return 'Explore';
  const heading = configMappingAt(navigation, 'outputs.html.navigation').heading;
  if (heading === undefined) return 'Explore';
  if (heading === false) return false;
  if (typeof heading !== 'string' || !heading.trim()) throw new Error('outputs.html.navigation.heading must be nonempty text or false');
  return heading.trim();
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
  if (!isConfigMapping(publications) || !isConfigMapping(publications.channels) || (publications.versions !== undefined && !isConfigMapping(publications.versions)) || (publications.versions === undefined && !isConfigMapping(publications.products))) {
    throw new Error('publications needs channels and versions mappings');
  }
  if (publications.defaults !== undefined && !isConfigMapping(publications.defaults)) {
    throw new Error('publications.defaults must be a mapping of channel, version, and language');
  }
  publications.versions ??= {};
  for (const group of ['channels', 'versions'] as const) {
    for (const [name, value] of Object.entries(publications[group] as ConfigMapping)) {
      if (!isConfigMapping(value) || (value.pathPrefix !== undefined && typeof value.pathPrefix !== 'string')) {
        throw new Error(`publications.${group}.${name} needs a mapping with an optional pathPrefix string`);
      }
    }
  }
  const defaults = publications.defaults;
  if (isConfigMapping(defaults) && ['product', 'channel', 'version', 'language'].some(key => defaults[key] !== undefined && typeof defaults[key] !== 'string')) {
    throw new Error('publications.defaults must be a mapping of channel, version, and language');
  }

  if (publications.products !== undefined) {
    if (!isConfigMapping(publications.products) || !Object.keys(publications.products).length) throw new Error('publications.products must be a nonempty mapping');
    const prefixes = new Set<string>();
    for (const [id, product] of Object.entries(publications.products)) {
      if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(id) || !isConfigMapping(product) || Object.keys(product).some(key => !['label', 'pathPrefix', 'defaultVersion', 'versions'].includes(key))) throw new Error(`Invalid publication product ${id}`);
      if (typeof product.pathPrefix !== 'string' || !/^\/[A-Za-z0-9/_-]+$/.test(product.pathPrefix) || product.pathPrefix.endsWith('/') || product.pathPrefix.includes('//') || product.pathPrefix.includes('..')) throw new Error(`Product ${id} needs an absolute nonempty pathPrefix without a trailing slash`);
      if (prefixes.has(product.pathPrefix.toLowerCase())) throw new Error(`Duplicate product pathPrefix ${product.pathPrefix}`);
      prefixes.add(product.pathPrefix.toLowerCase());
      if (product.label !== undefined && (typeof product.label !== 'string' || !product.label.trim())) throw new Error(`Product ${id}.label must be nonempty text`);
      if (!isConfigMapping(product.versions) || !Object.keys(product.versions).length || typeof product.defaultVersion !== 'string' || !Object.hasOwn(product.versions, product.defaultVersion)) throw new Error(`Product ${id} needs versions and a valid defaultVersion`);
      const versionPrefixes = new Set<string>();
      for (const [version, definition] of Object.entries(product.versions)) {
        if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(version) || !isConfigMapping(definition) || (definition.pathPrefix !== undefined && (typeof definition.pathPrefix !== 'string' || (definition.pathPrefix !== '' && (!/^\/[A-Za-z0-9/_-]+$/.test(definition.pathPrefix) || definition.pathPrefix.includes('//') || definition.pathPrefix.endsWith('/')))))) throw new Error(`Product ${id} has invalid version ${version}`);
        const prefix = String(definition.pathPrefix ?? '').toLowerCase();
        if (versionPrefixes.has(prefix)) throw new Error(`Product ${id} has duplicate version pathPrefix ${prefix || '(empty)'}`);
        versionPrefixes.add(prefix);
      }
    }
  }
  return publications as CompilerPublicationsConfig;
}

/** Resolve product-local defaults without borrowing another product's catalog. */
export function resolvePublication(publications: CompilerPublicationsConfig, value: Record<string, unknown>, language = 'en'): { product?: string; channel: string; version: string; language: string } {
  const product = value.product;
  if (product !== undefined && (typeof product !== 'string' || !publications.products || !Object.hasOwn(publications.products, product))) throw new Error(`Unknown publication product ${String(product)}`);
  const catalog = product === undefined ? publications.versions ?? {} : publications.products![product as string].versions;
  const scopedDefault = product !== undefined && publications.defaults?.product === product && publications.defaults.version && Object.hasOwn(catalog, publications.defaults.version) ? publications.defaults.version : undefined;
  const version = value.version ?? (product === undefined ? publications.defaults?.version : scopedDefault ?? publications.products![product as string].defaultVersion);
  const channel = value.channel ?? publications.defaults?.channel;
  if (typeof channel !== 'string' || !Object.hasOwn(publications.channels, channel) || typeof version !== 'string' || !Object.hasOwn(catalog, version) || (value.language !== undefined && (typeof value.language !== 'string' || !value.language))) throw new Error(`Unknown publication ${product === undefined ? '' : String(product) + '/'}${String(channel)}/${String(version)}`);
  return { ...(product === undefined ? {} : { product: product as string }), channel, version, language: value.language as string ?? language };
}
