import path from 'node:path';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { renderHtmlWithHeadings } from './html-renderer.js';
import { readCodeReference, type CodeReference } from './code-reference-model.js';
import { explainSegments, type loadConfig } from './config.js';
import { resolvePublication } from './compiler-config.js';
import { resolveFrontmatter, validateFrontmatter, applyFormattingLocale } from './frontmatter.js';
import { matchesFeatures, validateFeatureClassification } from './deployment-profile.js';
import { pageReaderFilters, type ReaderFiltersConfig, type ReaderSelection } from './reader-filters.js';
import { matchesContentFilter } from './content-filter.js';
import { documentKey } from './publication-identity.js';
import { routeFor, markdownRoute, type Document, type Variant } from './content-source.js';
import type { AuthoredPublicationConfig, AuthoredPublicationPlan } from './publication-plan.js';
import { heading, paragraph, text, parsePlainMarkdown, root } from './semantic-markdown.js';

const mapping = z.record(z.string(), z.unknown());
const source = z.object({ kind: z.literal('file'), path: z.string().min(1) }).strict();
const override = z.object({ documentId: z.string().min(1).optional(), slug: z.string().startsWith('/').optional(), metadata: mapping.optional() }).strict();
const catalogSchema = z.object({
  source: source.optional(),
  sourceLink: z.object({ baseUrl: z.string().url().refine(value => { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash; }, 'Source links need an HTTPS base URL without credentials, query or fragment') }).strict().optional(),
  publications: z.array(z.object({ product: z.string().optional(), channel: z.string(), version: z.string(), language: z.string().optional(), source }).strict()).min(1).optional(),
  layout: z.enum(['symbols', 'classes', 'modules']).default('symbols'),
  singlePage: z.union([z.literal(false), z.object({ documentId: z.string().min(1).optional(), slug: z.string().startsWith('/').optional(), title: z.string().min(1).default('Complete API reference'), summary: z.string().min(1).default('Classes, functions, and fields in this publication.'), metadata: mapping.optional() }).strict()]).optional(),
  pathPrefix: z.string().regex(/^\/[a-zA-Z0-9_/-]+$/).default('/reference/code'),
  metadata: mapping.optional(),
  include: z.array(z.string()).optional(), exclude: z.array(z.string()).optional(),
  symbols: z.record(z.string(), override).optional()
}).strict().refine(value => !!value.source !== !!value.publications, 'Declare source or publications');

const hash = (value: string) => createHash('sha256').update(value).digest('hex').slice(0, 16);
export function codeDocumentId(catalog: string, symbol: string): string { return `reference.${catalog}.${/^[A-Za-z0-9_.-]+$/.test(symbol) ? symbol : hash(symbol)}`; }

export async function materializeCodeReferences(input: {
  config: AuthoredPublicationConfig & { codeReferences?: unknown }; loaded: Awaited<ReturnType<typeof loadConfig>>;
  plan: AuthoredPublicationPlan; base: string; basePath: string; variants: Variant[]; language: string;
  readerFilters?: ReaderFiltersConfig; contentFilter?: ReaderSelection; dependencies: Set<string>; allowRouteCollisions?: boolean;
}) {
  const { config, loaded, plan, base, basePath, variants, language, readerFilters, contentFilter, dependencies } = input;
  if (config.codeReferences === undefined) return;
  const catalogs = z.record(z.string().regex(/^[a-z][a-z0-9-]*$/), catalogSchema).parse(config.codeReferences);
  const owners = new Map<string, string>([...plan.knownDocumentIds].map(id => [id, 'authored']));
  for (const [catalogId, catalog] of Object.entries(catalogs)) {
    const bindings = catalog.publications ?? [{ ...resolvePublication(config.publications, config.publications.defaults ?? {}, language), source: catalog.source! }];
    const seenPublications = new Set<string>();
    for (const [index, binding] of bindings.entries()) {
      const variant = resolvePublication(config.publications, binding, language);
      const identity = documentKey(catalogId, variant);
      if (seenPublications.has(identity)) throw new Error(`Duplicate code reference publication ${identity}`);
      seenPublications.add(identity);
      const segments = ['codeReferences', catalogId, ...(catalog.publications ? ['publications', String(index)] : []), 'source', 'path'];
      const owner = explainSegments(loaded, segments).source.file;
      if (path.isAbsolute(binding.source.path) || /^[a-z][a-z0-9+.-]*:/i.test(binding.source.path)) throw new Error('Code reference sources need local relative paths');
      const file = path.resolve(path.dirname(owner), binding.source.path);
      dependencies.add(file);
      const snapshot = await readCodeReference(file, base);
      const symbols = new Map(snapshot.symbols.map(symbol => [symbol.id, symbol]));
      for (const name of [...catalog.include ?? [], ...catalog.exclude ?? [], ...Object.keys(catalog.symbols ?? {})]) if (!symbols.has(name)) throw new Error(`Code reference ${catalogId}: unknown selected symbol ${name}`);
      const visibility = new Map<string, boolean>();
      for (const symbol of snapshot.symbols) {
        const chain = [];
        let ancestor = symbol as typeof symbol | undefined;
        while (ancestor && !visibility.has(ancestor.id)) { chain.push(ancestor); ancestor = ancestor.parent ? symbols.get(ancestor.parent) : undefined; }
        let visible = ancestor ? visibility.get(ancestor.id)! : true;
        for (const entry of chain.reverse()) { visible = visible && entry.visibility === 'public'; visibility.set(entry.id, visible); }
      }
      for (const symbol of snapshot.symbols) {
        const selected = visibility.get(symbol.id) && (!catalog.include || catalog.include.includes(symbol.id)) && !catalog.exclude?.includes(symbol.id);
        const setting = catalog.symbols?.[symbol.id];
        const inherited = { ...catalog.metadata };
        if (setting?.metadata && (Object.hasOwn(setting.metadata, 'shared') || Object.hasOwn(setting.metadata, 'requires'))) { delete inherited.shared; delete inherited.requires; }
        const metadata = { ...inherited, ...setting?.metadata };
        const id = setting?.documentId ?? codeDocumentId(catalogId, symbol.id);
        const ownerId = `${catalogId}:${symbol.id}`;
        if (owners.has(id) && owners.get(id) !== ownerId) throw new Error(`Duplicate code reference document ID ${id}`);
        owners.set(id, ownerId);
        plan.knownDocumentIds.add(id);
        const existing = plan.knownDocumentTypes.get(id);
        if (existing && existing !== 'code-reference') throw new Error(`Duplicate code reference document ID ${id}`);
        plan.knownDocumentTypes.set(id, 'code-reference');
        const pageSource = {
          ...metadata, id, title: symbol.name, summary: symbol.summary ?? `${symbol.kind}: ${symbol.id}`,
          type: 'code-reference', slug: setting?.slug ?? `${catalog.pathPrefix}/${symbol.id.toLowerCase().replace(/[^a-z0-9_-]+/g, '-')}-${hash(symbol.id)}`,
          ...variant
        };
        const frontmatter = resolveFrontmatter(pageSource, config.frontmatter);
        frontmatter.access ??= { policy: 'public' };
        if (catalog.layout !== 'symbols') frontmatter.tocDepth ??= 2;
        for (const [field, expected] of Object.entries({ id, type: 'code-reference', ...variant })) if (frontmatter[field] !== expected) throw new Error(`Code reference ${id}: enforced ${field} conflicts with its catalog`);
        applyFormattingLocale(frontmatter, config.frontmatter, pageSource);
        validateFrontmatter(frontmatter, config.frontmatter, file, pageSource);
        const classification = loaded.deployment?.context.classificationPublications ?? variants;
        if (selected && frontmatter.access?.policy === 'public' && classification.some(item => documentKey(catalogId, item) === identity)) validateFeatureClassification(metadata, loaded.deployment?.context, `${file}: ${symbol.id}`);
        if (!selected || !matchesFeatures(frontmatter.requires, loaded.deployment?.context, `${file}: ${symbol.id}`) || !variants.some(item => documentKey(catalogId, item) === identity)) continue;
        if (frontmatter.access?.policy !== 'public') continue;
        const marks = pageReaderFilters(frontmatter, readerFilters, file);
        if (!matchesContentFilter(marks, contentFilter)) continue;
        const key = documentKey(id, variant);
        if (plan.docs.has(key)) throw new Error(`Duplicate code reference document ${id}`);
        const route = routeFor(frontmatter, variant, config);
        const collision = plan.routeOwners.get(route.toLowerCase());
        if (collision && !input.allowRouteCollisions) throw new Error(`Code reference route collision ${route}`);
        plan.routeOwners.set(route.toLowerCase(), key);
        plan.docs.set(key, { file, frontmatter, variant, route, markdownRoute: markdownRoute(route, basePath), readerFilters: marks, featureContext: loaded.deployment?.context, body: '', tree: null, codeReference: { catalog: catalogId, programmingLanguage: snapshot.programmingLanguage, symbol, layout: catalog.layout, ...(catalog.sourceLink && symbol.source ? { sourceUrl: catalog.sourceLink.baseUrl.replace(/\/$/, '') + '/' + symbol.source.path.split('/').map(encodeURIComponent).join('/') + (symbol.source.line ? `#L${symbol.source.line}` : '') } : {}) } });
      }
      if (catalog.singlePage) {
        const single = catalog.singlePage;
        const id = single.documentId ?? `reference.${catalogId}.complete`;
        const ownerId = `${catalogId}:complete-page`;
        if (owners.has(id) && owners.get(id) !== ownerId) throw new Error(`Duplicate code reference document ID ${id}`);
        owners.set(id, ownerId);
        plan.knownDocumentIds.add(id);
        plan.knownDocumentTypes.set(id, 'code-reference');
        const inherited = { ...catalog.metadata };
        if (single.metadata && (Object.hasOwn(single.metadata, 'shared') || Object.hasOwn(single.metadata, 'requires'))) { delete inherited.shared; delete inherited.requires; }
        const metadata = { ...inherited, ...single.metadata };
        const source = { ...metadata, id, title: single.title, summary: single.summary, type: 'code-reference', slug: single.slug ?? `${catalog.pathPrefix}/all`, ...variant };
        const frontmatter = resolveFrontmatter(source, config.frontmatter);
        frontmatter.access ??= { policy: 'public' };
        for (const [field, expected] of Object.entries({ id, type: 'code-reference', ...variant })) if (frontmatter[field] !== expected) throw new Error(`Code reference ${id}: enforced ${field} conflicts with its catalog`);
        applyFormattingLocale(frontmatter, config.frontmatter, source);
        validateFrontmatter(frontmatter, config.frontmatter, file, source);
        frontmatter.tocDepth ??= 2;
        const active = variants.some(item => documentKey(catalogId, item) === identity);
        const classification = loaded.deployment?.context.classificationPublications ?? variants;
        if (frontmatter.access?.policy === 'public' && classification.some(item => documentKey(catalogId, item) === identity)) validateFeatureClassification(metadata, loaded.deployment?.context, `${file}: ${id}`);
        const granted = matchesFeatures(frontmatter.requires, loaded.deployment?.context, `${file}: ${id}`);
        const marks = pageReaderFilters(frontmatter, readerFilters, file);
        const hasContent = [...plan.docs.values()].some(doc => doc.codeReference?.catalog === catalogId && documentKey(catalogId, doc.variant) === identity);
        if (active && granted && hasContent && frontmatter.access.policy === 'public' && matchesContentFilter(marks, contentFilter)) {
          const key = documentKey(id, variant);
          if (plan.docs.has(key)) throw new Error(`Duplicate code reference document ${id}`);
          const route = routeFor(frontmatter, variant, config);
          if (plan.routeOwners.has(route.toLowerCase()) && !input.allowRouteCollisions) throw new Error(`Code reference route collision ${route}`);
          plan.routeOwners.set(route.toLowerCase(), key);
          plan.docs.set(key, { file, frontmatter, variant, route, markdownRoute: markdownRoute(route, basePath), readerFilters: marks, featureContext: loaded.deployment?.context, body: '', tree: null,
            codeReference: { catalog: catalogId, programmingLanguage: snapshot.programmingLanguage, complete: true, symbol: { id, name: single.title, kind: 'module', visibility: 'public' } } });
        }
      }
    }
  }
}

/** Imported prose is inert Markdown; it never enters MDX or project directive expansion. */
export function renderCodeReference(reference: CodeReference, doc: Document, documents: Map<string, Document>) {
  const eligible = new Map<string, Document>();
  for (const candidate of documents.values()) if (candidate.codeReference?.catalog === reference.catalog && !candidate.codeReference.complete && documentKey('scope', candidate.variant) === documentKey('scope', doc.variant)) eligible.set(candidate.codeReference.symbol.id, candidate);
  const owner = (page: Document): string | undefined => {
    let parent = page.codeReference!.symbol.parent;
    while (parent) {
      const candidate = eligible.get(parent);
      if (!candidate) return;
      const kind = candidate.codeReference!.symbol.kind;
      if (['module', 'namespace'].includes(kind) || reference.layout === 'classes' && ['class', 'interface', 'enum', 'type'].includes(kind)) return parent;
      parent = candidate.codeReference!.symbol.parent;
    }
  };
  const embedded = [...eligible.values()].filter(page => reference.complete || reference.layout !== undefined && reference.layout !== 'symbols' && owner(page) === reference.symbol.id)
    .sort((a, b) => a.codeReference!.symbol.id < b.codeReference!.symbol.id ? -1 : 1);
  const blocks: any[] = reference.complete ? [] : renderCodeSymbol(reference, doc, eligible, false).children;
  const headings = new Map<any, Document>();
  for (const page of embedded) {
    const entry = heading(2, page.codeReference!.symbol.id);
    headings.set(entry, page);
    const content = renderCodeSymbol(page.codeReference!, page, eligible, true).children;
    const deepen = (node: any) => { if (node.type === 'heading') node.depth = Math.min(6, node.depth + 1); for (const child of node.children ?? []) deepen(child); };
    content.forEach(deepen);
    blocks.push(entry, ...content);
  }
  const tree = root(blocks);
  if (embedded.length) {
    // Use the renderer's actual heading allocation, including duplicate headings.
    const reserved = ['main', 'docs-navigation', 'docs-sections', 'documentation-menu', 'page-outline', 'nav-filter', 'examples-title', 'api-view-select'];
    const rendered = renderHtmlWithHeadings(tree, undefined, reserved).headings;
    const targets = new Map<string, string>();
    let index = 0;
    const collect = (node: any) => {
      if (node.type === 'heading' && node.depth >= 2 && node.depth <= 6) {
        const target = headings.get(node);
        if (target) targets.set(target.frontmatter.id, rendered[index].id);
        index++;
      }
      for (const child of node.children ?? []) collect(child);
    };
    collect(tree);
    const relink = (node: any) => {
      const anchor = targets.get(node.exportDocumentId);
      if (node.type === 'link' && anchor) { node.url = `${doc.route}#${anchor}`; node.exportDocumentId = doc.frontmatter.id; }
      for (const child of node.children ?? []) relink(child);
    };
    relink(tree);
  }
  return tree;
}

function renderCodeSymbol(reference: CodeReference, doc: Document, eligible: Map<string, Document>, embedded: boolean) {
  const prose = (value = ''): any[] => {
    const parsed = parsePlainMarkdown(value);
    const definitions = new Map<string, any>();
    const collect = (node: any) => { if (node.type === 'definition') definitions.set(node.identifier.toLowerCase(), node); for (const child of node.children ?? []) collect(child); };
    parsed.forEach(collect);
    const clean = (node: any): any[] => {
      if (node.type === 'definition') return [];
      if (node.type === 'linkReference') {
        const definition = definitions.get(node.identifier.toLowerCase());
        if (!definition) return (node.children ?? []).flatMap(clean);
        node = { type: 'link', url: definition.url, title: definition.title, children: node.children };
      }
      if (node.type === 'image' || node.type === 'imageReference') throw new Error(`${doc.file}: code reference prose images need explicit asset support`);
      if (typeof node.url === 'string') {
        if (node.url.startsWith('symbol:')) {
          const target = eligible.get(node.url.slice(7));
          if (!target) return (node.children ?? []).flatMap(clean);
          node = { ...node, url: target.route, exportDocumentId: target.frontmatter.id };
        } else {
          const url = new URL(node.url, 'https://code-reference.invalid');
          if (!['https:', 'mailto:'].includes(url.protocol) || url.username || url.password || url.origin === 'https://code-reference.invalid') throw new Error(`${doc.file}: unsupported code reference prose URL ${node.url}`);
        }
      }
      return [{ ...node, ...(node.children ? { children: node.children.flatMap(clean) } : {}) }];
    };
    return parsed.flatMap(clean);
  };
  const symbol = reference.symbol;
  const inlineCode = (value: string) => ({ type: 'inlineCode', value });
  const code = (value: string, signature = false) => ({ type: 'code', lang: reference.programmingLanguage, value,
    ...(signature ? { data: { hProperties: { className: [`language-${reference.programmingLanguage}`, 'code-reference-signature'] } } } : {}) });
  const pageLink = (page: Document, label = page.frontmatter.title) => ({ type: 'link', url: page.route, exportDocumentId: page.frontmatter.id, children: [inlineCode(label)] });
  // References are explicit converter data; never guess an ambiguous short name.
  const typeNodes = (value: string, context = symbol): any[] => {
    const tokens = Object.keys(context.typeReferences ?? {}).sort((a, b) => b.length - a.length);
    if (!tokens.length) return [inlineCode(value)];
    const output: any[] = [];
    let plain = '';
    for (let offset = 0; offset < value.length;) {
      const match = tokens.find(token => value.startsWith(token, offset) && !/[\p{L}\p{N}_.$]/u.test(value[offset - 1] ?? '') && !/[\p{L}\p{N}_.$]/u.test(value[offset + token.length] ?? ''));
      const page = match ? eligible.get(context.typeReferences![match]) : undefined;
      if (match && page) { if (plain) output.push(inlineCode(plain)); plain = ''; output.push(pageLink(page, match)); offset += match.length; }
      else { plain += value[offset]; offset++; }
    }
    if (plain) output.push(inlineCode(plain));
    return output;
  };
  const table = (headers: string[], rows: any[][][], label: string) => ({ type: 'table', align: headers.map(() => null),
    data: { referenceTableLabel: label, hProperties: { className: ['code-reference-table'] } }, children: [headers.map(value => [text(value)]), ...rows].map(cells => ({ type: 'tableRow', children: cells.map(children => ({ type: 'tableCell', children })) })) });
  const summary = (value?: string): any[] => {
    const nodes = prose(value);
    const paragraph = nodes.find(node => node.type === 'paragraph');
    return paragraph?.children ?? [text('—')];
  };
  const description = prose(symbol.description);
  // Hide the repeated summary only in the website shell; exports retain it.
  if (description[0]?.type === 'paragraph') {
    const plain = (node: any): string => node.value ?? (node.children ?? []).map(plain).join('');
    if (!embedded && plain(description[0]).trim() === doc.frontmatter.summary.trim()) description[0] = { ...description[0], data: { hProperties: { className: ['code-reference-summary'] } } };
  }
  const identity = paragraph({ type: 'strong', children: [text(symbol.kind.charAt(0).toUpperCase() + symbol.kind.slice(1))] }, text(' '), inlineCode(symbol.id),
    ...(reference.sourceUrl ? [text(' · '), { type: 'link', url: reference.sourceUrl, children: [text('View source')] }] : []));
  identity.data = { hProperties: { className: ['code-reference-identity'] } };
  const blocks: any[] = [identity, ...(symbol.signatures?.length ? [code(symbol.signatures.join('\n\n'), true)] : []), ...description];
  if (symbol.constructorSignature) blocks.push(heading(2, 'Constructor'), code(symbol.constructorSignature, true));
  if (symbol.bases?.length) blocks.push(paragraph({ type: 'strong', children: [text('Bases: ')] }, ...symbol.bases.flatMap((base, i) => [...(i ? [text(', ')] : []), ...typeNodes(base)])));
  if (symbol.annotation) blocks.push(paragraph({ type: 'strong', children: [text('Type: ')] }, ...typeNodes(symbol.annotation)));
  if (symbol.required !== undefined || symbol.default !== undefined) blocks.push(paragraph(...(symbol.required === undefined ? [] : [text(symbol.required ? 'Required' : 'Optional')]), ...(symbol.default === undefined ? [] : [text(symbol.required === undefined ? 'Default: ' : ' · Default: '), inlineCode(symbol.default)])));
  const details = (title: string, items: Array<{ name: string; type?: string; description?: string; default?: string }>) => {
    if (!items.length) return;
    blocks.push(heading(2, title));
    blocks.push(table(title === 'Parameters' ? ['Parameter', 'Type / default', 'Description'] : ['Exception', 'Description'], items.map(item => {
      const kind = [...(item.type ? typeNodes(item.type) : [text('—')]), ...(item.default === undefined ? [] : [text(' = '), inlineCode(item.default)])];
      return title === 'Parameters' ? [[inlineCode(item.name)], kind, summary(item.description)] : [typeNodes(item.name), summary(item.description)];
    }), title));
    // Preserve richer Markdown without forcing block content into a table cell.
    for (const item of items) {
      const content = prose(item.description);
      if (content.length > 1 || content.some(node => node.type !== 'paragraph')) blocks.push(heading(3, item.name), ...content);
    }
  };
  details('Parameters', symbol.parameters ?? []);
  for (const [title, result] of [['Returns', symbol.returns], ['Yields', symbol.yields]] as const) if (result) {
    blocks.push(heading(2, title));
    if (result.type) blocks.push(paragraph(...typeNodes(result.type)));
    blocks.push(...prose(result.description));
  }
  details('Raises', symbol.raises ?? []);
  if (symbol.examples?.length) {
    blocks.push(heading(2, 'Examples'));
    for (const example of symbol.examples) blocks.push(...(example.title ? [heading(3, example.title)] : []), code(example.code));
  }
  const members = [...eligible.values()].filter(item => item.codeReference?.symbol.parent === symbol.id).sort((a, b) => a.frontmatter.title < b.frontmatter.title ? -1 : a.frontmatter.title > b.frontmatter.title ? 1 : 0);
  const fields = members.filter(page => ['attribute', 'property', 'constant'].includes(page.codeReference!.symbol.kind));
  const callables = members.filter(page => ['function', 'method', 'constructor'].includes(page.codeReference!.symbol.kind));
  const types = members.filter(page => !fields.includes(page) && !callables.includes(page));
  for (const [title, pages] of [['Fields', fields], [['module', 'namespace'].includes(symbol.kind) ? 'Functions' : 'Methods', callables], ['Members', types]] as const) if (pages.length) {
    blocks.push(heading(2, title), table(title === 'Fields' ? ['Name', 'Type', 'Required / default', 'Description'] : ['Name', 'Kind', 'Description'], pages.map(page => {
      const member = page.codeReference!.symbol;
      const declaration = member.signatures?.[0];
      const annotation = declaration?.startsWith(member.name + ': ') ? declaration.slice(member.name.length + 2) : undefined;
      return title === 'Fields' ? [[pageLink(page)], typeNodes(member.annotation ?? annotation ?? member.kind, member), [...(member.required === undefined ? [] : [text(member.required ? 'Required' : 'Optional')]), ...(member.default === undefined ? [] : [text(member.required === undefined ? '' : ' · '), inlineCode(member.default)]), ...(member.required === undefined && member.default === undefined ? [text('—')] : [])], summary(member.summary ?? member.description)] : [[pageLink(page)], [inlineCode(member.kind)], summary(member.summary ?? member.description)];
    }), title));
  }
  const related = (symbol.seeAlso ?? []).flatMap(id => eligible.has(id) ? [eligible.get(id)!] : []);
  if (related.length) blocks.push(heading(2, 'See also'), { type: 'list', ordered: false, children: related.map(page => ({ type: 'listItem', children: [paragraph(pageLink(page))] })) });
  return root(blocks);
}
