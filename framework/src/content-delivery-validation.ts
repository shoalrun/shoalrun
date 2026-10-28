import { ContentDeliveryError, contentRefKey } from './content-delivery-contract.js';
import type { ContentManifest, ContentRef } from './content-delivery-contract.js';
const object = (value: any): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value);
const keys = (value: any, allowed: string[]) => object(value) && Object.keys(value).every(key => allowed.includes(key));
const nonempty = (value: any): value is string => typeof value === 'string' && value.length > 0 && value.length <= 2048;
const digestPattern = /^[a-f0-9]{64}$/;
const pathPattern = /^(?:NOTICES\.txt|(?:content|assets)\/[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*)$/;
export const safeContentPath = (value: any): value is string => typeof value === 'string' && pathPattern.test(value) && value.split('/').every(part => part !== '.' && part !== '..');
const invalid = (message: string): never => { throw new ContentDeliveryError('invalid_manifest', message); };
export const validContentPublication = (value: any) => object(value) && Object.keys(value).length === 3 && ['channel', 'version', 'language'].every(key => nonempty(value[key]));
const samePublication = (left: any, right: any) => ['channel', 'version', 'language'].every(key => left[key] === right[key]);
export function validContentRef(value: any): value is ContentRef {
  if (!object(value)) return false;
  if (value.kind === 'page') return Object.keys(value).length === 2 && nonempty(value.documentId);
  if (value.kind === 'section') return Object.keys(value).length === 3 && nonempty(value.documentId) && typeof value.sectionId === 'string' && /^[a-z0-9][a-z0-9-]{0,511}$/.test(value.sectionId);
  return value.kind === 'snippet' && Object.keys(value).length === 2 && nonempty(value.id);
}
function safeExternal(value: any, image = false): boolean {
  try { const url = new URL(value); return typeof value === 'string' && !url.username && !url.password && (image ? ['http:', 'https:'] : ['http:', 'https:', 'mailto:', 'tel:']).includes(url.protocol); } catch { return false; }
}
export function validateContentManifest(value: any, maxResources = 10_000, maxResourceBytes = 8_000_000): asserts value is ContentManifest {
  if (!keys(value, ['schemaVersion', 'kind', 'digest', 'publicBase', 'publication', 'review', 'resources', 'assets', 'files', 'diagnostics']) || value.schemaVersion !== 1 || value.kind !== 'shoalrun-content-export' || !digestPattern.test(value.digest ?? '')) invalid('Unsupported content manifest.');
  if (typeof value.publicBase !== 'string' || !/^\/(?:[A-Za-z0-9_~.-]+\/)*$/.test(value.publicBase) || value.publicBase.split('/').some((part: string) => part === '.' || part === '..')) invalid('Invalid content mount.');
  if (!validContentPublication(value.publication)) invalid('Invalid publication.');
  if (!keys(value.review, ['status', 'apis']) || value.review.status !== 'ok' || !Array.isArray(value.review.apis) || value.review.apis.some((api: any) => !keys(api, ['apiId', 'digest']) || !nonempty(api.apiId) || !digestPattern.test(api.digest ?? ''))) invalid('Content must have approved API review metadata.');
  if (!Array.isArray(value.resources) || !value.resources.length || value.resources.length > maxResources || !Array.isArray(value.files) || !Array.isArray(value.assets) || !Array.isArray(value.diagnostics)) invalid('Invalid manifest inventory.');
  const files = new Map<string, any>();
  const checkFile = (file: any) => object(file) && safeContentPath(file.path) && Number.isSafeInteger(file.bytes) && file.bytes >= 0 && file.bytes <= maxResourceBytes && digestPattern.test(file.digest ?? '');
  for (const file of value.files) { if (!keys(file, ['path', 'bytes', 'digest']) || !checkFile(file) || files.has(file.path)) invalid('Invalid or duplicate file.'); files.set(file.path, file); }
  const listed = (file: any) => checkFile(file) && files.has(file.path) && files.get(file.path).bytes === file.bytes && files.get(file.path).digest === file.digest;
  const assets = new Set<string>();
  for (const asset of value.assets) { if (!keys(asset, ['path', 'bytes', 'digest', 'mediaType']) || !listed(asset) || !asset.path.startsWith('assets/') || !nonempty(asset.mediaType) || assets.has(asset.path)) invalid('Invalid or duplicate asset.'); assets.add(asset.path); }
  validateContentResources(value.resources, value.publication, assets, listed, value.publicBase);
  if (value.diagnostics.some((item: any) => !keys(item, ['code', 'documentId', 'message']) || typeof item.code !== 'string' || item.documentId !== undefined && typeof item.documentId !== 'string' || typeof item.message !== 'string')) invalid('Invalid diagnostics.');
}

/** Shared metadata validation; transport supplies its file/asset inventory policy. */
export function validateContentResources(resources: any[], expectedPublication: unknown, assets: Set<string>, checkRepresentation: (value: any) => boolean, publicBase = '/'): void {
  const refs = new Set<string>();
  const links: any[] = [];
  for (const resource of resources) {
    if (!keys(resource, ['ref', 'publication', 'title', 'summary', 'type', 'canonicalUrl', 'source', 'representations', 'assets', 'externalDependencies']) || !validContentRef(resource.ref) || !validContentPublication(resource.publication) || !samePublication(resource.publication, expectedPublication) || typeof resource.title !== 'string' || typeof resource.summary !== 'string' || typeof resource.type !== 'string') invalid('Invalid resource metadata.');
    const key = contentRefKey(resource.ref); if (refs.has(key)) invalid('Duplicate content reference.'); refs.add(key);
    if (resource.canonicalUrl !== undefined && !safeExternal(resource.canonicalUrl, true)) invalid('Invalid canonical URL.');
    if (resource.source !== undefined && (!object(resource.source) || !Object.keys(resource.source).length || Object.keys(resource.source).some(key => !['documentId', 'snippetId', 'valuesDigest'].includes(key)) || Object.values(resource.source).some(value => !nonempty(value)))) invalid('Invalid resource source.');
    if (resource.source?.valuesDigest !== undefined && !digestPattern.test(resource.source.valuesDigest)) invalid('Invalid snippet values digest.');
    if (!Array.isArray(resource.assets) || new Set(resource.assets).size !== resource.assets.length || resource.assets.some((asset: any) => !assets.has(asset))) invalid('Unknown resource asset.');
    if (!Array.isArray(resource.externalDependencies) || resource.externalDependencies.some((dependency: any) => !keys(dependency, ['url', 'kind']) || dependency.kind !== 'image' || !safeExternal(dependency.url, true))) invalid('Invalid external dependency.');
    if (!object(resource.representations) || !Object.keys(resource.representations).length || Object.keys(resource.representations).some(format => !['html', 'markdown'].includes(format))) invalid('Invalid representations.');
    for (const [format, rep] of Object.entries(resource.representations) as Array<[string, any]>) {
      if (!keys(rep, ['path', 'bytes', 'digest', 'mediaType', 'anchors', 'links']) || !checkRepresentation(rep) || !rep.path.startsWith('content/') || rep.mediaType !== (format === 'html' ? 'text/html' : 'text/markdown') || !Array.isArray(rep.anchors) || !Array.isArray(rep.links)) invalid('Invalid representation file.');
      const ids = new Set<string>(); const exportedIds = new Set<string>(); const linkKeys = new Set<string>();
      for (const anchor of rep.anchors) { if (!keys(anchor, ['id', 'exportedId', 'title']) || !nonempty(anchor.id) || !nonempty(anchor.exportedId) || ids.has(anchor.id) || exportedIds.has(anchor.exportedId) || anchor.title !== undefined && typeof anchor.title !== 'string') invalid('Invalid representation anchor.'); ids.add(anchor.id); exportedIds.add(anchor.exportedId); }
      for (const link of rep.links) {
        if (!keys(link, ['key', 'kind', 'href', 'ref', 'fragment', 'query', 'asset']) || !nonempty(link.key) || linkKeys.has(link.key) || typeof link.href !== 'string' || !['resource', 'canonical', 'external', 'asset'].includes(link.kind)) invalid('Invalid representation link.');
        linkKeys.add(link.key);
        if (link.kind === 'resource' && !validContentRef(link.ref) || link.kind === 'asset' && !assets.has(link.asset) || ['canonical', 'external'].includes(link.kind) && !safeExternal(link.href)) invalid('Invalid link destination.');
        if (link.fragment !== undefined && typeof link.fragment !== 'string' || link.query !== undefined && typeof link.query !== 'string') invalid('Invalid link suffix.');
        if (['resource', 'asset'].includes(link.kind)) {
          const linkPath = link.href.split(/[?#]/, 1)[0];
          if (!link.href.startsWith('#') && !link.href.startsWith(publicBase) || /\\|%2e|%2f|%5c/i.test(linkPath)) invalid('Link leaves content mount.');
          let url: URL;
          try { url = new URL(link.href, 'https://content.invalid' + publicBase); } catch { return invalid('Invalid internal link URL.'); }
          if (url.origin !== 'https://content.invalid' || !url.pathname.startsWith(publicBase)) invalid('Link leaves content mount.');
        }
        links.push(link);
      }
    }
  }
  for (const link of links) if (link.kind === 'resource' && !refs.has(contentRefKey(link.ref))) invalid('Link references absent content.');
}
