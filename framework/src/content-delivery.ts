import { ContentDeliveryError, contentRefKey } from './content-delivery-contract.js';
import type { ContentManifest, ContentRef, ContentSnapshot, ContentResult, ContentErrorCode } from './content-delivery-contract.js';
export * from './content-delivery-contract.js';
export * from './content-rest-contract.js';
import { validateContentManifest, validContentRef } from './content-delivery-validation.js';
export { validateContentManifest } from './content-delivery-validation.js';
import { freeze, sha256, readBounded } from './content-delivery-transport.js';
const invalid = (message: string): never => { throw new ContentDeliveryError('invalid_manifest', message); };
export { mountContent } from './content-mount.js';
export type { ContentMount } from './content-mount.js';

export type ContentDeliveryLimits = { manifestBytes?: number; resourceBytes?: number; resources?: number };
export type ManifestContentSourceOptions = { manifestUrl: string | URL; fetch?: typeof globalThis.fetch; signal?: AbortSignal; limits?: ContentDeliveryLimits };
/** Opens one immutable manifest revision. The caller owns trust in the build/host. */
export async function openManifestContentSource(options: ManifestContentSourceOptions): Promise<ContentSnapshot> {
  const fetcher = options.fetch ?? globalThis.fetch;
  let manifestUrl: URL;
  try { manifestUrl = new URL(options.manifestUrl, typeof location === 'undefined' ? undefined : location.href); } catch { throw new ContentDeliveryError('invalid_manifest', 'Manifest URL must be a valid HTTP(S) URL.'); }
  if (!['http:', 'https:'].includes(manifestUrl.protocol) || manifestUrl.username || manifestUrl.password || manifestUrl.hash || manifestUrl.search) invalid('Manifest URL must be an HTTP(S) URL without credentials, query, or fragment.');
  if (typeof location !== 'undefined' && manifestUrl.origin !== location.origin) invalid('Browser content must be served from the application origin.');
  const manifestBytes = options.limits?.manifestBytes ?? 5_000_000;
  const resourceBytes = options.limits?.resourceBytes ?? 8_000_000;
  const resources = options.limits?.resources ?? 10_000;
  for (const limit of [manifestBytes, resourceBytes, resources]) if (!Number.isSafeInteger(limit) || limit <= 0) invalid('Limits must be positive safe integers.');
  const lifetime = new AbortController(); let disposed = false;
  const openSignal = options.signal ? AbortSignal.any([options.signal, lifetime.signal]) : lifetime.signal;
  async function request(url: URL, mediaType: string, limit: number, signal: AbortSignal, revision = false): Promise<Uint8Array> {
    signal.throwIfAborted(); let response: Response;
    try { response = await fetcher(url.href, { signal, redirect: 'error', credentials: 'same-origin', cache: 'no-store', headers: { Accept: mediaType } }); }
    catch (error) { signal.throwIfAborted(); throw new ContentDeliveryError('network_error', 'Cannot fetch content.'); }
    const rejectResponse = async (code: ContentErrorCode, message: string): Promise<never> => { await response.body?.cancel().catch(() => {}); throw new ContentDeliveryError(code, message); };
    if (response.status === 404) return rejectResponse(revision ? 'stale_revision' : 'not_found', 'Content is unavailable.');
    if (!response.ok) return rejectResponse('network_error', `Content request failed (${response.status}).`);
    if (response.redirected || response.url && response.url !== url.href) return rejectResponse('invalid_content', 'Redirected content is not accepted.');
    if (response.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase() !== mediaType) return rejectResponse('invalid_content', 'Unexpected content type.');
    try { return await readBounded(response, limit, signal); }
    catch (error) { signal.throwIfAborted(); if (error instanceof ContentDeliveryError) throw error; throw new ContentDeliveryError('network_error', 'Content response was interrupted.'); }
  }
  let manifest: ContentManifest;
  try { manifest = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(await request(manifestUrl, 'application/json', manifestBytes, openSignal))); }
  catch (error) { if (error instanceof ContentDeliveryError || openSignal.aborted) throw error; invalid('Manifest is not valid UTF-8 JSON.'); }
  validateContentManifest(manifest!, resources, resourceBytes);
  const { digest, ...body } = manifest!;
  if (await sha256(new TextEncoder().encode(JSON.stringify(body))) !== digest) invalid('Manifest digest does not match its contents.');
  openSignal.throwIfAborted();
  const mount = new URL(manifest!.publicBase, manifestUrl.origin);
  if (!manifestUrl.pathname.startsWith(mount.pathname)) invalid('Manifest is outside its declared content mount.');
  freeze(manifest!);
  const byRef = new Map(manifest!.resources.map(resource => [contentRefKey(resource.ref), resource]));
  const active = () => { if (disposed) throw new ContentDeliveryError('disposed', 'Content snapshot has been disposed.'); };
  return Object.freeze({
    revision: manifest!.digest, publication: manifest!.publication,
    list() { active(); return manifest!.resources; },
    async get(ref: ContentRef, getOptions: { format: 'html' | 'markdown'; signal?: AbortSignal }): Promise<ContentResult> {
      active(); if (!validContentRef(ref)) throw new ContentDeliveryError('not_found', 'Invalid content reference.');
      const resource = byRef.get(contentRefKey(ref)); if (!resource) throw new ContentDeliveryError('not_found', 'No matching content in this publication.');
      const format = getOptions?.format;
      if (!['html', 'markdown'].includes(format)) throw new ContentDeliveryError('unsupported_format', 'The requested representation is unavailable.');
      const representation = resource.representations[format];
      if (!representation) throw new ContentDeliveryError('unsupported_format', 'The requested representation is unavailable.');
      const signal = getOptions.signal ? AbortSignal.any([lifetime.signal, getOptions.signal]) : lifetime.signal;
      const bytes = await request(new URL(representation.path, mount), representation.mediaType, resourceBytes, signal, true);
      if (bytes.byteLength !== representation.bytes || await sha256(bytes) !== representation.digest) throw new ContentDeliveryError('stale_revision', 'Representation differs from the opened revision.');
      signal.throwIfAborted(); active();
      let content: string; try { content = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { throw new ContentDeliveryError('invalid_content', 'Content is not valid UTF-8.'); }
      return Object.freeze({ resource, representation, format, content, revision: manifest!.digest });
    },
    dispose() { if (!disposed) { disposed = true; lifetime.abort(new ContentDeliveryError('disposed', 'Content snapshot has been disposed.')); } },
  });
}

export { openRestContentSource } from './content-rest-client.js';
export type { RestContentSourceOptions } from './content-rest-client.js';
