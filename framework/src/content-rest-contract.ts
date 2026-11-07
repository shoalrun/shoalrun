import { contentRefKey } from './content-delivery-contract.js';
import type { ContentPublication, ContentRef, ContentResource } from './content-delivery-contract.js';

/** Public identity only: independent of publication, revision, and export filenames. */
export function contentResourceKey(ref: ContentRef): string {
  const bytes = new TextEncoder().encode(contentRefKey(ref));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return 'k_' + btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

/** One resource inventory entry with its REST lookup key. */
export type ContentRestEntry = { key: string; resource: ContentResource };
/** Revision-scoped inventory envelope returned by the content REST service. */
export type ContentRestList = {
  schemaVersion: 1 | 2; revision: string; publication: ContentPublication; resources: ContentRestEntry[];
};
/** Revision-scoped metadata envelope for a single content resource. */
export type ContentRestResource = {
  schemaVersion: 1 | 2; revision: string; publication: ContentPublication; key: string; resource: ContentResource;
};
/** Error categories used by the content REST protocol. */
export type ContentRestErrorCode = 'invalid_request' | 'not_found' | 'unsupported_format' | 'stale_revision' | 'method_not_allowed' | 'internal_error';
/** JSON error envelope returned by the content REST service. */
export type ContentRestError = { error: { code: ContentRestErrorCode; message: string } };
