import { matchesContentFilter } from './content-filter.js';
import path from 'node:path';
import { ApiReader, querySyntaxRules } from './api.js';
import { generatedOperationIdentity } from './api-identity.js';
import { type Document, type Variant, markdownRoute, routeFor } from './content.js';
import type { PublicationRoutingConfig } from './content-source.js';
import { type ReaderSelection, type ReaderFiltersConfig, pageReaderFilters } from './reader-filters.js';
import { applyFormattingLocale, resolveFrontmatter, validateFrontmatter } from './frontmatter.js';
import { explain, type loadConfig } from './config.js';
import { isConfigMapping, type CompilerPublicationsConfig, type CompilerSiteConfig } from './compiler-config.js';

const generatedReferenceBody = 'This reference is generated from the OpenAPI description. It shows the operation contract; follow any related guides below for task steps and context.\n';
const generatedWebhookBody = 'This webhook reference is generated from the OpenAPI description. The provider sends this event to the receiver.\n';
const keyFor = (id: string, variant: Variant) => `${id}|${variant.channel}|${variant.version}|${variant.language}`;

type ApiDefinition = {
  source?: { kind: string; path: string; [key: string]: unknown };
  publications?: Array<{ channel: string; version: string; source: { kind: string; path: string; [key: string]: unknown }; discovery?: { endpoint?: string }; [key: string]: unknown }>;
  discovery?: { endpoint?: string };
  operations?: Array<{ id: string; reference: string; sourceOperationId?: string }>;
  generateReferences?: boolean | { pathPrefix?: string; include?: string[]; exclude?: string[] };
  mappings?: unknown;
  [key: string]: unknown;
};

export type ApiPublicationConfig = PublicationRoutingConfig & {
  site: CompilerSiteConfig;
  publications: CompilerPublicationsConfig;
  apis?: unknown;
  frontmatter?: unknown;
};

function validatedApiDefinitions(value: unknown): Record<string, ApiDefinition> {
  if (value === undefined) return {};
  if (!isConfigMapping(value)) throw new Error('apis must be a mapping');
  const definitions: Record<string, ApiDefinition> = {};
  for (const [id, raw] of Object.entries(value)) {
    if (!isConfigMapping(raw)) throw new Error(`apis.${id} must be a mapping`);
    const source = raw.source;
    if (source !== undefined && (!isConfigMapping(source) || typeof source.kind !== 'string' || typeof source.path !== 'string')) throw new Error(`apis.${id}.source needs kind and path`);
    const publications = raw.publications;
    if (publications !== undefined && (!Array.isArray(publications) || publications.some(item => !isConfigMapping(item) || typeof item.channel !== 'string' || typeof item.version !== 'string' || !isConfigMapping(item.source) || typeof item.source.kind !== 'string' || typeof item.source.path !== 'string' || (item.discovery !== undefined && (!isConfigMapping(item.discovery) || (item.discovery.endpoint !== undefined && typeof item.discovery.endpoint !== 'string')))))) throw new Error(`apis.${id}.publications needs entries with channel, version, and a local source`);
    const operations = raw.operations;
    if (operations !== undefined && (!Array.isArray(operations) || operations.some(item => !isConfigMapping(item) || typeof item.id !== 'string' || typeof item.reference !== 'string' || (item.sourceOperationId !== undefined && typeof item.sourceOperationId !== 'string')))) throw new Error(`API ${id} operation needs stable id and reference`);
    const discovery = raw.discovery;
    if (discovery !== undefined && (!isConfigMapping(discovery) || (discovery.endpoint !== undefined && typeof discovery.endpoint !== 'string'))) throw new Error(`apis.${id}.discovery.endpoint must be a string`);
    definitions[id] = raw as ApiDefinition;
  }
  return definitions;
}

export async function materializeApiReferences({ config, loaded, variants, docs, knownDocumentIds, knownDocumentTypes, authoredOperationIds, routeOwners, basePath, readerFilters, contentFilter }: {
  config: ApiPublicationConfig;
  loaded: Awaited<ReturnType<typeof loadConfig>>;
  variants: Variant[];
  docs: Map<string, Document>;
  knownDocumentIds: Set<string>;
  knownDocumentTypes: Map<string, string>;
  authoredOperationIds: Set<string>;
  routeOwners: Map<string, string>;
  basePath: string;
  readerFilters?: ReaderFiltersConfig;
  contentFilter?: ReaderSelection;
}) {
  const definitions = validatedApiDefinitions(config.apis);
  const api = new ApiReader();
  const queryRules = new Map(Object.entries(definitions).map(([id, definition]) => [id, querySyntaxRules(definition.querySyntax)]));
  const lifecycleMappings = new Map<string, { from: string; values: Record<string, 'beta' | 'in-development' | 'deprecated' | 'experimental'> }>();
  const extensionValue = (operation: unknown, selector: string): unknown => selector.split('.').reduce<unknown>((value, key) => isConfigMapping(value) && Object.hasOwn(value, key) ? value[key] : undefined, operation);
  for (const [id, definition] of Object.entries(definitions)) {
    if (definition.mappings !== undefined && (!definition.mappings || typeof definition.mappings !== 'object' || Array.isArray(definition.mappings) || Object.keys(definition.mappings).some(key => key !== 'subjectLifecycle'))) throw new Error(`apis.${id}.mappings accepts only subjectLifecycle`);
    const mapping = (definition.mappings as { subjectLifecycle?: { from: string; values: Record<string, 'beta' | 'in-development' | 'deprecated' | 'experimental'> } } | undefined)?.subjectLifecycle;
    if (mapping === undefined) continue;
    if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping) || Object.keys(mapping).some(key => !['from', 'values'].includes(key)) || typeof mapping.from !== 'string' || !/^x-[a-z0-9-]+(?:\.[a-z0-9_-]+)*$/i.test(mapping.from) || !mapping.values || typeof mapping.values !== 'object' || Array.isArray(mapping.values) || !Object.keys(mapping.values).length || Object.values(mapping.values).some(value => !['beta', 'in-development', 'deprecated', 'experimental'].includes(String(value)))) throw new Error(`apis.${id}.mappings.subjectLifecycle needs an x- extension name or dotted property path and values mapped to beta, in-development, deprecated, or experimental`);
    lifecycleMappings.set(id, mapping);
  }
  const sourceForVariant = (apiId: string, definition: ApiDefinition, variant: Variant) => {
    const defaults = config.publications.defaults;
    if (definition.source !== undefined && (!defaults?.channel || !defaults?.version)) throw new Error(`apis.${apiId}.source needs publications.defaults with channel and version to choose its publication`);
    const isDefault = variant.channel === defaults?.channel && variant.version === defaults?.version;
    const publicationIndex = definition.publications?.findIndex(item => item.channel === variant.channel && item.version === variant.version) ?? -1;
    const source = publicationIndex >= 0 ? definition.publications?.[publicationIndex].source : (isDefault ? definition.source : undefined);
    if (!source) return undefined;
    if (source.kind !== 'file') throw new Error(`pinned local OpenAPI source required for ${apiId} in ${variant.channel}/${variant.version}`);
    const sourceKey = publicationIndex >= 0 ? `apis.${apiId}.publications.${publicationIndex}.source.path` : `apis.${apiId}.source.path`;
    const sourceOrigin = explain(loaded, sourceKey).source.file;
    return { file: path.resolve(path.dirname(sourceOrigin), source.path), source, definition, publicationIndex, apiId };
  };
  const knownOperations = new Map<string, { apiId: string; reference: string }>();
  for (const [apiId, definition] of Object.entries(definitions)) {
    for (const operation of definition.operations ?? []) {
      if (typeof operation.id !== 'string' || typeof operation.reference !== 'string') throw new Error(`API ${apiId} operation needs stable id and reference`);
      if (knownOperations.has(operation.id)) throw new Error(`Duplicate stable operation ID ${operation.id}`);
      knownOperations.set(operation.id, { apiId, reference: operation.reference });
    }
  }
  const methods = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace']);
  for (const [apiId, definition] of Object.entries(definitions)) {
    const generate = definition.generateReferences;
    const implicitPages = [...authoredOperationIds].some(id => id.startsWith(`${apiId}.`) && !knownOperations.has(id));
    if ((generate === undefined || generate === false) && !implicitPages) continue;
    if (generate !== undefined && generate !== false && generate !== true && (!generate || typeof generate !== 'object' || Array.isArray(generate) || Object.keys(generate).some(key => !['pathPrefix', 'include', 'exclude'].includes(key)))) throw new Error(`apis.${apiId}.generateReferences must be true or a mapping with pathPrefix, include, or exclude`);
    const prefix = generate && generate !== true ? generate.pathPrefix ?? `/reference/${apiId}` : `/reference/${apiId}`;
    if (generate && (typeof prefix !== 'string' || !prefix.startsWith('/') || prefix === '/' || prefix.endsWith('/') || prefix.includes('..') || /[?#]/.test(prefix))) throw new Error(`apis.${apiId}.generateReferences.pathPrefix must be an absolute page path without a trailing slash`);
    if (generate && generate !== true && generate.include !== undefined && generate.exclude !== undefined) throw new Error(`apis.${apiId}.generateReferences cannot combine include and exclude`);
    const selections: Record<string, string[] | undefined> = !generate || generate === true ? {} : { include: generate.include, exclude: generate.exclude };
    for (const [name, ids] of Object.entries(selections)) {
      if (ids === undefined) continue;
      if (!Array.isArray(ids) || ids.some(id => typeof id !== 'string' || !id.trim()) || new Set(ids).size !== ids.length) throw new Error(`apis.${apiId}.generateReferences.${name} must be a unique list of operationId strings`);
    }
    const include = selections.include ? new Set(selections.include) : undefined;
    const exclude = selections.exclude ? new Set(selections.exclude) : undefined;
    const available = new Set<string>();
    const explicit = new Set<string>();
    for (const operation of definition.operations ?? []) {
      if (typeof operation.sourceOperationId !== 'string' || !operation.sourceOperationId) throw new Error(`API ${apiId} operation needs sourceOperationId`);
      if (explicit.has(operation.sourceOperationId)) throw new Error(`API ${apiId} binds source operation ${operation.sourceOperationId} more than once`);
      explicit.add(operation.sourceOperationId);
    }
    definition.operations ??= [];
    for (const variant of variants) {
      const binding = sourceForVariant(apiId, definition, variant);
      if (!binding) continue;
      const rawSpec: unknown = (await api.load(binding.file)).value;
      const spec = isConfigMapping(rawSpec) ? rawSpec : {};
      if (!/^3\.(0|1)\./.test(String(spec.openapi))) throw new Error(`${binding.file}: OpenAPI 3.0.x or 3.1.x required`);
      const seen = new Set<string>();
      for (const [collection, webhook] of [[spec.paths ?? {}, false], [spec.webhooks ?? {}, true]] as const) for (const [route, initial] of Object.entries(isConfigMapping(collection) ? collection : {})) {
        const pathReference = isConfigMapping(initial) ? initial.$ref : undefined;
        if (pathReference !== undefined && typeof pathReference !== 'string') throw new Error(`${binding.file}: ${route} has an invalid path reference`);
        const pathItem: unknown = pathReference ? (await api.ref(await api.load(binding.file), pathReference)).value : initial;
        for (const [method, operation] of Object.entries(isConfigMapping(pathItem) ? pathItem : {})) {
          if (!methods.has(method)) continue;
          const sourceOperationId = isConfigMapping(operation) ? operation.operationId : undefined;
          if (typeof sourceOperationId !== 'string' || !sourceOperationId.trim()) throw new Error(`${binding.file}: ${webhook ? 'webhook' : method.toUpperCase()} ${route} needs operationId for generated references`);
          if (seen.has(sourceOperationId)) throw new Error(`${binding.file}: duplicate operationId ${sourceOperationId}`);
          seen.add(sourceOperationId);
          available.add(sourceOperationId);
          if (explicit.has(sourceOperationId)) continue;
          const generated = generatedOperationIdentity(apiId, sourceOperationId, prefix);
          const { id, reference } = generated;
          const selected = !!generate && (!include || include.has(sourceOperationId)) && !exclude?.has(sourceOperationId);
          if (!selected && !authoredOperationIds.has(id)) continue;
          const registered = knownOperations.get(id);
          if (registered && (registered.apiId !== apiId || registered.reference !== reference)) throw new Error(`Generated operation ID ${id} conflicts with an authored binding`);
          if (!registered) {
            knownOperations.set(id, { apiId, reference });
            definition.operations.push({ id, sourceOperationId, reference });
          }
          if (!selected) continue;
          const page = resolveFrontmatter({
            id: reference, title: String(isConfigMapping(operation) && operation.summary || `${webhook ? 'Webhook' : method.toUpperCase()} ${route}`),
            summary: webhook ? `Webhook event: ${route}` : `${method.toUpperCase()} ${route}`, type: 'api-reference',
            slug: generated.slug, ...variant, operations: [id], access: { policy: 'public' }
          }, config.frontmatter);
          applyFormattingLocale(page, config.frontmatter);
          validateFrontmatter(page, config.frontmatter, binding.file);
          knownDocumentIds.add(reference);
          knownDocumentTypes.set(reference, page.type);
          if (page.access?.policy !== 'public' || page.channel !== variant.channel || page.version !== variant.version || page.language !== variant.language) continue;
          const key = keyFor(reference, variant);
          const authored = docs.get(key);
          if (authored) {
            if (authored.frontmatter.type !== 'api-reference' || authored.frontmatter.operations?.length !== 1 || authored.frontmatter.operations[0] !== id) throw new Error(`Generated API reference ${reference} conflicts with an authored page`);
            continue;
          }
          const marks = pageReaderFilters(page, readerFilters, binding.file);
          if (!matchesContentFilter(marks, contentFilter)) continue;
          const pageRoute = routeFor(page, variant, config);
          const collision = routeOwners.get(pageRoute.toLowerCase());
          if (collision) throw new Error(`Route collision ${pageRoute}: ${collision} and ${key}`);
          routeOwners.set(pageRoute.toLowerCase(), key);
          docs.set(key, { file: binding.file, frontmatter: page, body: webhook ? generatedWebhookBody : generatedReferenceBody, tree: null, variant, route: pageRoute, markdownRoute: markdownRoute(pageRoute, basePath), readerFilters: marks });
        }
      }
    }
    for (const id of [...(include ?? []), ...(exclude ?? [])]) if (!available.has(id)) throw new Error(`apis.${apiId}.generateReferences names unknown source operationId ${id}`);
  }
  return { api, queryRules, lifecycleMappings, extensionValue, sourceForVariant, knownOperations, apiDefinitions: definitions };
}
