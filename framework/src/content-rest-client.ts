import { ContentDeliveryError, contentRefKey } from './content-delivery-contract.js';
import type { ContentSnapshot, ContentPublication, ContentResource, ContentRef, ContentResult, ContentErrorCode } from './content-delivery-contract.js';
import type { ContentDeliveryLimits } from './content-delivery.js';
import { contentResourceKey } from './content-rest-contract.js';
import { validContentPublication, validContentRef, validateContentResources, safeContentPath } from './content-delivery-validation.js';
import { freeze, sha256, readBounded } from './content-delivery-transport.js';

export type RestContentSourceOptions = { baseUrl: string | URL; publication: ContentPublication; revision?: string; fetch?: typeof globalThis.fetch; signal?: AbortSignal; limits?: ContentDeliveryLimits };
const digestPattern = /^[a-f0-9]{64}$/;
const record = (value: any): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value);
const exactKeys = (value: any, keys: string[]) => record(value) && Object.keys(value).length === keys.length && Object.keys(value).every(key => keys.includes(key));
const samePublication = (left: ContentPublication, right: ContentPublication) => left.channel === right.channel && left.version === right.version && left.language === right.language;
const invalid = (message: string): never => { throw new ContentDeliveryError('invalid_manifest', message); };
/** Preloads a REST inventory and pins all subsequent reads to that revision. */
export async function openRestContentSource(options: RestContentSourceOptions): Promise<ContentSnapshot> {
  let baseUrl: URL;
  try { baseUrl = new URL(options.baseUrl, typeof location === 'undefined' ? undefined : location.href); } catch { return invalid('REST base URL must be a valid HTTP(S) URL.'); }
  if (!['http:', 'https:'].includes(baseUrl.protocol) || baseUrl.username || baseUrl.password || baseUrl.search || baseUrl.hash || !/^\/(?:[A-Za-z0-9_-]+\/?)*$/.test(baseUrl.pathname)) invalid('Invalid REST base URL.');
  if (typeof location !== 'undefined' && baseUrl.origin !== location.origin) invalid('Browser content must be served from the application origin.');
  if (!validContentPublication(options.publication) || options.revision !== undefined && !digestPattern.test(options.revision)) invalid('Invalid REST publication or revision.');
  const publication = { ...options.publication };
  const requestedRevision = options.revision;
  const fetcher = options.fetch ?? globalThis.fetch;
  const manifestBytes = options.limits?.manifestBytes ?? 5_000_000;
  const resourceBytes = options.limits?.resourceBytes ?? 8_000_000;
  const maxResources = options.limits?.resources ?? 10_000;
  for (const limit of [manifestBytes, resourceBytes, maxResources]) if (!Number.isSafeInteger(limit) || limit <= 0) invalid('Limits must be positive safe integers.');
  const lifetime = new AbortController(); let disposed = false;
  const openSignal = options.signal ? AbortSignal.any([options.signal, lifetime.signal]) : lifetime.signal;
  const urlFor = (suffix: string, revision?: string) => {
    const url = new URL(baseUrl.href); url.pathname = baseUrl.pathname.replace(/\/$/, '') + '/resources' + suffix;
    for (const key of ['channel', 'version', 'language'] as const) url.searchParams.set(key, publication[key]);
    if (revision !== undefined) url.searchParams.set('revision', revision);
    return url;
  };
  async function request(url: URL, mediaType: string, limit: number, signal: AbortSignal): Promise<Uint8Array> {
    signal.throwIfAborted(); let response: Response;
    try { response = await fetcher(url.href, { signal, redirect: 'error', credentials: 'same-origin', cache: 'no-store', headers: { Accept: mediaType } }); }
    catch { signal.throwIfAborted(); throw new ContentDeliveryError('network_error', 'Cannot fetch REST content.'); }
    const reject = async (code: ContentErrorCode, message: string): Promise<never> => {
      // Cancelling releases the body without consuming an arbitrary host error.
      // A custom stream's cancellation promise must not delay the failure.
      void response.body?.cancel().catch(() => {});
      signal.throwIfAborted();
      throw new ContentDeliveryError(code, message);
    };
    if (response.redirected || response.url && response.url !== url.href) return reject('invalid_content', 'Redirected content is not accepted.');
    const actualType = response.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
    try {
      if (!response.ok) {
        const codes: Record<number, string> = { 400: 'invalid_request', 404: 'not_found', 406: 'unsupported_format', 409: 'stale_revision', 405: 'method_not_allowed', 500: 'internal_error' };
        if (!(response.status in codes)) return reject('network_error', `Content request failed (${response.status}).`);
        if (actualType !== 'application/json') return reject('invalid_content', 'REST error must be JSON.');
        const bytes = await readBounded(response, Math.min(manifestBytes, 65_536), signal);
        let envelope: any;
        try { envelope = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); } catch { throw new ContentDeliveryError('invalid_content', 'Malformed REST error.'); }
        if (!exactKeys(envelope, ['error']) || !exactKeys(envelope.error, ['code', 'message']) || codes[response.status] !== envelope.error.code || typeof envelope.error.message !== 'string') throw new ContentDeliveryError('invalid_content', 'Malformed REST error.');
        const code: ContentErrorCode = response.status === 404 ? 'not_found' : response.status === 406 ? 'unsupported_format' : response.status === 409 ? 'stale_revision' : 'network_error';
        throw new ContentDeliveryError(code, envelope.error.message);
      }
      if (actualType !== mediaType) return reject('invalid_content', 'Unexpected content type.');
      return await readBounded(response, limit, signal);
    } catch (error) { signal.throwIfAborted(); if (error instanceof ContentDeliveryError) throw error; throw new ContentDeliveryError('network_error', 'Content response was interrupted.'); }
  }
  let envelope: any;
  try { envelope = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(await request(urlFor('', requestedRevision), 'application/json', manifestBytes, openSignal))); }
  catch (error) { if (error instanceof ContentDeliveryError || openSignal.aborted) throw error; return invalid('REST inventory is not valid UTF-8 JSON.'); }
  if (!exactKeys(envelope, ['schemaVersion', 'revision', 'publication', 'resources']) || envelope.schemaVersion !== 1 || !digestPattern.test(envelope.revision ?? '') || !validContentPublication(envelope.publication) || !samePublication(envelope.publication, publication)) invalid('Invalid REST inventory identity.');
  if (requestedRevision !== undefined && requestedRevision !== envelope.revision) throw new ContentDeliveryError('stale_revision', 'REST inventory differs from the requested revision.');
  if (!Array.isArray(envelope.resources) || envelope.resources.length > maxResources) invalid('Invalid REST resource inventory.');
  const resources: ContentResource[] = [];
  const assets = new Set<string>();
  for (const item of envelope.resources) {
    if (!exactKeys(item, ['key', 'resource']) || !record(item.resource) || !validContentRef(item.resource.ref) || item.key !== contentResourceKey(item.resource.ref)) invalid('Invalid REST resource key.');
    if (!Array.isArray(item.resource.assets) || item.resource.assets.some((asset: unknown) => !safeContentPath(asset) || !asset.startsWith('assets/'))) invalid('Invalid REST resource assets.');
    item.resource.assets.forEach((asset: string) => assets.add(asset)); resources.push(item.resource as ContentResource);
  }
  validateContentResources(resources, publication, assets, rep => record(rep) && safeContentPath(rep.path) && Number.isSafeInteger(rep.bytes) && rep.bytes >= 0 && rep.bytes <= resourceBytes && digestPattern.test(rep.digest ?? ''));
  const revision: string = envelope.revision;
  freeze(resources); freeze(publication);
  const byRef = new Map(resources.map(resource => [contentRefKey(resource.ref), resource]));
  openSignal.throwIfAborted();
  const active = () => { if (disposed) throw new ContentDeliveryError('disposed', 'Content snapshot has been disposed.'); };
  return Object.freeze({ revision, publication,
    list() { active(); return resources; },
    async get(ref: ContentRef, getOptions: { format: 'html' | 'markdown'; signal?: AbortSignal }): Promise<ContentResult> {
      active(); if (!validContentRef(ref)) throw new ContentDeliveryError('not_found', 'Invalid content reference.');
      const resource = byRef.get(contentRefKey(ref)); if (!resource) throw new ContentDeliveryError('not_found', 'No matching content in this publication.');
      const format = getOptions?.format;
      if (!['html', 'markdown'].includes(format) || !resource.representations[format]) throw new ContentDeliveryError('unsupported_format', 'The requested representation is unavailable.');
      const representation = resource.representations[format]!;
      const signal = getOptions.signal ? AbortSignal.any([lifetime.signal, getOptions.signal]) : lifetime.signal;
      const bytes = await request(urlFor('/' + contentResourceKey(resource.ref) + '/representations/' + format, revision), representation.mediaType, resourceBytes, signal);
      if (bytes.byteLength !== representation.bytes || await sha256(bytes) !== representation.digest) throw new ContentDeliveryError('stale_revision', 'Representation differs from the opened revision.');
      signal.throwIfAborted(); active();
      let content: string; try { content = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { throw new ContentDeliveryError('invalid_content', 'Content is not valid UTF-8.'); }
      return Object.freeze({ resource, representation, format, content, revision });
    },
    dispose() { if (!disposed) { disposed = true; lifetime.abort(new ContentDeliveryError('disposed', 'Content snapshot has been disposed.')); } },
  });
}
