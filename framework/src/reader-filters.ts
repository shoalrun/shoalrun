export type ReaderSelection = Record<string, string[]>;
export type ReaderFacet = { label: string; options: Record<string, string> };
export type ReaderFilterControl = { facet?: string; display: 'select' | 'checks'; label?: string; scope?: 'page' };
export type ReaderFiltersConfig = {
  facets: Record<string, ReaderFacet>;
  typeDefaults: Record<string, ReaderSelection>;
  controls: { sidebar: boolean; header?: ReaderFilterControl };
  module?: string;
};

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const identifier = /^[a-z][a-z0-9-]*$/;

export function validateReaderSelection(value: unknown, config: ReaderFiltersConfig, where: string): ReaderSelection {
  if (!object(value)) throw new Error(`${where} must be a mapping of filter names to lists of choices`);
  const result: ReaderSelection = {};
  for (const [facet, choices] of Object.entries(value)) {
    if (!Object.hasOwn(config.facets, facet)) throw new Error(`${where}.${facet} is not a configured reader filter`);
    if (!Array.isArray(choices) || choices.some(choice => typeof choice !== 'string' || !config.facets[facet].options[choice]) || new Set(choices).size !== choices.length) {
      throw new Error(`${where}.${facet} must be a unique list of configured choices`);
    }
    result[facet] = choices;
  }
  return result;
}

export function validateReaderFilters(value: unknown): ReaderFiltersConfig | undefined {
  if (value === undefined) return undefined;
  if (!object(value) || Object.keys(value).some(key => !['facets', 'typeDefaults', 'controls', 'module'].includes(key)) || !object(value.facets) || !Object.keys(value.facets).length) {
    throw new Error('readerFilters needs a nonempty facets mapping and optional typeDefaults');
  }
  const facets: Record<string, ReaderFacet> = {};
  for (const [name, raw] of Object.entries(value.facets)) {
    if (!identifier.test(name) || !object(raw) || Object.keys(raw).some(key => !['label', 'options'].includes(key)) || typeof raw.label !== 'string' || !raw.label.trim() || !object(raw.options) || !Object.keys(raw.options).length) {
      throw new Error(`readerFilters.facets.${name} needs a label and nonempty options mapping`);
    }
    const options: Record<string, string> = {};
    for (const [id, label] of Object.entries(raw.options)) {
      if (!identifier.test(id) || typeof label !== 'string' || !label.trim()) throw new Error(`readerFilters.facets.${name}.options.${id} needs a readable label`);
      options[id] = label;
    }
    facets[name] = { label: raw.label, options };
  }
  const config: ReaderFiltersConfig = { facets, typeDefaults: {}, controls: { sidebar: true } };
  if (value.typeDefaults !== undefined) {
    if (!object(value.typeDefaults)) throw new Error('readerFilters.typeDefaults must be a mapping by page type');
    for (const [type, filters] of Object.entries(value.typeDefaults)) {
      if (!identifier.test(type)) throw new Error(`readerFilters.typeDefaults has invalid page type ${type}`);
      config.typeDefaults[type] = validateReaderSelection(filters, config, `readerFilters.typeDefaults.${type}`);
    }
  }
  if (value.controls !== undefined) {
    if (!object(value.controls) || Object.keys(value.controls).some(key => !['sidebar', 'header'].includes(key))) throw new Error('readerFilters.controls accepts sidebar and header');
    if (value.controls.sidebar !== undefined) {
      if (typeof value.controls.sidebar !== 'boolean') throw new Error('readerFilters.controls.sidebar must be true or false');
      config.controls.sidebar = value.controls.sidebar;
    }
    if (value.controls.header !== undefined) config.controls.header = validateReaderFilterControl(value.controls.header, config, 'readerFilters.controls.header');
  }
  if (value.module !== undefined) {
    if (typeof value.module !== 'string' || !/\.m?js$/.test(value.module) || /^(?:[a-z][a-z0-9+.-]*:|\/)/i.test(value.module)) throw new Error('readerFilters.module must be a local .js or .mjs path');
    config.module = value.module;
  }
  return config;
}

export function validateReaderFilterControl(value: unknown, config: ReaderFiltersConfig, where: string, allowPageScope = false): ReaderFilterControl {
  if (!object(value) || Object.keys(value).some(key => !['facet', 'display', 'label', ...(allowPageScope ? ['scope'] : [])].includes(key))) throw new Error(`${where} accepts facet, display, label${allowPageScope ? ', and scope' : ''}`);
  if (value.facet !== undefined && (typeof value.facet !== 'string' || !Object.hasOwn(config.facets, value.facet))) throw new Error(`${where}.facet must name a configured facet`);
  if (value.display !== undefined && !['select', 'checks'].includes(String(value.display))) throw new Error(`${where}.display must be select or checks`);
  if (value.label !== undefined && (typeof value.label !== 'string' || !value.label.trim())) throw new Error(`${where}.label must be nonempty text`);
  if (value.scope !== undefined && value.scope !== 'site' && value.scope !== 'page') throw new Error(`${where}.scope must be site or page`);
  return { ...(value.facet ? { facet: value.facet } : {}), display: (value.display as 'select' | 'checks') ?? 'select', ...(value.label ? { label: value.label as string } : {}), ...(value.scope === 'page' ? { scope: 'page' as const } : {}) };
}

export function pageReaderFilters(frontmatter: { type: string; audiences?: string[]; readerFilters?: unknown }, config: ReaderFiltersConfig | undefined, file: string): ReaderSelection {
  if (!config) {
    if (frontmatter.readerFilters !== undefined) throw new Error(`${file}: readerFilters needs readerFilters.facets in the site config`);
    return {};
  }
  const explicit = frontmatter.readerFilters === undefined ? {} : validateReaderSelection(frontmatter.readerFilters, config, `${file}: readerFilters`);
  if (frontmatter.audiences && config.facets.audience) {
    if (object(frontmatter.readerFilters) && Object.hasOwn(frontmatter.readerFilters, 'audience')) throw new Error(`${file}: use audiences or readerFilters.audience, not both`);
    explicit.audience = validateReaderSelection({ audience: frontmatter.audiences }, config, `${file}: audiences`).audience ?? [];
  }
  for (const facet of ['product', 'area', 'subarea'] as const) {
    const category = (frontmatter as Record<string, unknown>)[facet];
    if (category === undefined || !config.facets[facet]) continue;
    if (object(frontmatter.readerFilters) && Object.hasOwn(frontmatter.readerFilters, facet)) throw new Error(`${file}: use ${facet} or readerFilters.${facet}, not both`);
    explicit[facet] = validateReaderSelection({ [facet]: [category] }, config, `${file}: category`)[facet];
  }
  return Object.fromEntries(Object.entries({ ...(config.typeDefaults[frontmatter.type] ?? {}), ...explicit }).filter(([, choices]) => choices.length));
}

export function readerFilterAttribute(selection: ReaderSelection): string {
  return JSON.stringify(selection);
}

export function readerViewParam(selection: ReaderSelection): string {
  const parts = Object.entries(selection).filter(([, values]) => values.length).map(([facet, values]) => `${facet}:${values.join(',')}`);
  return parts.length ? parts.join(';') : 'all';
}
