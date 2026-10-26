import { cardIcon, validateCardIcon } from './icons.js';
import type { Document, Variant } from './content.js';
import { surfaceText } from './surface-text.js';
import { heading, link, list, paragraph, text } from './content.js';
import { readerFilterAttribute } from './reader-filters.js';

export type Relationship = { id: string; from: string; to: string; type: 'next-step' | 'see-also' | 'prerequisite' | 'reference' | 'advanced' | 'not-confused-with'; reason: string; order?: number };
export type CardRequest = { component: 'DocCard' | 'DocCards' | 'DocCollection' | 'RelatedReading'; layout?: 'list' | 'cards'; doc?: string; docs?: string[]; relatedTo?: string; relation?: Relationship['type']; type?: string; tag?: string; operation?: string; audience?: string; orderBy?: 'title' | 'id' | 'date' | 'releaseVersion'; limit?: number; exclude?: string[]; pin?: string[]; empty?: string };
export type CardUse = { targets: string[]; queries: CardRequest[] };
const object = (value: unknown): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value);
const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const relationLabels = { prerequisite: 'Read first', 'next-step': 'Next steps', reference: 'Reference while working', advanced: 'Go deeper', 'see-also': 'Related topics', 'not-confused-with': 'Often confused with' };
const relationTypes = new Set(Object.keys(relationLabels));
const symmetric = (type: string) => type === 'see-also' || type === 'not-confused-with';
const sameVariant = (a: Variant, b: Variant) => a.channel === b.channel && a.version === b.version && a.language === b.language;

export function validateCardMetadata(value: unknown, file: string): void {
  if (value === undefined) return;
  if (!object(value)) throw new Error(`${file}: card must be a mapping`);
  for (const [key, field] of Object.entries(value)) {
    if (!['title', 'description', 'eyebrow', 'icon'].includes(key)) throw new Error(`${file}: unsupported card setting ${key}`);
    if (typeof field !== 'string' || !field.trim()) throw new Error(`${file}: card.${key} must be nonempty text`);
    if (key === 'icon') validateCardIcon(field, file);
  }
}

export function validateRelationships(value: unknown, knownIds: Set<string>): Relationship[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error('relationships must be a list');
  const ids = new Set<string>();
  const pairs = new Set<string>();
  for (const edge of value) {
    if (!object(edge)) throw new Error('Each relationship must be a mapping');
    for (const key of Object.keys(edge)) if (!['id', 'from', 'to', 'type', 'reason', 'order'].includes(key)) throw new Error(`Unknown relationship setting ${key}`);
    for (const key of ['id', 'from', 'to', 'type', 'reason']) if (typeof edge[key] !== 'string' || !edge[key].trim()) throw new Error(`Relationship needs ${key}`);
    if (!relationTypes.has(edge.type)) throw new Error(`Unsupported relationship type ${edge.type}`);
    if (ids.has(edge.id)) throw new Error(`Duplicate relationship ID ${edge.id}`);
    ids.add(edge.id);
    for (const id of [edge.from, edge.to]) if (!knownIds.has(id)) throw new Error(`Relationship ${edge.id} targets unknown document ${id}`);
    if (edge.from === edge.to) throw new Error(`Relationship ${edge.id} cannot link a document to itself`);
    if (edge.order !== undefined && (typeof edge.order !== 'number' || !Number.isFinite(edge.order))) throw new Error(`Relationship ${edge.id}.order must be a finite number`);
    const endpoints = symmetric(edge.type) ? [edge.from, edge.to].sort(compare) : [edge.from, edge.to];
    const key = JSON.stringify([edge.type, ...endpoints]);
    if (pairs.has(key)) throw new Error(`Duplicate relationship ${edge.from} ${edge.type} ${edge.to}`);
    pairs.add(key);
  }
  return value as Relationship[];
}

export function publicationRelationships(edges: Relationship[], registry: Map<string, Document>): Relationship[] {
  const visible = edges.filter(edge => registry.has(edge.from) && registry.has(edge.to));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string) => {
    if (visiting.has(id)) throw new Error(`Prerequisite cycle at document ${id}`);
    if (visited.has(id)) return;
    visiting.add(id);
    for (const edge of visible) if (edge.from === id && edge.type === 'prerequisite') visit(edge.to);
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of registry.keys()) visit(id);
  return visible.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || compare(a.id, b.id));
}

export function cardComponent(node: any, file: string): any {
  const fail = (message: string): never => { throw new Error(`${file}: <${node.name}> ${message}`); };
  if (node.type !== 'mdxJsxFlowElement' || node.children?.length) fail('must be a standalone empty element');
  const allowed = node.name === 'RelatedReading' ? ['relatedTo', 'relation', 'layout', 'empty'] : node.name === 'DocCard' ? ['doc'] : node.name === 'DocCards'
    ? ['docs', 'relatedTo', 'relation', 'empty']
    : ['type', 'tag', 'operation', 'audience', 'orderBy', 'limit', 'exclude', 'pin', 'empty'];
  const request: any = { component: node.name };
  for (const attribute of node.attributes ?? []) {
    const name = attribute.name;
    if (attribute.type !== 'mdxJsxAttribute' || !allowed.includes(name) || Object.hasOwn(request, name)) fail(`has unknown or duplicate attribute ${name ?? '(spread)'}`);
    let value: unknown = attribute.value;
    if (typeof value !== 'string') {
      const program = attribute.value?.data?.estree;
      const expression = program?.body?.length === 1 && program.body[0].type === 'ExpressionStatement' ? program.body[0].expression : null;
      if (expression?.type === 'Literal') value = expression.value;
      else if (expression?.type === 'ArrayExpression' && expression.elements.every((item: any) => item?.type === 'Literal' && typeof item.value === 'string')) value = expression.elements.map((item: any) => item.value);
      else fail(`${name} must be a literal value`);
    }
    if (['docs', 'exclude', 'pin'].includes(name)) {
      if (!Array.isArray(value) || value.some(item => typeof item !== 'string' || !item.trim()) || new Set(value).size !== value.length) fail(`${name} must be an array of unique document IDs`);
    } else if (name === 'limit') {
      if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) fail('limit must be a positive integer');
    } else if (typeof value !== 'string' || !value.trim()) fail(`${name} must be nonempty text`);
    request[name] = value;
  }
  if (node.name === 'DocCard' && !request.doc) fail('needs doc');
  if (node.name === 'DocCards') {
    if (request.docs !== undefined ? request.relatedTo !== undefined || request.relation !== undefined : !request.relation) fail('needs either docs or relation (with optional relatedTo)');
  }
  if (request.relation && !relationTypes.has(request.relation)) fail(`has unsupported relation ${request.relation}`);
  if (request.layout && !['list', 'cards'].includes(request.layout)) fail('layout must be list or cards');
  if (request.orderBy && !['title', 'id', 'date', 'releaseVersion'].includes(request.orderBy)) fail('orderBy must be title, id, date, or releaseVersion');
  return { type: 'docCards', request, sourceFile: file };
}

export function resolveCardTree(tree: any, current: Document, documents: Map<string, Document>, edges: Relationship[], operations: Set<string>, use: CardUse, config: any = {}): any {
  const registry = new Map([...documents.values()].filter(doc => sameVariant(doc.variant, current.variant)).map(doc => [doc.frontmatter.id, doc]));
  const requireDoc = (id: string, file: string) => {
    const doc = registry.get(id);
    if (!doc) throw new Error(`${file}: card target ${id} is unavailable in ${Object.values(current.variant).join('/')}`);
    return doc;
  };
  const walk = (node: any): any => {
    if (node.type !== 'docCards') return node.children ? { ...node, children: node.children.flatMap(walk) } : node;
    const request = node.request as CardRequest;
    const file = node.sourceFile;
    let selected: Array<{ doc: Document; reason?: string; relation?: Relationship['type'] }> = [];
    if (request.component === 'DocCard' || request.docs !== undefined) {
      selected = (request.docs ?? [request.doc!]).map(id => ({ doc: requireDoc(id, file) }));
    } else if (request.component === 'DocCards' || request.component === 'RelatedReading') {
      const from = request.relatedTo ?? current.frontmatter.id;
      requireDoc(from, file);
      selected = edges.filter(edge => (!request.relation || edge.type === request.relation) && (edge.from === from || (symmetric(edge.type) && edge.to === from)))
        .map(edge => ({ doc: registry.get(edge.from === from ? edge.to : edge.from)!, reason: edge.reason, relation: edge.type }));
    } else {
      if (request.operation && !operations.has(request.operation)) throw new Error(`${file}: unknown card collection operation ${request.operation}`);
      let matches = [...registry.values()].filter(doc => doc !== current
        && (!request.type || doc.frontmatter.type === request.type)
        && (!request.tag || (doc.frontmatter.tags as string[] | undefined)?.includes(request.tag))
        && (!request.operation || doc.frontmatter.operations?.includes(request.operation))
        && (!request.audience || doc.frontmatter.audiences?.includes(request.audience))
        && !request.exclude?.includes(doc.frontmatter.id));
      if (request.orderBy === 'date' && matches.some(doc => !doc.frontmatter.date)) throw new Error(`${file}: date-ordered collection includes a page without date`);
      if (request.orderBy === 'releaseVersion' && matches.some(doc => !doc.frontmatter.releaseVersion)) throw new Error(`${file}: version-ordered collection includes a page without releaseVersion`);
      const versionOrder = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
      matches.sort((a, b) => (request.orderBy === 'date' ? compare(b.frontmatter.date!, a.frontmatter.date!) : request.orderBy === 'releaseVersion' ? versionOrder.compare(b.frontmatter.releaseVersion!, a.frontmatter.releaseVersion!) : request.orderBy === 'id' ? 0 : compare(a.frontmatter.title.toLowerCase(), b.frontmatter.title.toLowerCase())) || compare(a.frontmatter.id, b.frontmatter.id));
      const pinned = (request.pin ?? []).map(id => {
        const doc = requireDoc(id, file);
        if (!matches.includes(doc)) throw new Error(`${file}: pinned card ${id} does not match the collection filters`);
        return doc;
      });
      matches = [...pinned, ...matches.filter(doc => !pinned.includes(doc))];
      selected = matches.slice(0, request.limit).map(doc => ({ doc }));
    }
    if (request.component === 'DocCollection' || request.component === 'RelatedReading' || request.relation) use.queries.push(request);
    for (const { doc } of selected) if (!use.targets.includes(doc.frontmatter.id)) use.targets.push(doc.frontmatter.id);
    if (!selected.length) return { ...paragraph(text(request.empty ?? 'No matching documents.')), data: { hProperties: { className: ['doc-cards-empty'] } } };
    // Keep explicit current-page reading paths available to smaller section reads.
    // The section extractor only carries root-level views, never conditional ones.
    const rememberPath = (node: any, entries: typeof selected): any => {
      if (request.component !== 'RelatedReading' || (request.relatedTo ?? current.frontmatter.id) !== current.frontmatter.id) return node;
      const paths = entries.filter(entry => entry.relation === 'prerequisite' || entry.relation === 'next-step').map(({ doc, reason, relation }) => ({
        id: doc.frontmatter.id, type: relation, title: doc.frontmatter.title, url: doc.route, reason,
        ...(doc.frontmatter.subjectLifecycle ? { status: doc.frontmatter.subjectLifecycle.replaceAll('-', ' ') } : {})
      }));
      if (paths.length) node.data = { ...node.data, sectionReadingPath: paths };
      return node;
    };
    const render = (entries: typeof selected): any => {
      if (request.component === 'RelatedReading' && request.layout !== 'cards') {
        const links = list(entries.map(({ doc, reason }) => [paragraph(
          { ...link(doc.route, doc.frontmatter.title), exportDocumentId: doc.frontmatter.id },
          ...(reason ? [text(` — ${reason}`)] : []),
          ...(doc.frontmatter.subjectLifecycle ? [text(` (Status: ${doc.frontmatter.subjectLifecycle.replaceAll('-', ' ')}.)`)] : [])
        )]));
        links.data = { hProperties: { className: ['related-reading'] } };
        for (const [index, item] of links.children.entries()) item.data = { hProperties: { 'data-reader-filters': readerFilterAttribute(entries[index].doc.readerFilters ?? {}) } };
        return rememberPath(links, entries);
      }
      const cards = list(entries.map(({ doc, reason }) => {
        const meta = doc.frontmatter.card as { title?: string; description?: string; eyebrow?: string; icon?: string } | undefined;
        const subjectLifecycle = doc.frontmatter.subjectLifecycle;
        const label = subjectLifecycle === 'in-development' ? 'In development' : subjectLifecycle === 'deprecated' ? 'Deprecated' : subjectLifecycle === 'beta' ? 'Beta' : subjectLifecycle === 'experimental' ? 'Experimental' : undefined;
        const description = meta?.description ?? surfaceText(doc.frontmatter, 'card', config);
        return [
          ...(meta?.icon ? [cardIcon(meta.icon)] : []),
          ...(meta?.eyebrow ? [{ ...paragraph(text(meta.eyebrow)), data: { hProperties: { className: ['doc-card-eyebrow'] } } }] : []),
          ...(doc.frontmatter.date ? [{ ...paragraph(text(doc.frontmatter.date)), data: { hName: 'time', hProperties: { dateTime: doc.frontmatter.date, className: ['doc-card-date'] } } }] : []),
          ...(doc.frontmatter.releaseVersion ? [{ ...paragraph(text(`Version ${doc.frontmatter.releaseVersion}`)), data: { hProperties: { className: ['doc-card-version'] } } }] : []),
          { ...paragraph({ ...link(doc.route, meta?.title ?? doc.frontmatter.title), exportDocumentId: doc.frontmatter.id }), data: { hProperties: { className: ['doc-card-title'] } } },
          ...(description ? [paragraph(text(description))] : []),
          ...(label ? [paragraph(text(`Status: ${label}.`))] : []),
          ...(reason ? [{ ...paragraph(text(reason)), data: { hProperties: { className: ['doc-card-reason'] } } }] : [])
        ];
      }));
      cards.data = { hProperties: { className: ['doc-cards'] } };
      for (const [index, item] of cards.children.entries()) { item.spread = true; item.data = { hProperties: { className: ['doc-card'], 'data-reader-filters': readerFilterAttribute(entries[index].doc.readerFilters ?? {}) } }; }
      return rememberPath(cards, entries);
    };
    if (request.component === 'RelatedReading' && !request.relation) {
      return Object.entries(relationLabels).flatMap(([type, label]) => {
        const entries = selected.filter(item => item.relation === type);
        return entries.length ? [heading(3, label), render(entries)] : [];
      });
    }
    return render(selected);
  };
  return walk(tree);
}
