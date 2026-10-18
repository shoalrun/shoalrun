import type { Document } from './content-source.js';

export type LlmsDiscovery = { format: 'grouped' | 'flat'; primaryIds: string[]; optionalTypes: string[]; optionalPrefixes: string[]; fictionalPrefixes: string[] };
export function resolveLlmsDiscovery(value: unknown): LlmsDiscovery {
  if (value !== undefined && (!value || typeof value !== 'object' || Array.isArray(value))) throw new Error('outputs.llms must be a mapping');
  const config = (value ?? {}) as Record<string, unknown>;
  for (const key of Object.keys(config)) if (!['format', 'primaryIds', 'optionalTypes', 'optionalPrefixes', 'fictionalPrefixes'].includes(key)) throw new Error(`outputs.llms does not accept ${key}`);
  const format = config.format ?? 'grouped';
  if (format !== 'grouped' && format !== 'flat') throw new Error('outputs.llms.format must be grouped or flat');
  const strings = (key: string, fallback: string[]) => {
    const values = config[key] ?? fallback;
    if (!Array.isArray(values) || values.some(value => typeof value !== 'string' || !value.trim()) || new Set(values).size !== values.length) throw new Error(`outputs.llms.${key} must be a unique list of nonempty strings`);
    if (key.endsWith('Prefixes') && values.some(value => !value.startsWith('/') || value === '/' || value.endsWith('/') || /[?#\\]/.test(value) || value.includes('..'))) throw new Error(`outputs.llms.${key} must contain absolute page prefixes without trailing slashes`);
    return values as string[];
  };
  return { format, primaryIds: strings('primaryIds', []), optionalTypes: strings('optionalTypes', ['recipe', 'ingredient', 'cookbook']), optionalPrefixes: strings('optionalPrefixes', []), fictionalPrefixes: strings('fictionalPrefixes', []) };
}
const matchesPrefix = (slug: string, prefixes: string[]) => prefixes.some(prefix => slug === prefix || slug.startsWith(`${prefix}/`));
export const fictionalDocument = (doc: Document, config: LlmsDiscovery) => matchesPrefix(doc.frontmatter.slug, config.fictionalPrefixes);
export const optionalDocument = (doc: Document, config: LlmsDiscovery) => fictionalDocument(doc, config) || (!config.primaryIds.includes(doc.frontmatter.id) && (config.optionalTypes.includes(doc.frontmatter.type) || matchesPrefix(doc.frontmatter.slug, config.optionalPrefixes)));
