import { ContentDeliveryError, contentRefKey } from './content-delivery-contract.js';
import type { ContentSnapshot, ContentResource, ContentPublication, ContentFormat } from './content-delivery-contract.js';
import { contentResourceKey } from './content-rest-contract.js';

export type ContentRestHandlerOptions = { sources: readonly ContentSnapshot[]; basePath?: string };
const publicationKey = (publication: Readonly<ContentPublication>) => JSON.stringify([publication.channel, publication.version, publication.language]);
const digest = async (bytes: Uint8Array) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes as BufferSource))].map(value => value.toString(16).padStart(2, '0')).join('');
const encoder = new TextEncoder();
const validPublication = (value: Readonly<ContentPublication>) => value && Object.keys(value).sort().join(',') === 'channel,language,version' && Object.values(value).every(part => typeof part === 'string' && part.length > 0 && part.length <= 2048);
const canonical = (value: any): any => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const same = (left: unknown, right: unknown) => JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));

/** Serve already-approved, pinned snapshots. The caller retains source ownership. */
export function createContentRestHandler(options: ContentRestHandlerOptions): (request: Request) => Promise<Response> {
  const basePath = options.basePath ?? '/content/v1';
  if (!/^\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+$/.test(basePath)) throw new Error('Content REST basePath must be an absolute path without a trailing slash.');
  const publications = new Map<string, { source: ContentSnapshot; revision: string; publication: ContentPublication; resources: Array<{ key: string; resource: ContentResource }> }>();
  for (const source of options.sources) {
    if (!/^[a-f0-9]{64}$/.test(source.revision) || !validPublication(source.publication)) throw new Error('Content REST source requires a valid revision and publication.');
    const publication = structuredClone(source.publication);
    const key = publicationKey(publication);
    if (publications.has(key)) throw new Error('Content REST sources must have distinct publications.');
    const resources = source.list().map(resource => ({ key: contentResourceKey(resource.ref), resource: structuredClone(resource) }));
    if (resources.some(item => !validPublication(item.resource.publication) || publicationKey(item.resource.publication) !== key) || new Set(resources.map(item => item.key)).size !== resources.length) throw new Error('Content REST source contains inconsistent publication or duplicate references.');
    resources.sort((left, right) => left.key < right.key ? -1 : left.key > right.key ? 1 : 0);
    publications.set(key, { source, publication, revision: source.revision, resources });
  }
  return async request => {
    request.signal.throwIfAborted();
    const head = request.method === 'HEAD';
    const error = (status: number, code: string, message: string, headers: Record<string, string> = {}) => new Response(head ? null : JSON.stringify({ error: { code, message } }), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers } });
    if (!['GET', 'HEAD'].includes(request.method)) return error(405, 'method_not_allowed', 'Use GET or HEAD.', { Allow: 'GET, HEAD' });
    const url = new URL(request.url);
    const prefix = `${basePath}/resources`;
    if (url.pathname !== prefix && !url.pathname.startsWith(`${prefix}/`)) return error(404, 'not_found', 'Unknown content route.');
    const parts = url.pathname.slice(prefix.length).split('/').slice(1);
    if (parts.length !== 0 && parts.length !== 1 && !(parts.length === 3 && parts[1] === 'representations')) return error(404, 'not_found', 'Unknown content route.');
    const allowed = new Set(['channel', 'version', 'language', 'revision']);
    if ([...url.searchParams.keys()].some(key => !allowed.has(key) || url.searchParams.getAll(key).length !== 1)) return error(400, 'invalid_request', 'Unknown or repeated query parameter.');
    const publication = Object.fromEntries(['channel', 'version', 'language'].map(key => [key, url.searchParams.get(key)])) as ContentPublication;
    if (Object.values(publication).some(value => !value || value.length > 2048)) return error(400, 'invalid_request', 'channel, version, and language are required.');
    const revision = url.searchParams.get('revision');
    if (revision !== null && !/^[a-f0-9]{64}$/.test(revision) || parts.length > 0 && revision === null) return error(400, 'invalid_request', 'A valid revision is required for resource requests.');
    const selected = publications.get(publicationKey(publication));
    if (!selected) return error(404, 'not_found', 'Publication not found.');
    if (revision !== null && revision !== selected.revision) return error(409, 'stale_revision', 'The requested revision is not available.');
    const resource = parts.length ? selected.resources.find(item => item.key === parts[0]) : undefined;
    if (parts.length && !resource) return error(404, 'not_found', 'Resource not found.');
    try {
      let body: string;
      let mediaType = 'application/json';
      if (!parts.length) body = JSON.stringify({ schemaVersion: 1, revision: selected.revision, publication: selected.publication, resources: selected.resources });
      else if (parts.length === 1) body = JSON.stringify({ schemaVersion: 1, revision: selected.revision, publication: selected.publication, ...resource });
      else {
        const format = parts[2] as ContentFormat;
        if (!['html', 'markdown'].includes(format) || !resource!.resource.representations[format]) return error(406, 'unsupported_format', 'Representation not available.');
        const descriptor = resource!.resource.representations[format]!;
        const result = await selected.source.get(resource!.resource.ref, { format, signal: request.signal });
        request.signal.throwIfAborted();
        if (result.revision !== selected.revision) return error(409, 'stale_revision', 'The requested revision is no longer available.');
        if (typeof result.content !== 'string' || contentRefKey(result.resource.ref) !== contentRefKey(resource!.resource.ref) || result.format !== format || !same(result.resource, resource!.resource) || !same(result.representation, descriptor)) return error(500, 'internal_error', 'Content source returned inconsistent metadata.');
        const bytes = encoder.encode(result.content);
        if (bytes.byteLength !== descriptor.bytes || await digest(bytes) !== descriptor.digest) return error(409, 'stale_revision', 'The requested revision bytes are no longer available.');
        body = result.content;
        mediaType = descriptor.mediaType;
      }
      const bytes = encoder.encode(body);
      const etag = `"sha256-${await digest(bytes)}"`;
      request.signal.throwIfAborted();
      const headers = { 'Content-Type': `${mediaType}; charset=utf-8`, 'Content-Length': String(bytes.byteLength), ETag: etag, 'Cache-Control': revision === null ? 'no-cache' : 'public, max-age=31536000, immutable' };
      const condition = request.headers.get('if-none-match');
      const matches = condition?.trim() === '*' || condition?.split(',').some(value => value.trim().replace(/^W\//, '') === etag);
      if (matches) return new Response(null, { status: 304, headers });
      return new Response(head ? null : body, { status: 200, headers });
    } catch (cause) {
      request.signal.throwIfAborted();
      if (cause instanceof ContentDeliveryError && ['stale_revision', 'not_found'].includes(cause.code)) return error(409, 'stale_revision', 'The requested revision is no longer available.');
      return error(500, 'internal_error', 'Content source could not serve the request.');
    }
  };
}
