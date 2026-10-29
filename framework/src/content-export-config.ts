import { isConfigMapping } from './compiler-config.js';
import { validateContentFilter } from './content-filter.js';
import { validateReaderFilters, type ReaderSelection } from './reader-filters.js';
import type { Variant } from './content.js';
import { validSectionId } from './section-identity.js';

export type ExportFormat = 'markdown' | 'html';
export type ExportResourceSelector =
  | { kind: 'page'; documentId: string }
  | { kind: 'section'; documentId: string; sectionId: string }
  | { kind: 'snippet'; id: string; snippetId: string; title: string; summary: string; values?: Record<string, string | number | boolean> };
export type ExportTarget = { formats: ExportFormat[]; documents?: string[]; resources?: ExportResourceSelector[]; publication?: Variant; contentFilter?: ReaderSelection; publicBase: string; assetRoots: string[]; apiReview: Record<string, string>; notices: string[] };

const nonempty = (value: unknown): value is string => typeof value === 'string' && value.trim() === value && value.length > 0;
const snippetId = (value: unknown): value is string => nonempty(value) && /^[A-Za-z_][A-Za-z0-9_.-]*$/.test(value)
  && value.split('.').every(part => /^[A-Za-z_][A-Za-z0-9_-]*$/.test(part) && !['__proto__', 'prototype', 'constructor'].includes(part));
export function validateExportResources(value: unknown): ExportResourceSelector[] {
  if (!Array.isArray(value) || !value.length) throw new Error('Export resources must be a nonempty list');
  const seen = new Set<string>();
  return value.map((item, index) => {
    const fail = (message: string): never => { throw new Error(`Export resources[${index}]: ${message}`); };
    if (!isConfigMapping(item)) fail('resource must be a mapping');
    const resource = item as Record<string, unknown>;
    const keys = resource.kind === 'page' ? ['kind', 'documentId'] : resource.kind === 'section' ? ['kind', 'documentId', 'sectionId'] : resource.kind === 'snippet' ? ['kind', 'id', 'snippetId', 'title', 'summary', 'values'] : undefined;
    if (!keys || Object.keys(resource).some(key => !keys.includes(key))) fail('expected a page, section, or snippet selector with only its supported fields');
    let identity: string;
    if (resource.kind === 'snippet') {
      if (!snippetId(resource.id) || !snippetId(resource.snippetId)) fail('snippet id and snippetId must be valid stable snippet identifiers');
      if (!nonempty(resource.title) || !nonempty(resource.summary)) fail('snippet needs a nonempty title and summary');
      if (resource.values !== undefined) {
        if (!isConfigMapping(resource.values) || Object.entries(resource.values).some(([key, value]) =>
          !/^[A-Za-z_][A-Za-z0-9_-]*$/.test(key) || ['__proto__', 'prototype', 'constructor'].includes(key)
          || !['string', 'number', 'boolean'].includes(typeof value) || typeof value === 'number' && !Number.isFinite(value))) fail('snippet values must map safe variable names to finite scalar literals');
      }
      identity = JSON.stringify(['snippet', resource.id]);
    } else {
      if (!nonempty(resource.documentId)) fail('documentId must be a nonempty trimmed string');
      if (resource.kind === 'section' && !validSectionId(resource.sectionId)) fail('sectionId must be a stable lowercase anchor identifier');
      identity = JSON.stringify([resource.kind, resource.documentId, ...(resource.kind === 'section' ? [resource.sectionId] : [])]);
    }
    if (seen.has(identity)) fail('duplicate resource reference');
    seen.add(identity);
    return { ...resource, ...(resource.values !== undefined ? { values: { ...(resource.values as Record<string, string | number | boolean>) } } : {}) } as ExportResourceSelector;
  });
}
export function exportPublicBase(value: unknown): string {
  if (typeof value !== 'string' || !/^\/(?:[A-Za-z0-9_~.-]+\/)*$/.test(value) || value.split('/').some(part => part === '.' || part === '..')) {
    throw new Error('Export publicBase must be a root-relative path with a trailing slash, such as /help/');
  }
  return value;
}
export function validateExportTarget(value: unknown, readerFilters?: unknown): ExportTarget {
  if (!isConfigMapping(value) || Object.keys(value).some(key => !['formats', 'documents', 'resources', 'publication', 'contentFilter', 'publicBase', 'assetRoots', 'apiReview', 'notices'].includes(key))) throw new Error('Export target accepts formats, documents or resources, publication, contentFilter, publicBase, assetRoots, apiReview, and notices');
  if (value.documents !== undefined && value.resources !== undefined) throw new Error('Export documents and resources are mutually exclusive');
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
  return { formats: [...formats].sort() as ExportFormat[], ...(value.documents !== undefined ? { documents: strings(value.documents, 'documents') } : {}), ...(value.resources !== undefined ? { resources: validateExportResources(value.resources) } : {}), ...(publication ? { publication } : {}),
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
