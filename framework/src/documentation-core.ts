import { createHash } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { markdownTokens } from './markdown-size.js';
import { queryBuiltSite, type SearchOptions } from './search-query.js';

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
  for (const key of ['channel', 'version', 'language'] as const) if (options[key] !== undefined && (typeof options[key] !== 'string' || !options[key]?.trim() || options[key]!.length > 128)) throw new DocumentationError('invalid_input', `${key} must be nonempty text of at most 128 characters`);
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
  if (manifest?.schemaVersion !== 1 || !Array.isArray(manifest.documents) || manifest.documents.some((doc: any) => !doc || typeof doc.id !== 'string' || typeof doc.title !== 'string' || typeof doc.url !== 'string' || typeof doc.markdownUrl !== 'string' || !doc.variant || ['channel', 'version', 'language'].some(key => typeof doc.variant[key] !== 'string'))) throw new DocumentationError('internal_error', 'Invalid documents.json. Rebuild the documentation.');
  const matching = manifest.documents.filter((doc: any) => doc.id === id);
  if (!matching.length) throw new DocumentationError('unknown_page', `No document with ID ${id}; search the documentation first.`);
  const selected = matching.filter((doc: any) => ['channel', 'version', 'language'].every(key => !options[key as keyof SearchOptions] || doc.variant[key] === options[key as keyof SearchOptions]));
  if (selected.length !== 1) throw new DocumentationError('invalid_input', selected.length ? 'Page has multiple publications; select channel, version, and language.' : 'Page does not match the selected publication.');
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
  const metadata = { status: 'ok' as const, id: doc.id as string, title: doc.title as string, url: doc.url as string, markdownUrl: doc.markdownUrl as string, publication: doc.variant as { channel: string; version: string; language: string } };
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
