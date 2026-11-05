import { createHash } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { markdownTokens } from './markdown-size.js';
import { queryBuiltSite, type SearchOptions } from './search-query.js';
import { publicationKey, samePublication, type PublicationCoordinate } from './publication-identity.js';

export const bundledDocumentation = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../agent-docs');
export type DocumentationErrorCode = 'invalid_input' | 'unknown_page' | 'unknown_section' | 'missing_index' | 'internal_error';
export class DocumentationError extends Error {
  constructor(public readonly code: DocumentationErrorCode, message: string) { super(message); }
}
export const documentationFailure = (error: unknown) => ({ status: 'error' as const, error: { code: error instanceof DocumentationError ? error.code : 'internal_error', message: error instanceof DocumentationError ? error.message : 'Documentation could not be loaded; check the built site files.' } });
export type DocumentationOptions = SearchOptions & { maxTokens?: number };
export const documentationTokens = markdownTokens;

function validate(options: DocumentationOptions) {
  const maxTokens = options.maxTokens ?? 4096;
  if (!Number.isSafeInteger(maxTokens) || maxTokens < 256 || maxTokens > 100_000) throw new DocumentationError('invalid_input', 'maxTokens must be an integer from 256 to 100000');
  for (const key of ['product', 'channel', 'version', 'language'] as const) if (options[key] !== undefined && (typeof options[key] !== 'string' || !options[key]?.trim() || options[key]!.length > 128)) throw new DocumentationError('invalid_input', `${key} must be nonempty text of at most 128 characters`);
  return maxTokens;
}

function budget<T extends object>(data: T, maxTokens: number, truncated: boolean) {
  const result = { ...data, budget: { maxTokens, encoding: 'cl100k_base', tokens: 0, truncated } };
  // Reserve all digits of the largest possible count, including the metadata itself.
  result.budget.tokens = maxTokens;
  result.budget.tokens = documentationTokens(JSON.stringify(result));
  let actual = documentationTokens(JSON.stringify(result));
  for (let i = 0; actual > result.budget.tokens && i < 8; i++) {
    result.budget.tokens = actual;
    actual = documentationTokens(JSON.stringify(result));
  }
  return { result, fits: actual <= result.budget.tokens && result.budget.tokens <= maxTokens };
}

async function loadJson(directory: string, name: string): Promise<any> {
  try { return JSON.parse(await readFile(path.join(directory, name), 'utf8')); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new DocumentationError('missing_index', `Missing ${name}; build the documentation first${name === 'search-index.json' ? ' with search indexing enabled' : ''}.`);
    throw new DocumentationError('internal_error', `Cannot read valid ${name}. Rebuild the documentation.`);
  }
}

/** Compact discovery of published coordinates, without returning page inventories. */
export async function listDocumentationPublications(directory: string, options: DocumentationOptions & { offset?: number; publication?: PublicationCoordinate } = {}) {
  const maxTokens = validate({ ...options, maxTokens: options.maxTokens ?? 2048 });
  const limit = options.limit ?? 20;
  const offset = options.offset ?? 0;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100 || !Number.isSafeInteger(offset) || offset < 0) throw new DocumentationError('invalid_input', 'limit must be from 1 to 100 and offset must be a nonnegative safe integer');
  const manifest = await loadJson(directory, 'documents.json');
  const source = manifest?.publications?.enabled ?? manifest?.documents?.map((doc: any) => doc.variant);
  const valid = (item: any): item is PublicationCoordinate => item && typeof item === 'object' && !Array.isArray(item) && ['channel', 'version', 'language'].every(key => typeof item[key] === 'string' && item[key].length > 0 && item[key].length <= 128) && (item.product === undefined || typeof item.product === 'string' && item.product.length > 0 && item.product.length <= 128);
  if (manifest?.schemaVersion !== 1 || !Array.isArray(source) || source.some(item => !valid(item))) throw new DocumentationError('internal_error', 'Invalid publication metadata. Rebuild the documentation.');
  const coordinates = source.map((item: PublicationCoordinate): PublicationCoordinate => ({ channel: item.channel, version: item.version, language: item.language, ...(item.product === undefined ? {} : { product: item.product }) }));
  const available: PublicationCoordinate[] = [...new Map<string, PublicationCoordinate>(coordinates.map((item: PublicationCoordinate) => [publicationKey(item), item])).values()]
    .filter(item => (!options.publication || samePublication(item, options.publication)) && ['product', 'channel', 'version', 'language'].every(key => !options[key as keyof SearchOptions] || item[key as keyof PublicationCoordinate] === options[key as keyof SearchOptions]))
    .sort((a, b) => publicationKey(a).localeCompare(publicationKey(b)));
  const total = available.length;
  let publications = available.slice(offset, offset + limit);
  while (true) {
    const products = [...new Set(publications.flatMap(item => item.product === undefined ? [] : [item.product]))].map(id => {
      const catalog = manifest.publications?.products?.[id];
      const defaultVersion = typeof catalog?.defaultVersion === 'string' && available.some(item => item.product === id && item.version === catalog.defaultVersion) ? catalog.defaultVersion : undefined;
      return { id, ...(typeof catalog?.label === 'string' ? { label: catalog.label.slice(0, 160) } : {}), ...(defaultVersion === undefined ? {} : { defaultVersion }) };
    });
    const nextOffset = offset + publications.length < total ? offset + publications.length : undefined;
    const result = budget({ status: 'ok' as const, total, offset, publications, ...(products.length ? { products } : {}), ...(nextOffset === undefined ? {} : { nextOffset }) }, maxTokens, nextOffset !== undefined);
    if (result.fits) return result.result;
    if (!publications.length || publications.length === 1) throw new DocumentationError('invalid_input', 'maxTokens is too small for publication metadata. Increase the budget.');
    publications = publications.slice(0, -1);
  }
}

export async function searchDocumentation(directory: string, query: string, options: DocumentationOptions = {}) {
  const maxTokens = validate(options);
  if (typeof query !== 'string' || !query.trim() || query.length > 512) throw new DocumentationError('invalid_input', 'query must be nonempty text of at most 512 characters');
  if (options.limit !== undefined && (!Number.isSafeInteger(options.limit) || options.limit < 1 || options.limit > 100)) throw new DocumentationError('invalid_input', 'limit must be an integer from 1 to 100');
  await loadJson(directory, 'search-index.json');
  let search: Awaited<ReturnType<typeof queryBuiltSite>>;
  try { search = await queryBuiltSite(directory, query, options); }
  catch (error) {
    const message = (error as Error).message;
    if (/selected publication|multiple publications/.test(message)) throw new DocumentationError('invalid_input', message);
    throw new DocumentationError('internal_error', 'Cannot search the documentation index. Rebuild the documentation.');
  }
  let results = search.results;
  while (true) {
    const bounded = budget({ ...search, results }, maxTokens, results.length < search.total);
    if (bounded.fits) return bounded.result;
    if (!results.length) throw new DocumentationError('invalid_input', 'maxTokens is too small for the search metadata. Increase the budget or shorten the query.');
    results = results.slice(0, -1);
  }
}

async function selectDocument(directory: string, id: string, options: DocumentationOptions) {
  if (typeof id !== 'string' || !id.trim() || id.length > 256) throw new DocumentationError('invalid_input', 'id must be nonempty text of at most 256 characters');
  const manifest = await loadJson(directory, 'documents.json');
  if (manifest?.schemaVersion !== 1 || !Array.isArray(manifest.documents) || manifest.documents.some((doc: any) => !doc || typeof doc.id !== 'string' || typeof doc.title !== 'string' || typeof doc.url !== 'string' || typeof doc.markdownUrl !== 'string' || !doc.variant || (doc.variant.product !== undefined && (typeof doc.variant.product !== 'string' || !doc.variant.product)) || ['channel', 'version', 'language'].some(key => typeof doc.variant[key] !== 'string'))) throw new DocumentationError('internal_error', 'Invalid documents.json. Rebuild the documentation.');
  const matching = manifest.documents.filter((doc: any) => doc.id === id);
  if (!matching.length) throw new DocumentationError('unknown_page', `No document with ID ${id}; search the documentation first.`);
  const selected = matching.filter((doc: any) => ['product', 'channel', 'version', 'language'].every(key => !options[key as keyof SearchOptions] || doc.variant[key] === options[key as keyof SearchOptions]));
  if (selected.length !== 1) throw new DocumentationError('invalid_input', selected.length ? 'Page has multiple publications; select product where applicable, channel, version, and language.' : 'Page does not match the selected publication.');
  return selected[0];

}

async function readMarkdown(directory: string, markdownUrl: string): Promise<string> {
  let content: string;
  try {
    const root = await realpath(directory);
    if (!markdownUrl.startsWith('/') || /[?#\\]/.test(markdownUrl)) throw new Error('Invalid Markdown URL');
    const file = await realpath(path.resolve(root, decodeURIComponent(markdownUrl.slice(1))));
    if (!file.startsWith(`${root}${path.sep}`) || !file.endsWith('.md')) throw new Error('Markdown path escapes site');
    content = await readFile(file, 'utf8');
  } catch { throw new DocumentationError('internal_error', 'Cannot read the published Markdown page. Rebuild the documentation.'); }
  return content;
}

export async function getDocumentationPage(directory: string, id: string, options: DocumentationOptions = {}) {
  const maxTokens = validate(options);
  const doc = await selectDocument(directory, id, options);
  const content = await readMarkdown(directory, doc.markdownUrl);
  const metadata = { status: 'ok' as const, id: doc.id as string, title: doc.title as string, url: doc.url as string, markdownUrl: doc.markdownUrl as string, publication: doc.variant as { product?: string; channel: string; version: string; language: string } };
  const full = budget({ ...metadata, content }, maxTokens, false);
  if (full.fits) return full.result;
  if (!budget({ ...metadata, content: '' }, maxTokens, true).fits) throw new DocumentationError('invalid_input', 'maxTokens is too small for the page metadata. Increase the budget.');
  const characters = [...content];
  let low = 0, high = characters.length;
  // Each accepted candidate fits; a final count is made over the serialized result.
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (budget({ ...metadata, content: characters.slice(0, middle).join('') }, maxTokens, true).fits) low = middle;
    else high = middle - 1;
  }
  return budget({ ...metadata, content: characters.slice(0, low).join('') }, maxTokens, true).result;
}

export async function getDocumentationOutline(directory: string, id: string, options: DocumentationOptions = {}) {
  const maxTokens = validate(options);
  const doc = await selectDocument(directory, id, options);
  if (!Array.isArray(doc.sections)) throw new DocumentationError('missing_index', 'Section outline is unavailable; rebuild the documentation.');
  const data = { status: 'ok' as const, id: doc.id, title: doc.title, publication: doc.variant, markdownUrl: doc.markdownUrl, digest: doc.digest, sections: doc.sections };
  const result = budget(data, maxTokens, false);
  if (!result.fits) {
    const complete = budget(data, 100_000, false);
    if (!complete.fits) throw new DocumentationError('invalid_input', 'The complete outline exceeds the 100000-token limit. Use search_docs to find a page or section read instead.');
    const retryTokens = Math.min(100_000, Math.ceil(complete.result.budget.tokens / 1000) * 1000);
    throw new DocumentationError('invalid_input', `The complete outline needs about ${complete.result.budget.tokens} tokens including metadata. Retry get_outline with maxTokens=${retryTokens}.`);
  }
  return result.result;
}

export async function getDocumentationSection(directory: string, id: string, sectionId: string, options: DocumentationOptions = {}) {
  const maxTokens = validate(options);
  if (typeof sectionId !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(sectionId) || sectionId.length > 512) throw new DocumentationError('invalid_input', 'section must be an ID returned by the page outline');
  const doc = await selectDocument(directory, id, options);
  if (!Array.isArray(doc.sections)) throw new DocumentationError('missing_index', 'Section outline is unavailable; rebuild the documentation.');
  const section = doc.sections.find((item: any) => item.id === sectionId);
  if (!section) throw new DocumentationError('unknown_section', `No section ${sectionId}; read the page outline first.`);
  const content = await readMarkdown(directory, section.markdownUrl);
  if (section.parentDigest !== doc.digest || section.parentMarkdownUrl !== doc.markdownUrl || createHash('sha256').update(content).digest('hex') !== section.digest) throw new DocumentationError('internal_error', 'Section or parent metadata is stale; rebuild the documentation.');
  const result = budget({ status: 'ok' as const, id: doc.id, publication: doc.variant, section, content }, maxTokens, false);
  if (!result.fits) throw new DocumentationError('invalid_input', 'maxTokens is too small for the complete section. Increase the budget; sections are never cut mid-block.');
  return result.result;
}
