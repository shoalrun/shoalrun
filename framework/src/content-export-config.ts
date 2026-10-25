import { isConfigMapping } from './compiler-config.js';
import { validateContentFilter } from './content-filter.js';
import { validateReaderFilters, type ReaderSelection } from './reader-filters.js';
import type { Variant } from './content.js';

export type ExportFormat = 'markdown' | 'html';
export type ExportTarget = { formats: ExportFormat[]; documents?: string[]; publication?: Variant; contentFilter?: ReaderSelection; publicBase: string; assetRoots: string[]; apiReview: Record<string, string>; notices: string[] };
export function exportPublicBase(value: unknown): string {
  if (typeof value !== 'string' || !/^\/(?:[A-Za-z0-9_~.-]+\/)*$/.test(value) || value.split('/').some(part => part === '.' || part === '..')) {
    throw new Error('Export publicBase must be a root-relative path with a trailing slash, such as /help/');
  }
  return value;
}
export function validateExportTarget(value: unknown, readerFilters?: unknown): ExportTarget {
  if (!isConfigMapping(value) || Object.keys(value).some(key => !['formats', 'documents', 'publication', 'contentFilter', 'publicBase', 'assetRoots', 'apiReview', 'notices'].includes(key))) throw new Error('Export target accepts formats, documents, publication, contentFilter, publicBase, and assetRoots');
  const formats = value.formats ?? ['markdown', 'html'];
  if (!Array.isArray(formats) || !formats.length || formats.some(format => !['markdown', 'html'].includes(format)) || new Set(formats).size !== formats.length) throw new Error('Export formats must be a nonempty unique list of markdown and/or html');
  const strings = (raw: unknown, field: string): string[] | undefined => {
    if (raw === undefined) return undefined;
    if (!Array.isArray(raw) || !raw.length || raw.some(item => typeof item !== 'string' || !item.trim()) || new Set(raw).size !== raw.length) throw new Error(`Export ${field} must be a nonempty unique list of strings`);
    return raw;
  };
  let publication: Variant | undefined;
  if (value.publication !== undefined) {
    if (!isConfigMapping(value.publication) || Object.keys(value.publication).some(key => !['channel', 'version', 'language'].includes(key)) || ['channel', 'version', 'language'].some(key => typeof value.publication === 'object' && (typeof (value.publication as Record<string, unknown>)[key] !== 'string' || !(value.publication as Record<string, string>)[key].trim()))) throw new Error('Export publication needs channel, version, and language');
    publication = value.publication as Variant;
  }
  if (value.apiReview !== undefined && (!isConfigMapping(value.apiReview) || Object.values(value.apiReview).some(digest => typeof digest !== 'string' || !/^[a-f0-9]{64}$/.test(digest)))) throw new Error('Export apiReview must map API IDs to lowercase SHA-256 digests');
  return { formats: [...formats].sort() as ExportFormat[], ...(value.documents !== undefined ? { documents: strings(value.documents, 'documents') } : {}), ...(publication ? { publication } : {}),
    ...(value.contentFilter !== undefined ? { contentFilter: validateContentFilter(value.contentFilter, validateReaderFilters(readerFilters)) } : {}),
    publicBase: exportPublicBase(value.publicBase ?? '/'), assetRoots: strings(value.assetRoots, 'assetRoots') ?? [], apiReview: (value.apiReview ?? {}) as Record<string, string>, notices: strings(value.notices, 'notices') ?? [] };
}
export function validateExports(value: unknown, readerFilters?: unknown): void {
  if (value === undefined) return;
  if (!isConfigMapping(value) || !Object.keys(value).length) throw new Error('exports must be a nonempty mapping of named targets');
  for (const [name, target] of Object.entries(value)) {
    if (!/^[a-z][a-z0-9-]*$/.test(name)) throw new Error(`Invalid export target name ${name}`);
    try { validateExportTarget(target, readerFilters); } catch (error) { throw new Error(`exports.${name}: ${(error as Error).message}`); }
  }
}
