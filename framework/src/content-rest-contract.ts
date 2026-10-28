import { contentRefKey } from './content-delivery-contract.js';
import type { ContentPublication, ContentRef, ContentResource } from './content-delivery-contract.js';

/** Public identity only: independent of publication, revision, and export filenames. */
export function contentResourceKey(ref: ContentRef): string {
  const bytes = new TextEncoder().encode(contentRefKey(ref));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return 'k_' + btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

export type ContentRestEntry = { key: string; resource: ContentResource };
export type ContentRestList = {
  schemaVersion: 1; revision: string; publication: ContentPublication; resources: ContentRestEntry[];
};
export type ContentRestResource = {
  schemaVersion: 1; revision: string; publication: ContentPublication; key: string; resource: ContentResource;
};
export type ContentRestErrorCode = 'invalid_request' | 'not_found' | 'unsupported_format' | 'stale_revision' | 'method_not_allowed' | 'internal_error';
export type ContentRestError = { error: { code: ContentRestErrorCode; message: string } };
