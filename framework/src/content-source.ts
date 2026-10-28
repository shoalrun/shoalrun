import type { AuthoredChange, ResolvedChange } from './authored-change.js';
import type { SubjectDeprecation, ResolvedSubjectDeprecation } from './subject-deprecation.js';
import { readFile } from 'node:fs/promises';
import { parseYaml } from './yaml-value.js';
import { defaultLanguage, resolveFrontmatter } from './frontmatter.js';
import { validatePageText } from './surface-text.js';
import { normalizeBasePath } from './site-path.js';
import type { ReaderSelection } from './reader-filters.js';
import type { StandaloneSectionDeclaration } from './section-identity.js';

export type Variant = { channel: string; version: string; language: string };
export type Frontmatter = {
  id: string; title: string; type: string; summary: string; description?: string; slug: string; date?: string; updated?: string; verified?: string; releaseVersion?: string;
  channel?: string; version?: string; publications?: Array<{ channel: string; version: string }>; language?: string; locale?: string; operations?: string[]; relatedApiReferences?: string[];
  change?: AuthoredChange; subjectDeprecation?: SubjectDeprecation; product?: string; area?: string | string[]; subarea?: string | string[]; standaloneSections?: StandaloneSectionDeclaration[];
  access?: { policy: string }; audiences?: string[]; readerFilters?: ReaderSelection; seo?: Record<string, unknown>; subjectLifecycle?: 'deprecated' | 'in-development' | 'beta' | 'experimental'; lifecycle?: string; tocDepth?: 0 | 2 | 3 | 4 | 5 | 6; layout?: 'docs' | 'wide' | 'landing' | 'splash'; image?: string;
  showNavigationTabs?: boolean;
  [key: string]: unknown;
};
export type Document = { change?: ResolvedChange; subjectDeprecation?: ResolvedSubjectDeprecation; file: string; frontmatter: Frontmatter; body: string; tree: unknown; variant: Variant; route: string; markdownRoute: string; readerFilters?: ReaderSelection; focusedContractUrl?: string; contentDigest?: string; endpoint?: { method: string; path: string; webhook?: boolean } };
export type NavigationNode = { id: string; label: string; route?: string; tab?: boolean; search?: string; subjectLifecycle?: Frontmatter['subjectLifecycle']; method?: string; webhook?: boolean; readerFilters?: ReaderSelection; items?: NavigationNode[] };
export type PublicationRoutingConfig = {
  site: { basePath?: unknown };
  publications: { channels: Record<string, { pathPrefix?: string }>; versions: Record<string, { pathPrefix?: string }> };
};
export async function readDocument(file: string, frontmatterConfig?: unknown, enrich?: (source: Record<string, unknown>) => Promise<Record<string, unknown>>, sourceText?: string): Promise<{ frontmatter: Frontmatter; sourceFrontmatter: Record<string, unknown>; body: string }> {
  const source = sourceText ?? await readFile(file, 'utf8');
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(source);
  if (!match) throw new Error(`${file}: missing YAML frontmatter`);
  const sourceFrontmatter = parseYaml(match[1], file) as Record<string, unknown>;
  if (!sourceFrontmatter || typeof sourceFrontmatter !== 'object' || Array.isArray(sourceFrontmatter)) throw new Error(`${file}: page frontmatter must be a mapping`);
  const frontmatter = resolveFrontmatter(enrich ? await enrich(sourceFrontmatter) : sourceFrontmatter, frontmatterConfig);
  for (const key of ['id', 'title', 'type', 'summary', 'slug']) if (typeof frontmatter[key] !== 'string' || !frontmatter[key]) throw new Error(`${file}: missing ${key}`);
  if (frontmatter.language !== undefined && (typeof frontmatter.language !== 'string' || !frontmatter.language.trim())) throw new Error(`${file}: language must be nonempty text`);
  if (frontmatter.operations && (!Array.isArray(frontmatter.operations) || frontmatter.operations.some(x => typeof x !== 'string'))) throw new Error(`${file}: operations must be IDs`);
  if (frontmatter.subjectLifecycle !== undefined && !['deprecated', 'in-development', 'beta', 'experimental'].includes(frontmatter.subjectLifecycle)) throw new Error(`${file}: subjectLifecycle must be deprecated, in-development, beta, or experimental`);
  validatePageText(frontmatter.displayText, file);
  return { frontmatter, sourceFrontmatter, body: source.slice(match[0].length) };
}

export function routeFor(frontmatter: Frontmatter, variant: Variant, config: PublicationRoutingConfig): string {
  const channel = config.publications.channels[variant.channel];
  const version = config.publications.versions[variant.version];
  if (!channel || !version) throw new Error(`Unknown publication ${variant.channel}/${variant.version}`);
  const slug = frontmatter.slug;
  if (!slug.startsWith('/') || slug.includes('..') || /[?#]/.test(slug) || /%2f|%5c/i.test(slug)) throw new Error(`${frontmatter.id}: invalid slug ${slug}`);
  if (/^\/(?:\.well-known|api)(?:\/|$)/i.test(slug)) throw new Error(`${frontmatter.id}: slug uses a reserved discovery path`);
  const languagePrefix = variant.language === defaultLanguage(config) ? '' : `/${variant.language}`;
  const parts = [normalizeBasePath(config.site.basePath), languagePrefix, channel.pathPrefix ?? '', version.pathPrefix ?? '', slug].filter(Boolean);
  const normalized = '/' + parts.join('/').replace(/\/+/g, '/').replace(/^\//, '').replace(/\/$/, '');
  return normalized === '/' ? '/' : normalized;
}

export function markdownRoute(route: string, basePath = ''): string { return route === '/' || (basePath && route === basePath) ? `${basePath}/index.md` : `${route}.md`; }
