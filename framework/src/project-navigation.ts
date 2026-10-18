import { createHash } from 'node:crypto';
import type { Document, NavigationNode, Variant } from './content-source.js';
import { markdownRoute } from './content-source.js';

export type OperationNavEntry = { id: string; apiId: string; documentId: string; title: string; tag: string; search: string };
type NavSpec = { id: string; label?: string; tab?: boolean; landing?: string; doc?: string; operation?: string; generated?: 'tags' | 'remaining'; api?: string; tag?: string; search?: string; items?: NavSpec[] };
const variantKey = (variant: Variant) => `${variant.channel}|${variant.version}|${variant.language}`;
const docKey = (id: string, variant: Variant) => `${id}|${variantKey(variant)}`;
const tagId = (placeholder: string, tag: string) => `${placeholder}-tag-${createHash('sha256').update(tag).digest('hex').slice(0, 8)}`;

export function validateProjectNavigation(layout: any, docs: Map<string, Document>, operations: Map<string, { apiId: string; reference: string }>, apiIds: Set<string>): NavSpec[] {
  if (!Array.isArray(layout)) throw new Error('navigation must be a list');
  const ids = new Set<string>();
  const tagGenerators = new Set<string>();
  const availableDocIds = new Set([...docs.values()].map(doc => doc.frontmatter.id));
  const walk = (nodes: any[], inheritedApi?: string, inheritedTag?: string, depth = 0): void => {
    for (const node of nodes) {
      if (!node || typeof node !== 'object' || Array.isArray(node) || typeof node.id !== 'string' || !node.id) throw new Error('Navigation nodes need stable IDs');
      if (ids.has(node.id)) throw new Error(`Duplicate navigation ID ${node.id}`);
      ids.add(node.id);
      for (const key of Object.keys(node)) if (!['id', 'label', 'tab', 'landing', 'doc', 'operation', 'generated', 'api', 'tag', 'search', 'items'].includes(key)) throw new Error(`Unknown navigation field ${key}: ${node.id}`);
      if (node.tab !== undefined && node.tab !== true) throw new Error(`Navigation tab must be true when set: ${node.id}`);
      if (node.tab) {
        if (depth || !Array.isArray(node.items) || !/^[a-z][a-z0-9-]*$/.test(node.id)) throw new Error(`Navigation tabs need a top-level group and a lowercase hyphenated ID: ${node.id}`);
        if (typeof node.landing !== 'string' || !availableDocIds.has(node.landing)) throw new Error(`Navigation tab needs a valid landing document ID: ${node.id}`);
      } else if (node.landing !== undefined) throw new Error(`Navigation landing requires tab: true: ${node.id}`);
      if (node.label !== undefined && typeof node.label !== 'string') throw new Error(`Navigation label must be text: ${node.id}`);
      if (node.search !== undefined && typeof node.search !== 'string') throw new Error(`Navigation search terms must be text: ${node.id}`);
      if (node.doc && node.items) throw new Error(`Navigation node cannot be both a page and a group: ${node.id}`);
      const kinds = [node.doc !== undefined, node.operation !== undefined, node.generated !== undefined, node.items !== undefined].filter(Boolean).length;
      if (kinds !== 1) throw new Error(`Navigation node needs exactly one of doc, operation, generated, or items: ${node.id}`);
      if (node.api !== undefined && (typeof node.api !== 'string' || !apiIds.has(node.api))) throw new Error(`Unknown navigation API ${node.api}: ${node.id}`);
      const api = node.api ?? inheritedApi;
      if (node.doc !== undefined) {
        if (typeof node.doc !== 'string' || !availableDocIds.has(node.doc)) throw new Error(`Navigation targets missing document ${node.doc}`);
        if (node.tag || node.api) throw new Error(`Page navigation node cannot set api or tag: ${node.id}`);
      } else if (node.operation !== undefined) {
        const known = operations.get(node.operation);
        if (!known) throw new Error(`Unknown stable operation ID ${node.operation}: ${node.id}`);
        if (api && api !== known.apiId) throw new Error(`Navigation operation ${node.operation} belongs to API ${known.apiId}`);
        if (node.tag) throw new Error(`Operation navigation node cannot set tag: ${node.id}`);
      } else if (node.generated !== undefined) {
        if (!['tags', 'remaining'].includes(node.generated)) throw new Error(`Unknown navigation generator ${node.generated}: ${node.id}`);
        if (!api) throw new Error(`Generated navigation needs an API: ${node.id}`);
        if (node.label || node.search || node.tag) throw new Error(`Generated navigation only accepts id, api, and generated: ${node.id}`);
        if (node.generated === 'remaining' && !inheritedTag) throw new Error(`generated: remaining needs a tag group: ${node.id}`);
        if (node.generated === 'tags') {
          if (inheritedTag) throw new Error(`generated: tags cannot be inside a tag group: ${node.id}`);
          if (tagGenerators.has(api)) throw new Error(`Duplicate generated: tags for API ${api}`);
          tagGenerators.add(api);
        }
      } else {
        if (typeof node.label !== 'string' || !node.label || !Array.isArray(node.items) || !node.items.length) throw new Error(`Navigation group needs label and nonempty items: ${node.id}`);
        if (node.search) throw new Error(`Navigation group cannot set search: ${node.id}`);
        if (node.tag !== undefined && (typeof node.tag !== 'string' || !node.tag || !api)) throw new Error(`Navigation tag group needs an API and tag: ${node.id}`);
        walk(node.items, api, node.tag ?? inheritedTag, depth + 1);
      }
    }
  };
  walk(layout);
  return layout as NavSpec[];
}

export function resolveProjectNavigation(layout: NavSpec[], variant: Variant, docs: Map<string, Document>, entries: OperationNavEntry[], tagOrder: Map<string, string[]>): NavigationNode[] {
  const byId = new Map(entries.map(entry => [entry.id, entry]));
  if (byId.size !== entries.length) throw new Error(`Duplicate operation reference in ${variantKey(variant)}`);
  const byDocument = new Map(entries.map(entry => [entry.documentId, entry]));
  const reserved = new Set<string>();
  const reserve = (nodes: NavSpec[]): void => {
    for (const node of nodes) {
      const entry = node.operation ? byId.get(node.operation) : node.doc ? byDocument.get(node.doc) : undefined;
      if (entry) {
        if (reserved.has(entry.id)) throw new Error(`Operation placed more than once in navigation: ${entry.id}`);
        reserved.add(entry.id);
      }
      if (node.items) reserve(node.items);
    }
  };
  reserve(layout);
  const placed = new Set<string>();
  const leaf = (entry: OperationNavEntry, id: string, label?: string, search?: string): NavigationNode => {
    if (placed.has(entry.id)) throw new Error(`Operation placed more than once in navigation: ${entry.id}`);
    placed.add(entry.id);
    const doc = docs.get(docKey(entry.documentId, variant));
    if (!doc) throw new Error(`Missing reference document variant for ${entry.id}`);
    return { id, label: label ?? entry.title, route: doc.route, search: [entry.search, search].filter(Boolean).join(' '), subjectLifecycle: doc.frontmatter.subjectLifecycle, method: doc.endpoint?.method, webhook: doc.endpoint?.webhook, readerFilters: doc.readerFilters };
  };
  const render = (nodes: NavSpec[], inheritedApi?: string, inheritedTag?: string): NavigationNode[] => nodes.flatMap(node => {
    const api = node.api ?? inheritedApi;
    if (node.doc) {
      const doc = docs.get(docKey(node.doc, variant));
      if (!doc) return [];
      const entry = byDocument.get(node.doc);
      return entry ? [leaf(entry, node.id, node.label ?? doc.frontmatter.title, node.search)] : [{ id: node.id, label: node.label ?? doc.frontmatter.title, route: doc.route, search: node.search, subjectLifecycle: doc.frontmatter.subjectLifecycle, readerFilters: doc.readerFilters }];
    }
    if (node.operation) {
      const entry = byId.get(node.operation);
      return entry ? [leaf(entry, node.id, node.label, node.search)] : [];
    }
    if (node.generated) {
      const candidates = entries.filter(entry => entry.apiId === api && !reserved.has(entry.id) && !placed.has(entry.id));
      if (node.generated === 'remaining') return candidates.filter(entry => entry.tag === inheritedTag).map(entry => leaf(entry, `${node.id}-${entry.id}`));
      const tags = [...new Set([...(tagOrder.get(api!) ?? []), ...candidates.map(entry => entry.tag)])];
      return tags.flatMap(tag => {
        const items = candidates.filter(entry => entry.tag === tag).map(entry => leaf(entry, `${node.id}-${entry.id}`));
        return items.length ? [{ id: tagId(node.id, tag), label: tag, items }] : [];
      });
    }
    const items = render(node.items ?? [], api, node.tag ?? inheritedTag);
    if (!items.length) return [];
    if (node.tab) {
      const landing = docs.get(docKey(node.landing!, variant));
      if (!landing) throw new Error(`Navigation tab landing ${node.landing} is unavailable in ${variantKey(variant)}: ${node.id}`);
      if (!navigationPath(items, landing.route).length) throw new Error(`Navigation tab landing must belong to its items: ${node.id}`);
      return [{ id: node.id, label: node.label!, tab: true, route: landing.route, items }];
    }
    return [{ id: node.id, label: node.label!, items }];
  });
  const resolved = render(layout);
  // A direct link must select one tab, independent of browser state or tree order.
  const owners = new Map<string, string>();
  const assign = (nodes: NavigationNode[], owner: string) => {
    for (const node of nodes) {
      if (node.items) assign(node.items, owner);
      else if (node.route) {
        const previous = owners.get(node.route);
        if (previous !== undefined && previous !== owner) throw new Error(`Page belongs to multiple navigation sections: ${node.route}`);
        owners.set(node.route, owner);
      }
    }
  };
  for (const node of resolved) assign(node.tab ? node.items! : [node], node.tab ? node.id : '');
  return resolved;
}

export function navigationTab(nodes: NavigationNode[], route: string): NavigationNode | undefined {
  return nodes.find(node => node.tab && navigationPath(node.items ?? [], route).length > 0);
}

export function navigationTabRecord(node: NavigationNode, variant: Variant, basePath: string) {
  const suffix = createHash('sha256').update(variantKey(variant)).digest('hex').slice(0, 12);
  return { id: node.id, label: node.label, variant, url: node.route!, markdownUrl: markdownRoute(node.route!, basePath), indexUrl: `${basePath}/.well-known/shoalrun/navigation/${node.id}-${suffix}.txt` };
}

export function navigationPath(nodes: NavigationNode[], route: string): Array<{ label: string; url?: string }> {
  for (const node of nodes) {
    if (!node.tab && node.route === route) return [{ label: node.label, url: node.route }];
    const child = navigationPath(node.items ?? [], route);
    if (child.length) return [{ label: node.label, ...(node.route ? { url: node.route } : {}) }, ...child];
  }
  return [];
}
