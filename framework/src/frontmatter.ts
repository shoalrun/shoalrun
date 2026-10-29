import { validateAuthoredChange, changeKinds } from './authored-change.js';
import { validateSubjectDeprecation } from './subject-deprecation.js';
import { validateCardMetadata } from './cards.js';
import { resolveTaxonomy, validateTaxonomy, taxonomySchema } from './taxonomy.js';
import type { Frontmatter } from './content.js';
import { validateStandaloneSectionDeclarations } from './section-identity.js';

export const nativePublicFields = new Set(['id', 'title', 'type', 'summary', 'description', 'language', 'locale', 'date', 'updated', 'verified', 'releaseVersion', 'product', 'area', 'subarea', 'operations', 'relatedApiReferences', 'audiences', 'readerFilters', 'tags', 'subjectLifecycle', 'subjectDeprecation', 'change', 'lifecycle']);
export const protectedMetadataRoots = new Set(['standaloneSections', 'access', 'seo', 'markdownMetadata', 'variables', 'tocDepth', 'layout', 'showNavigationTabs', 'showVerified', 'image', 'private', 'internal', 'card', 'displayText', 'publications']);
const fieldTypes = new Set(['string', 'number', 'integer', 'boolean', 'object', 'array']);
const safePath = (value: string) => /^[A-Za-z_][A-Za-z0-9_-]*(?:\.[A-Za-z_][A-Za-z0-9_-]*)*$/.test(value);
type Definition = { type: string; description?: string; public?: boolean; required?: boolean; items?: string; enum?: unknown[] };

const object = (value: unknown): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value);

function mergeMetadata(base: Record<string, any>, overlay: Record<string, any>): Record<string, any> {
  const result = { ...base };
  for (const [key, value] of Object.entries(overlay)) {
    if (['__proto__', 'prototype', 'constructor'].includes(key)) throw new Error(`Unsafe frontmatter key ${key}`);
    result[key] = object(value) ? mergeMetadata(object(result[key]) ? result[key] : {}, value) : structuredClone(value);
  }
  return result;
}

export function frontmatterLayers(config: any = {}) {
  if (!object(config)) throw new Error('frontmatter must be a mapping');
  for (const key of Object.keys(config)) if (!['fields', 'defaults', 'enforced', 'locales', 'changelogIdentifier', 'taxonomy'].includes(key)) throw new Error(`Unknown frontmatter setting ${key}`);
  resolveTaxonomy(config.taxonomy);
  if (config.locales !== undefined && (!object(config.locales) || Object.entries(config.locales).some(([language, locale]) => !language.trim() || typeof locale !== 'string' || !locale.trim()))) throw new Error('frontmatter.locales must map languages to nonempty locale values');
  if (config.changelogIdentifier !== undefined && !['date', 'version', 'either'].includes(config.changelogIdentifier)) throw new Error('frontmatter.changelogIdentifier must be date, version, or either');
  const layers: Record<string, Record<string, any>> = {};
  for (const name of ['defaults', 'enforced']) {
    const layer = config[name] === undefined ? {} : config[name];
    if (!object(layer)) throw new Error(`frontmatter.${name} must be a mapping`);
    for (const field of ['id', 'slug', 'publications', 'standaloneSections', 'subjectDeprecation', 'change']) if (Object.hasOwn(layer, field)) throw new Error(`frontmatter.${name}.${field} must stay page-specific`);
    layers[name] = mergeMetadata({}, layer);
  }
  return { defaults: layers.defaults, enforced: layers.enforced };
}

export function resolveFrontmatter(page: unknown, config?: any): Frontmatter {
  if (!object(page)) throw new Error('Page frontmatter must be a mapping');
  const { defaults, enforced } = frontmatterLayers(config);
  return mergeMetadata(mergeMetadata(defaults, page), enforced) as Frontmatter;
}

export function defaultLanguage(config: any): string {
  const layers = frontmatterLayers(config.frontmatter);
  const language = layers.enforced.language ?? layers.defaults.language ?? config.publications?.defaults?.language ?? 'en';
  if (typeof language !== 'string' || !language.trim()) throw new Error('Default language must be nonempty text');
  return language;
}

export function applyFormattingLocale(frontmatter: Frontmatter, config: any, source: Record<string, unknown> = {}): void {
  frontmatterLayers(config);
  if (source.locale !== undefined || config?.enforced?.locale !== undefined) return;
  const value = config?.locales?.[frontmatter.language ?? ''];
  if (value !== undefined) frontmatter.locale = value;
}

export function declaredFrontmatterFields(config: any): Map<string, Definition> {
  frontmatterLayers(config);
  const fields = config?.fields ?? {};
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) throw new Error('frontmatter.fields must be a mapping');
  const result = new Map<string, Definition>();
  for (const [name, raw] of Object.entries<any>(fields)) {
    if (!safePath(name) || name.split('.').some(segment => ['__proto__', 'prototype', 'constructor'].includes(segment))) throw new Error(`Invalid frontmatter field path ${name}`);
    const root = name.split('.')[0];
    if (nativePublicFields.has(root) || protectedMetadataRoots.has(root) || ['slug', 'channel', 'version'].includes(root)) throw new Error(`Cannot redefine native or protected frontmatter field ${name}`);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error(`Frontmatter field ${name} needs a declaration`);
    for (const key of Object.keys(raw)) if (!['type', 'description', 'public', 'required', 'items', 'enum'].includes(key)) throw new Error(`Unknown frontmatter field setting ${name}.${key}`);
    if (!fieldTypes.has(raw.type)) throw new Error(`Invalid frontmatter field type ${name}: ${raw.type}`);
    if (raw.description !== undefined && typeof raw.description !== 'string') throw new Error(`Frontmatter field description must be text: ${name}`);
    if (raw.public !== undefined && typeof raw.public !== 'boolean') throw new Error(`Frontmatter field public must be true or false: ${name}`);
    if (raw.required !== undefined && typeof raw.required !== 'boolean') throw new Error(`Frontmatter field required must be true or false: ${name}`);
    if (raw.items !== undefined && (raw.type !== 'array' || !fieldTypes.has(raw.items))) throw new Error(`Frontmatter field items needs an array item type: ${name}`);
    if (raw.enum !== undefined && (!Array.isArray(raw.enum) || !raw.enum.length || raw.enum.some((value: unknown) => !matchesType(value, raw.type) || typeof value === 'object'))) throw new Error(`Frontmatter field enum must contain scalar values of the declared type: ${name}`);
    result.set(name, raw);
  }
  for (const name of result.keys()) {
    const parts = name.split('.');
    for (let i = 1; i < parts.length; i++) {
      const parent = result.get(parts.slice(0, i).join('.'));
      if (parent && parent.type !== 'object') throw new Error(`Frontmatter parent ${parts.slice(0, i).join('.')} must be an object`);
    }
  }
  return result;
}

function matchesType(value: unknown, type: string): boolean {
  if (type === 'array') return Array.isArray(value);
  if (type === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value);
  if (type === 'integer') return typeof value === 'number' && Number.isInteger(value);
  return typeof value === type;
}

export function validateFrontmatter(frontmatter: Frontmatter, config: any, file: string, source?: Record<string, unknown>): void {
  const taxonomy = resolveTaxonomy(config?.taxonomy);
  validateTaxonomy(frontmatter, taxonomy, file, source);
  validateCardMetadata(frontmatter.card, file);
  validateSubjectDeprecation(frontmatter.subjectDeprecation, file);
  validateAuthoredChange(frontmatter, file);
  validateStandaloneSectionDeclarations(frontmatter.standaloneSections, file);
  const mode = config?.changelogIdentifier ?? 'either';
  if (frontmatter.type === 'changelog-entry' &&
    (mode === 'date' && frontmatter.date === undefined || mode === 'version' && frontmatter.releaseVersion === undefined || mode === 'either' && frontmatter.date === undefined && frontmatter.releaseVersion === undefined))
    throw new Error(`${file}: changelog-entry pages need ${mode === 'either' ? 'date or releaseVersion' : mode === 'version' ? 'releaseVersion' : 'date'}`);
  if (frontmatter.releaseVersion !== undefined && (typeof frontmatter.releaseVersion !== 'string' || !frontmatter.releaseVersion.trim())) throw new Error(`${file}: releaseVersion must be nonempty text`);
  for (const field of ['date', 'verified']) if (frontmatter[field] !== undefined) {
    const value = frontmatter[field];
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`)) || new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value) throw new Error(`${file}: ${field} must be a real YYYY-MM-DD calendar date`);
  }
  if (frontmatter.updated !== undefined) {
    const value = frontmatter.updated;
    const dateOnly = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
    const timestamp = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value);
    const calendar = typeof value === 'string' ? value.slice(0, 10) : '';
    if ((!dateOnly && !timestamp) || Number.isNaN(Date.parse(value)) || Number.isNaN(Date.parse(`${calendar}T00:00:00Z`)) || new Date(`${calendar}T00:00:00Z`).toISOString().slice(0, 10) !== calendar) throw new Error(`${file}: updated must be a real YYYY-MM-DD date or timezone-qualified ISO timestamp`);
  }
  for (const field of ['channel', 'version', 'language', 'locale', 'product', 'area', 'subarea']) {
    const value = frontmatter[field];
    if ((field === 'area' || field === 'subarea') && Array.isArray(value) && taxonomy?.multiple.includes(field)) continue;
    if (value !== undefined && (typeof value !== 'string' || !value.trim())) throw new Error(`${file}: ${field} must be nonempty text`);
  }
  if (frontmatter.publications !== undefined) {
    const publications = frontmatter.publications;
    if (!Array.isArray(publications) || !publications.length || publications.some(item => !object(item) || Object.keys(item).some(key => !['channel', 'version'].includes(key)) || typeof item.channel !== 'string' || !item.channel.trim() || typeof item.version !== 'string' || !item.version.trim())) {
      throw new Error(`${file}: publications must list channel and version pairs`);
    }
    const keys = publications.map(item => `${item.channel}|${item.version}`);
    if (new Set(keys).size !== keys.length) throw new Error(`${file}: publications has duplicate channel/version pairs`);
  }
  if (frontmatter.description !== undefined && (typeof frontmatter.description !== 'string' || !frontmatter.description.trim())) throw new Error(`${file}: description must be nonempty text`);
  if (frontmatter.lifecycle !== undefined && (typeof frontmatter.lifecycle !== 'string' || !frontmatter.lifecycle.trim())) throw new Error(`${file}: lifecycle must be nonempty text`);
  for (const field of ['audiences', 'tags']) {
    const value = frontmatter[field];
    if (value !== undefined && (!Array.isArray(value) || value.some(item => typeof item !== 'string'))) throw new Error(`${file}: ${field} must be a list of strings`);
  }
  if (frontmatter.readerFilters !== undefined && (!object(frontmatter.readerFilters) || Object.values(frontmatter.readerFilters).some(value => !Array.isArray(value) || value.some(item => typeof item !== 'string')))) {
    throw new Error(`${file}: readerFilters must map filter names to lists of strings`);
  }
  if (frontmatter.relatedApiReferences !== undefined &&
    (!['guide', 'how-to'].includes(frontmatter.type) || !Array.isArray(frontmatter.relatedApiReferences) ||
      frontmatter.relatedApiReferences.some(id => typeof id !== 'string' || !id.trim()) ||
      new Set(frontmatter.relatedApiReferences).size !== frontmatter.relatedApiReferences.length)) {
    throw new Error(`${file}: relatedApiReferences must be a unique list of API reference IDs on a guide or how-to page`);
  }
  if (frontmatter.access !== undefined && (!object(frontmatter.access) || typeof frontmatter.access.policy !== 'string' || !frontmatter.access.policy.trim())) throw new Error(`${file}: access needs a nonempty policy`);
  if (frontmatter.tocDepth !== undefined && ![0, 2, 3, 4, 5, 6].includes(frontmatter.tocDepth)) throw new Error(`${file}: tocDepth must be 0 or an integer from 2 through 6`);
  if (frontmatter.layout !== undefined && !['docs', 'wide', 'landing', 'splash'].includes(frontmatter.layout)) throw new Error(`${file}: layout must be docs, wide, landing, or splash`);
  if (frontmatter.showVerified !== undefined && typeof frontmatter.showVerified !== 'boolean') throw new Error(`${file}: showVerified must be true or false`);
  if (frontmatter.showNavigationTabs !== undefined && typeof frontmatter.showNavigationTabs !== 'boolean') throw new Error(`${file}: showNavigationTabs must be true or false`);
  if (frontmatter.image !== undefined && (typeof frontmatter.image !== 'string' || !/\.(?:png|jpe?g)$/i.test(frontmatter.image) || /^[a-z][a-z0-9+.-]*:/i.test(frontmatter.image))) throw new Error(`${file}: image must be a local .png or .jpg file`);
  if (frontmatter.variables !== undefined && (!frontmatter.variables || typeof frontmatter.variables !== 'object' || Array.isArray(frontmatter.variables))) throw new Error(`${file}: variables must be a mapping`);
  if (frontmatter.seo !== undefined) {
    if (!frontmatter.seo || typeof frontmatter.seo !== 'object' || Array.isArray(frontmatter.seo)) throw new Error(`${file}: seo must be a mapping`);
    for (const [name, value] of Object.entries(frontmatter.seo)) {
      if (!['title', 'description', 'noindex'].includes(name)) throw new Error(`${file}: unsupported SEO field seo.${name}`);
      if (name === 'noindex' ? typeof value !== 'boolean' : typeof value !== 'string') throw new Error(`${file}: seo.${name} must be ${name === 'noindex' ? 'true or false' : 'text'}`);
    }
  }
  const fields = declaredFrontmatterFields(config);
  for (const [name, definition] of fields) {
    const segments = name.split('.');
    const value = segments.reduce<any>((at, segment) => at !== null && at !== undefined && Object.prototype.hasOwnProperty.call(at, segment) ? at[segment] : undefined, frontmatter);
    if (value === undefined) {
      if (definition.required) throw new Error(`${file}: missing required frontmatter field ${name}`);
      continue;
    }
    if (!matchesType(value, definition.type)) throw new Error(`${file}: frontmatter ${name} must be ${definition.type}`);
    if (definition.items && Array.isArray(value) && value.some(item => !matchesType(item, definition.items!))) throw new Error(`${file}: frontmatter ${name} items must be ${definition.items}`);
    if (definition.enum && !definition.enum.some(item => Object.is(item, value))) throw new Error(`${file}: frontmatter ${name} is not in its declared enum`);
  }
}

export function publicFrontmatterPaths(config: any): Set<string> {
  return new Set([...declaredFrontmatterFields(config)].filter(([, definition]) => definition.public === true).map(([name]) => `frontmatter.${name}`));
}

export function frontmatterSchema(config: any): any {
  const properties: Record<string, any> = {
    id: { type: 'string', description: 'Stable page identity used by document links and cards; keep it when the file or URL changes.' },
    title: { type: 'string', description: 'Page heading and default browser title.' },
    summary: { type: 'string', description: 'Short page preview, used by cards and other configured text surfaces.' },
    description: { type: 'string', minLength: 1, description: 'Fuller description of what the page covers; kept distinct from the short summary.' },
    type: { type: 'string', description: 'Document kind, such as guide or api-reference; can select a Markdown metadata profile.' },
    date: { type: 'string', format: 'date', description: 'Publication date in YYYY-MM-DD format; optional for release notes and one possible changelog identifier.' },
    updated: { type: 'string', description: 'Date of the last meaningful page update: YYYY-MM-DD or a timezone-qualified ISO timestamp. Used as sitemap lastmod.' },
    verified: { type: 'string', format: 'date', description: 'Date someone verified the technical claims; independent of content revision and never assigned by the build.' },
    releaseVersion: { type: 'string', minLength: 1, description: 'Release label for a note or changelog entry; separate from the documentation publication version.' },
    slug: { type: 'string', description: 'Page URL path before channel, version, and language prefixes.' },
    channel: { type: 'string', description: 'Publication environment, such as sandbox or production; selects an enabled publication and API source.' },
    version: { type: 'string', description: 'API or documentation edition, such as v1; selects an enabled publication and API source.' },
    publications: { type: 'array', minItems: 1, items: { type: 'object', properties: { channel: { type: 'string' }, version: { type: 'string' } }, required: ['channel', 'version'], additionalProperties: false }, description: 'Publish this one page file in each listed channel/version pair. Use instead of page-level channel and version; language stays the same.' },
    language: { type: 'string', description: 'Content language; uses frontmatter defaults/enforced values, then publications.defaults.language, then en.' },
    locale: { type: 'string', description: 'Formatting conventions used in the content; can inherit a project locale for the page language and can be overridden per page.' },
    product: { type: 'string', minLength: 1, description: 'Optional product category. Also selects the product reader facet when that facet is configured.' },
    area: { type: 'string', minLength: 1, description: 'Optional area category. Also selects the area reader facet when that facet is configured.' },
    subarea: { type: 'string', minLength: 1, description: 'Optional finer category. Also selects the subarea reader facet when that facet is configured.' },
    operations: { type: 'array', items: { type: 'string' }, description: 'Stable API operation IDs that connect this page to endpoint references and related documents.' },
    relatedApiReferences: { type: 'array', items: { type: 'string' }, description: 'API reference page IDs linked automatically from this guide and back from each reference, within the same publication.' },
    audiences: { type: 'array', items: { type: 'string' }, description: 'Readers this page is intended for; does not control who can access it.' },
    readerFilters: { type: 'object', additionalProperties: { type: 'array', items: { type: 'string' } }, description: 'Configured reader filter choices for this page. Missing facets are shared.' },
    tags: { type: 'array', items: { type: 'string' }, description: 'Editorial labels used to select pages in document collections.' },
    change: { type: 'object', additionalProperties: false, required: ['kind', 'affects'], description: 'Page-specific authored change meaning on a changelog-entry: kind, affected document IDs, and optional migration guide ID in the same publication. Omission means unclassified, not nonbreaking.', properties: { kind: { type: 'string', enum: [...changeKinds] }, affects: { type: 'array', minItems: 1, uniqueItems: true, items: { type: 'string', minLength: 1 } }, migration: { type: 'string', minLength: 1 } } },
    subjectDeprecation: { type: 'object', minProperties: 1, additionalProperties: false, description: 'Page-specific subject retirement dates and stable document IDs; requires deprecated subjectLifecycle, including OpenAPI inference. Dates do not change status automatically.', properties: { deprecatedOn: { type: 'string', format: 'date' }, sunsetOn: { type: 'string', format: 'date' }, replacement: { type: 'string', minLength: 1 }, migration: { type: 'string', minLength: 1 } } },
    subjectLifecycle: { type: 'string', enum: ['deprecated', 'in-development', 'beta', 'experimental'], description: 'Displays a content status badge in the page and navigation.' },
    lifecycle: { type: 'string', minLength: 1, description: 'Editorial lifecycle of the document; validated by an opted-in external vocabulary.' },
    standaloneSections: { type: 'array', items: { oneOf: [{ type: 'string', minLength: 1 }, { type: 'object', additionalProperties: false, required: ['id', 'context'], properties: { id: { type: 'string', pattern: '^[a-z0-9][a-z0-9-]{0,511}$' }, context: { const: 'section' } } }] }, uniqueItems: true, description: 'Page-specific standalone approval: a heading title approves contextual discovery with the page introduction; {id, context: section} approves the root level-two section slice for content export. IDs may be derived or explicitly anchored. Omitted means full-page reads.' },
    tocDepth: { type: 'integer', enum: [0, 2, 3, 4, 5, 6], description: 'Deepest heading shown in the page table of contents; 0 hides it. Defaults to 3.' },
    showVerified: { type: 'boolean', description: 'Show an authored verified date in the HTML page header. Defaults to true. False hides it only in HTML; Markdown and manifest dates remain unchanged. Does not assign a verification date.' },
    showNavigationTabs: { type: 'boolean', description: 'Show the HTML navigation section bar when tabs are configured. Defaults to true for docs and wide layouts, false for landing and splash. Does not change agent discovery or section membership.' },
    image: { type: 'string', pattern: '\\.(?:png|jpe?g)$', description: 'Local .png or .jpg shown in link previews for this page, relative to the page file; replaces the generated share image. Best at 1200×630.' },
    layout: { type: 'string', enum: ['docs', 'wide', 'landing', 'splash'], description: 'HTML page layout: docs (default), wide (no page outline, full content width), landing (no sidebar or outline; a Hero replaces the page header), or splash (full-bleed marketing page built from Hero and Section blocks).' },
    access: { type: 'object', properties: { policy: { type: 'string', description: 'Use public to publish this page; draft pages are excluded from the built site.' } }, required: ['policy'], additionalProperties: true, description: 'Controls whether the page enters a public build; this object is not exported to Markdown metadata.' },
    card: { type: 'object', properties: { title: { type: 'string', description: 'Card title; defaults to the page title.' }, description: { type: 'string', description: 'Card description; defaults to the page summary.' }, eyebrow: { type: 'string', description: 'Short label above a card title.' }, icon: { type: 'string', description: 'Optional Lucide icon name such as book-open. Decorative in HTML; omitted from Markdown.' } }, additionalProperties: false, description: 'Overrides how this page appears when another page includes a document card; its destination still resolves by page ID.' },
    seo: { type: 'object', properties: {
      title: { type: 'string', description: 'Overrides the HTML title; defaults to page title.' },
      description: { type: 'string', description: 'Overrides the HTML meta description; defaults to page summary.' },
      noindex: { type: 'boolean', description: 'If true, adds a noindex directive and excludes this public page from the XML sitemap.' }
    }, additionalProperties: false, description: 'Page-level HTML title, description, and indexing settings.' },
    variables: { type: 'object', additionalProperties: { type: ['string', 'number', 'boolean'] }, description: 'Page values supplied to registered snippets; expanded snippet text appears in both outputs.' },
    displayText: { type: 'object', properties: Object.fromEntries(['card', 'pageHeader', 'search', 'htmlDescription', 'socialCard'].map(name => [name, { type: 'string', minLength: 1 }])), additionalProperties: false, description: 'Per-page text overrides for configured presentation surfaces; not exported as metadata.' },
    markdownMetadata: { oneOf: [{ type: 'string' }, { type: 'object' }], description: 'Selects a configured profile or overrides this page’s Markdown YAML preamble.' }
  };
  const inherited = resolveFrontmatter({}, config);
  const required = ['id', 'title', 'summary', 'type', 'slug'].filter(name => inherited[name] === undefined);
  for (const [name, definition] of declaredFrontmatterFields(config)) {
    const segments = name.split('.');
    let at: Record<string, any> = { properties, required };
    for (const segment of segments.slice(0, -1)) {
      const child = (at.properties[segment] ??= { type: 'object', properties: {}, additionalProperties: true });
      if (child.type !== 'object') throw new Error(`Frontmatter parent ${segment} must be an object`);
      child.properties ??= {};
      at = child;
    }
    const last = segments.at(-1)!;
    const existing = at.properties[last];
    at.properties[last] = {
      type: definition.type,
      ...(existing?.properties ? { properties: existing.properties, additionalProperties: true, ...(existing.required ? { required: existing.required } : {}) } : {}),
      ...(definition.description ? { description: definition.description } : {}),
      ...(definition.items ? { items: { type: definition.items } } : {}),
      ...(definition.enum ? { enum: definition.enum } : {}),
      'x-shoalrun-agent-public': definition.public === true
    };
    if (definition.required && segments.reduce<any>((value, part) => value?.[part], inherited) === undefined) (at.required ??= []).push(last);
  }
  const taxonomy = resolveTaxonomy(config?.taxonomy);
  return { $schema: 'https://json-schema.org/draft/2020-12/schema', title: 'Documentation frontmatter', type: 'object', properties, required, additionalProperties: true, ...(taxonomy ? taxonomySchema(taxonomy, properties, required, inherited) : {}) };
}

export function frontmatterReference(config: any, sectionsOnly = false): string {
  const schema = frontmatterSchema(config);
  const taxonomy = resolveTaxonomy(config?.taxonomy);
  const cell = (value: string) => value.replaceAll('|', '\\|').replaceAll('\n', ' ');
  const nativeRows = (names: string[]) => names.flatMap(name => {
    const definition = schema.properties[name];
    const requirement = ['id', 'slug'].includes(name) || taxonomy?.requireExplicit.some(field => field === name) ? 'On each page' : schema.required.includes(name) ? 'After inheritance' : ['channel', 'version', 'access'].includes(name) ? 'Public page' : 'Optional';
    const type = definition === false ? 'Not allowed' : definition.type ?? definition.oneOf?.map((option: any) => option?.type).filter(Boolean).join(' or ') ?? 'string or object';
    return [
      `| \`${name}\` | ${type} | ${requirement} | ${cell(definition.description ?? '')} |`,
      ...(['access', 'card', 'seo'].includes(name) ? Object.entries<any>(definition.properties).map(([childName, child]) => `| \`${name}.${childName}\` | ${child.type} | ${name === 'access' ? 'With access' : 'Optional'} | ${cell(child.description ?? '')} |`) : [])
    ];
  });
  const table = ['| Field | Type | Needed | What it changes |', '| --- | --- | --- | --- |'];
  const project = [...declaredFrontmatterFields(config)];
  const lines = [
    '# Frontmatter reference', '',
    'This generated file is a project-wide field guide for authors and agents working with the repository. The build writes it to `.shoalrun/frontmatter-reference.md` beside the project config. Link to that local file from repository instructions when agents need it.', '',
    'Frontmatter is the YAML header between the first pair of `---` lines in a `.md` or `.mdx` source page. It tells the compiler what the page is, where to publish it, and how to connect it to other content. The prose below the second `---` is the page body. This example header illustrates the fields; it is not necessarily the header of the page linking here.', '',
    '```yaml', '---', 'id: guide.create-payment', 'title: Create a payment', 'summary: Submit a payment with the example API.', 'type: how-to', 'slug: /guides/create-payment', 'channel: production', 'version: v1', 'access: { policy: public }', '---', '```', '',
    'This header describes one page. Its `id` stays stable when `slug` changes; `channel` and `version` select the publication in which that page appears. A **publication** is an enabled combination of channel, version, and language in project config. A public page also needs `access.policy: public`. The “Needed” column below refers to the *resolved* header after project defaults and enforced values are merged. Only `id` and `slug` must be written on each source page.', '',
    '## Identify and route a page', '',
    'Use the page ID for links and cards that should survive a URL change. The slug supplies the page part of the URL; publication prefixes may be added around it. Summary is short preview text; description is a separate, optional fuller account. Project output rules choose which field supplies each surface.', '',
    ...table, ...nativeRows(['id', 'title', 'summary', 'description', 'type', 'slug']), '',
    '## Choose a publication and visibility', '',
    'The project enables specific channel/version/language combinations. A page is built only for combinations matching its resolved values. `audiences` and `readerFilters` select reader views when the site config enables them; `access.policy` determines whether the page enters this public build. A draft page is excluded.', '',
    ...table, ...nativeRows(['channel', 'version', 'language', 'locale', 'access', 'audiences', 'readerFilters']), '',
    'Language is the content language and selects a publication. Locale describes formatting conventions in the content and does not select a publication. `frontmatter.locales` can set a project locale for each language; pages may override it.', '',
    '## Categorize, connect, and present the page', '',
    'By default, `product`, `area`, and `subarea` are optional, nonempty string categories. They can come from project defaults and appear in the document manifest and search index. A matching configured reader facet makes each category a page filter; without that facet it remains taxonomy only. `operations` links a guide or reference to stable API operation IDs. On a guide or how-to page, `relatedApiReferences` names API reference page IDs to add cross links in both directions within the same publication. Tags help document collections find the page. Card settings change its preview when another page links to it; they do not change the destination. `subjectLifecycle` displays the status of the documented API or feature; `lifecycle` is available for the document\'s editorial state. `tocDepth` limits the HTML page table of contents; use 0 to hide it. `layout` picks the HTML page layout: `docs`, `wide`, `landing`, or `splash`. `showNavigationTabs` overrides the navigation tab bar for this page; landing and splash pages hide it by default. `image` replaces the generated link-preview image. `date` and `releaseVersion` can identify a changelog entry under the project\'s `frontmatter.changelogIdentifier` rule.', '',
    ...table, ...nativeRows(['product', 'area', 'subarea', 'operations', 'relatedApiReferences', 'tags', 'date', 'releaseVersion', 'subjectLifecycle', 'subjectDeprecation', 'change', 'lifecycle', 'card', 'standaloneSections', 'tocDepth', 'layout', 'showNavigationTabs', 'showVerified', 'image']), '',
    'Projects can opt into built-in category enforcement with `frontmatter.taxonomy`. It declares areas and their allowed subareas, optional required fields, and optional explicit-field requirements for authored pages. Its `multiple` list permits arrays for selected category fields; otherwise each field allows one value. Defaults and enforced values still apply; generated API references use resolved categories. Definitions appear in the document manifest and constrain the generated frontmatter schema. Omit taxonomy or set it to false to preserve optional category behavior.', '',
    '## Control output details', '',
    '`seo` changes the browser title or HTML meta description. `displayText` overrides the text chosen for one output surface on this page. `variables` supplies values to registered snippets before they expand into the page body. `markdownMetadata` selects or overrides the YAML preamble of the generated Markdown twin—the machine-readable copy of this page. That generated preamble is separate from the source frontmatter shown above.', '',
    ...table, ...nativeRows(['seo', 'displayText', 'variables', 'markdownMetadata']), '',
    '## Project-defined fields', '',
    'A project can add page fields by declaring them in `frontmatter.fields`. The declaration gives a field path (such as `agent.intent`), a type, and a description. A dotted path means nested YAML on the page. Undeclared fields are still accepted in source pages, but only declared fields appear in this table and receive type checks.', '',
    ...(project.length ? [
      '| Field | Type | Required | Agent metadata approved | Description |', '| --- | --- | --- | --- | --- |',
      ...project.map(([name, definition]) => `| \`${name}\` | ${definition.type} | ${definition.required ? 'Yes' : 'No'} | ${definition.public ? 'Yes' : 'No'} | ${cell(definition.description ?? '')} |`)
    ] : ['This project has no declared custom fields.']),
    '', '“Required” means the field must exist after defaults and enforced values are applied. “Agent metadata approved” means `public: true` allows that value to be selected for the generated Markdown preamble; it does not publish the field automatically. Select approved fields in `outputs.markdown.metadata.fields`, a `byType` rule, or a page profile. Source page body text is published independently of this selection.',
    '', '## Global defaults and enforced values', '',
    'These are project config settings, not keys in a page header. `frontmatter.defaults` supplies values when a page omits them; `frontmatter.enforced` replaces page values. Resolution follows defaults → page → enforced. Objects merge recursively and arrays replace. IDs and slugs remain page-specific. Required fields and declared types are checked after resolution. Use an access default if authors need to keep individual pages as drafts.',
    '', '## Machine-readable schema', '',
    '[Open the JSON Schema](./frontmatter.schema.json). Undeclared fields are accepted but cannot enter public Markdown metadata until declared with `public: true`.', ''
  ];
  if (sectionsOnly) return lines.slice(lines.indexOf('## Identify and route a page'), lines.indexOf('## Machine-readable schema')).join('\n');
  return lines.join('\n');
}
