import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { type Document, type Variant, parse } from './content.js';
import { planAuthoredDocuments, type AuthoredPublicationConfig } from './publication-plan.js';
import { materializeApiReferences } from './api-publication-plan.js';
import { explainSegments, type loadConfig } from './config.js';
import { validateSnippetConfig, type SnippetDefinition } from './snippets.js';
import type { ReaderFiltersConfig, ReaderSelection } from './reader-filters.js';
import type { loadMetadataProvider } from './metadata-provider.js';

const keyFor = (id: string, variant: Variant) => `${id}|${variant.channel}|${variant.version}|${variant.language}`;

/** Shared source resolution. No website navigation, styles, hosting or provider setup. */
export async function prepareContentWorkspace({ base, basePath, config, loaded, variants, language, readerFilters, contentFilter, metadataProvider, metadataDependencies, sourceOverrides, authoringFiles, allowRouteCollisions }: {
  base: string; basePath: string; config: AuthoredPublicationConfig & { snippets?: unknown; variables?: unknown; apis?: unknown }; loaded: Awaited<ReturnType<typeof loadConfig>>;
  variants: Variant[]; language: string; readerFilters?: ReaderFiltersConfig; contentFilter?: ReaderSelection;
  metadataProvider?: Awaited<ReturnType<typeof loadMetadataProvider>>; metadataDependencies: Set<string>;
  sourceOverrides?: ReadonlyMap<string, string>; authoringFiles?: ReadonlySet<string>; allowRouteCollisions?: boolean;
}) {
  const { docs, knownDocumentIds, knownDocumentTypes, authoredOperationIds, routeOwners, contentDir } = await planAuthoredDocuments({
    base, basePath, config, variants, language, readerFilters, contentFilter, metadataProvider, metadataDependencies, sourceOverrides, authoringFiles, allowRouteCollisions
  });
  if (config.snippets !== undefined && (!config.snippets || typeof config.snippets !== 'object' || Array.isArray(config.snippets))) throw new Error('snippets must be a mapping');
  const snippets = new Map<string, SnippetDefinition>();
  for (const [id, definition] of Object.entries(config.snippets as Record<string, unknown> ?? {})) {
    const variables = validateSnippetConfig(id, definition);
    const source = explainSegments(loaded, ['snippets', id, 'file']).source.file;
    const file = path.resolve(path.dirname(source), (definition as { file: string }).file);
    const body = await readFile(file, 'utf8');
    if (/^---\r?\n/.test(body)) throw new Error(`${file}: snippets use plain Markdown without page frontmatter`);
    snippets.set(id, { file, tree: parse.parse(body), variables });
  }
  if (config.variables !== undefined && (!config.variables || typeof config.variables !== 'object' || Array.isArray(config.variables))) throw new Error('variables must be a mapping');
  const apiPlan = await materializeApiReferences({
    config, loaded, variants, docs, knownDocumentIds, knownDocumentTypes, authoredOperationIds, routeOwners, basePath, readerFilters, contentFilter, allowRouteCollisions
  });
  const { api, sourceForVariant, knownOperations } = apiPlan;
  const relatedApiTargets = new Map<string, Document[]>();
  const guidesByApi = new Map<string, Document[]>();
  for (const doc of docs.values()) {
    const targets: Document[] = [];
    for (const id of doc.frontmatter.relatedApiReferences ?? []) {
      if (!knownDocumentIds.has(id)) throw new Error(`${doc.file}: unknown related API reference ${id}`);
      if (knownDocumentTypes.get(id) !== 'api-reference') throw new Error(`${doc.file}: related API reference ${id} must identify an api-reference page`);
      const target = docs.get(keyFor(id, doc.variant));
      if (!target) continue;
      targets.push(target);
      const key = keyFor(target.frontmatter.id, target.variant);
      const guides = guidesByApi.get(key) ?? [];
      guides.push(doc);
      guidesByApi.set(key, guides);
    }
    relatedApiTargets.set(keyFor(doc.frontmatter.id, doc.variant), targets);
  }
  const sourceForOperation = (operationId: string, variant: Variant) => {
    const known = knownOperations.get(operationId);
    if (!known) throw new Error(`unknown stable operation ${operationId}`);
    const definition = apiPlan.apiDefinitions[known.apiId];
    const operation = definition?.operations?.find(entry => entry.id === operationId);
    if (!definition || !operation) throw new Error(`unknown stable operation ${operationId}`);
    if (!operation.sourceOperationId) throw new Error(`API ${known.apiId} operation needs sourceOperationId`);
    const binding = sourceForVariant(known.apiId, definition, variant);
    if (!binding) throw new Error(`no OpenAPI source for ${variant.channel}/${variant.version} (${operationId})`);
    return { ...binding, sourceOperationId: operation.sourceOperationId };
  };
  return { docs, knownDocumentIds, knownDocumentTypes, authoredOperationIds, routeOwners, contentDir, snippets,
    apiPlan, api, sourceForVariant, knownOperations, relatedApiTargets, guidesByApi, sourceForOperation };
}
