import { ContentDeliveryError, contentRefKey } from './content-delivery-contract.js';
import type { ContentAnchor, ContentLink, ContentResult } from './content-delivery-contract.js';

export type ContentMount = { anchors: readonly ContentAnchor[]; links: readonly ContentLink[]; unmount(): void };
/** Mount trusted compiler output, not arbitrary HTML. This is not a sanitizer. */
export function mountContent(container: Element, result: ContentResult, options: { instanceId?: string; signal?: AbortSignal } = {}): ContentMount {
  options.signal?.throwIfAborted();
  if (result.format !== 'html') throw new ContentDeliveryError('unsupported_format', 'Mounting requires HTML content.');
  const instance = options.instanceId ?? `content-${globalThis.crypto.randomUUID()}`;
  if (!/^[A-Za-z][A-Za-z0-9_-]{0,127}$/.test(instance)) throw new ContentDeliveryError('invalid_content', 'Invalid mount instance ID.');
  const document = container.ownerDocument;
  const template = document.createElement('template'); template.innerHTML = result.content;
  const ids = new Map<string, string>();
  for (const element of template.content.querySelectorAll('[id]')) {
    const old = element.id; const next = `${instance}-${old}`;
    if (!old || ids.has(old)) throw new ContentDeliveryError('invalid_content', 'Duplicate or empty content ID.');
    const existing = document.getElementById(next);
    if (existing && (existing === container || !container.contains(existing))) throw new ContentDeliveryError('invalid_content', 'Mount instance ID is already in use.');
    ids.set(old, next); element.id = next;
  }
  const tokenAttributes = ['aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-owns', 'aria-flowto', 'headers'];
  const singleAttributes = ['aria-activedescendant', 'aria-details', 'aria-errormessage', 'for', 'list', 'form'];
  const rewrite = (id: string) => ids.get(id) ?? id;
  const links = result.representation.links.map(link => ({ ...link }));
  for (const element of template.content.querySelectorAll('*')) {
    for (const attribute of tokenAttributes) if (element.hasAttribute(attribute)) element.setAttribute(attribute, element.getAttribute(attribute)!.split(/\s+/).map(rewrite).join(' '));
    for (const attribute of singleAttributes) if (element.hasAttribute(attribute)) element.setAttribute(attribute, rewrite(element.getAttribute(attribute)!));
    const href = element.getAttribute('href');
    if (href?.startsWith('#')) {
      let id: string; try { id = decodeURIComponent(href.slice(1)); } catch { throw new ContentDeliveryError('invalid_content', 'Malformed content fragment.'); }
      if (ids.has(id)) element.setAttribute('href', '#' + ids.get(id));
    }
    const key = element.getAttribute('data-export-link');
    const link = key ? links.find(link => link.key === key) : undefined;
    if (link?.kind === 'resource' && link.ref && contentRefKey(link.ref) === contentRefKey(result.resource.ref) && link.fragment && !link.query) {
      const anchor = result.representation.anchors.find(anchor => anchor.id === link.fragment || anchor.exportedId === link.fragment);
      const id = anchor && ids.get(anchor.exportedId);
      if (id) { element.setAttribute('href', '#' + id); link.href = '#' + id; }
    }
  }
  const anchors = result.representation.anchors.map(anchor => {
    const exportedId = ids.get(anchor.exportedId);
    if (!exportedId) throw new ContentDeliveryError('invalid_content', 'Declared anchor is absent from HTML.');
    return Object.freeze({ ...anchor, exportedId });
  });
  options.signal?.throwIfAborted();
  const mounted = [...template.content.childNodes];
  container.replaceChildren(template.content);
  return Object.freeze({ anchors: Object.freeze(anchors), links: Object.freeze(links.map(link => Object.freeze(link))),
    unmount() { for (const node of mounted) if (node.parentNode === container) node.remove(); },
  });
}
