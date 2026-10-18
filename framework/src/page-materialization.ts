import type { ComponentRegistry } from './component-plugins.js';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { resolveApiEmbedTree, type ApiEmbedUse } from './api-embeds.js';
import type { ApiShape, NamedExample } from './api.js';
import type { CodeSample } from './code-samples.js';
import type { materializeApiReferences } from './api-publication-plan.js';
import { focusedOpenApi } from './focused-openapi.js';
import { heading, link, list, paragraph, parse, root, text, transformMdx, type Document, type Variant } from './content.js';
import type { OperationNavEntry } from './project-navigation.js';
import type { SnippetDefinition, SnippetUse } from './snippets.js';
import type { ReaderFiltersConfig } from './reader-filters.js';
import type { resolveCalloutTypes } from './callouts.js';
import type { resolveBadgeVariants } from './badges.js';
import { isConfigMapping } from './compiler-config.js';

const generatedReferenceBody = 'This reference is generated from the OpenAPI description. It shows the operation contract; follow any related guides below for task steps and context.\n';
const generatedWebhookBody = 'This webhook reference is generated from the OpenAPI description. The provider sends this event to the receiver.\n';
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const keyFor = (id: string, variant: Variant) => `${id}|${variant.channel}|${variant.version}|${variant.language}`;

type ApiPlan = Awaited<ReturnType<typeof materializeApiReferences>>;
type SourceBinding = NonNullable<ReturnType<ApiPlan['sourceForVariant']>>;

export type MaterializedPage = {
  doc: Document;
  html: string;
  markdown: string;
  sections?: import('./markdown-sections.js').MarkdownSection[];
  htmlTree: unknown;
  pageExamples: NamedExample[];
  pageShapes: ApiShape[];
  pageCurl?: string;
  pageSamples?: CodeSample[];
};

export async function materializePages({ variables, frontmatterConfig, publications, docs, apiPlan, sourceForOperation, snippets, calloutTypes, badgeVariants, componentPlugins, readerFilters, base, publicPath, relatedApiTargets, guidesByApi }: {
  variables: Record<string, unknown>;
  frontmatterConfig: unknown;
  publications: { channels: Record<string, unknown>; versions: Record<string, unknown> };
  docs: Map<string, Document>;
  apiPlan: ApiPlan;
  sourceForOperation: (operationId: string, variant: Variant) => SourceBinding & { sourceOperationId: string };
  snippets: Map<string, SnippetDefinition>;
  calloutTypes: ReturnType<typeof resolveCalloutTypes>;
  badgeVariants: ReturnType<typeof resolveBadgeVariants>;
  componentPlugins?: ComponentRegistry;
  readerFilters?: ReaderFiltersConfig;
  base: string;
  publicPath: (route: string) => string;
  relatedApiTargets: Map<string, Document[]>;
  guidesByApi: Map<string, Document[]>;
}) {
  const { api, queryRules, lifecycleMappings, extensionValue, sourceForVariant, knownOperations } = apiPlan;
  const apiPublications = new Map<string, { apiId: string; variant: Variant; sourceFile: string; endpoint?: string; referenceUrl: string; sourceUrl: string; mediaType: string }>();
  const focusedContracts = new Map<string, { content: string; bytes: number; digest: string }>();
  const navigationEntries = new Map<string, OperationNavEntry[]>();
  const navigationTagOrder = new Map<string, Map<string, string[]>>();
  const rendered: MaterializedPage[] = [];
  const snippetUses: SnippetUse[] = [];
  const apiEmbedUses: ApiEmbedUse[] = [];
  const operations: Record<string, Array<{ id: string; type: string; channel: string; version: string; language: string; url: string; markdownUrl: string; focusedContractUrl?: string }>> = {};
  for (const doc of docs.values()) {
    let pageExamples: NamedExample[] = [];
    let pageShapes: ApiShape[] = [];
    let pageCurl: string | undefined;
    let pageSamples: CodeSample[] | undefined;
    const local = new Map<string, Document>();
    for (const other of docs.values()) if (keyFor(other.frontmatter.id, doc.variant) === keyFor(other.frontmatter.id, other.variant)) local.set(other.frontmatter.id, other);
    const parsed = parse.parse(doc.body);
    const tree = await resolveApiEmbedTree(transformMdx(parsed, doc, local, snippets, variables, snippetUses, calloutTypes, base, readerFilters, frontmatterConfig, publications, badgeVariants, componentPlugins), api, operationId => sourceForOperation(operationId, doc.variant), apiId => {
      const definition = apiPlan.apiDefinitions[apiId];
      if (!definition) throw new Error(`unknown API ${apiId}`);
      const binding = sourceForVariant(apiId, definition, doc.variant);
      if (!binding) throw new Error(`no OpenAPI source for ${doc.variant.channel}/${doc.variant.version} (${apiId})`);
      return binding;
    }, keyFor(doc.frontmatter.id, doc.variant), apiEmbedUses);
    let blocks = tree.children;
    if (doc.frontmatter.type === 'api-reference') {
      if (doc.frontmatter.operations?.length !== 1) throw new Error(`${doc.file}: API reference needs exactly one stable operation ID`);
      const operationId = doc.frontmatter.operations[0];
      const binding = sourceForOperation(operationId, doc.variant);
      if (knownOperations.get(operationId)?.reference !== doc.frontmatter.id) throw new Error(`${doc.file}: reference binding disagrees with registry`);
      const { source, publicationIndex, file: sourceFile } = binding;
      if (source.focused !== undefined && typeof source.focused !== 'boolean') throw new Error(`${doc.file}: source.focused must be true or false`);
      // Generated pages open with a provenance line; HTML shows it as a quiet note beside the download link.
      if ((doc.body === generatedReferenceBody || doc.body === generatedWebhookBody) && blocks[0]?.type === 'paragraph') blocks = [{ ...blocks[0], data: { ...blocks[0].data, hProperties: { className: ['api-provenance'] } } }, ...blocks.slice(1)];
      const generated = await api.operation(sourceFile, binding.sourceOperationId, operationId, queryRules.get(binding.apiId), doc.frontmatter.title);
      doc.endpoint = { method: generated.method, path: generated.route, webhook: generated.webhook };
      const mapping = lifecycleMappings.get(binding.apiId);
      const sourceDescription = mapping ? await api.load(sourceFile) : undefined;
      const initialPathItem = sourceDescription?.value[generated.webhook ? 'webhooks' : 'paths']?.[generated.route];
      const pathItem = initialPathItem?.$ref && sourceDescription ? (await api.ref(sourceDescription, initialPathItem.$ref)).value : initialPathItem;
      const rawLifecycle = mapping ? extensionValue(pathItem?.[generated.method], mapping.from) : undefined;
      const mapped = mapping && (typeof rawLifecycle === 'string' || typeof rawLifecycle === 'number' || typeof rawLifecycle === 'boolean') && Object.hasOwn(mapping.values, String(rawLifecycle)) ? mapping.values[String(rawLifecycle)] : undefined;
      if (mapped && !generated.deprecated && !doc.frontmatter.subjectLifecycle) doc.frontmatter.subjectLifecycle = mapped;
      const navVariant = `${doc.variant.channel}|${doc.variant.version}|${doc.variant.language}`;
      const entries = navigationEntries.get(navVariant) ?? [];
      entries.push({ id: operationId, apiId: binding.apiId, documentId: doc.frontmatter.id, title: doc.frontmatter.title, tag: generated.tags[0] ?? (generated.webhook ? 'Webhooks' : 'Other'), search: `${generated.webhook ? 'webhook' : generated.method.toUpperCase()} ${generated.route} ${binding.sourceOperationId} ${operationId}` });
      navigationEntries.set(navVariant, entries);
      const tagOrder = navigationTagOrder.get(navVariant) ?? new Map<string, string[]>();
      if (!tagOrder.has(binding.apiId)) {
        const rawTags: unknown = (await api.load(sourceFile)).value.tags;
        const names = Array.isArray(rawTags) ? (rawTags as unknown[]).map(tag => isConfigMapping(tag) ? tag.name : undefined).filter((name): name is string => typeof name === 'string') : [];
        tagOrder.set(binding.apiId, names);
      }
      navigationTagOrder.set(navVariant, tagOrder);
      if (generated.deprecated) {
        if (doc.frontmatter.subjectLifecycle && doc.frontmatter.subjectLifecycle !== 'deprecated') throw new Error(`${doc.file}: OpenAPI-deprecated operation cannot use ${doc.frontmatter.subjectLifecycle} subjectLifecycle`);
        doc.frontmatter.subjectLifecycle = 'deprecated';
      }
      pageExamples = generated.examples;
      pageShapes = generated.shapes;
      pageCurl = generated.curl;
      pageSamples = generated.samples;
      if (source.focused === true || source.publish === true) {
        const coordinates = [doc.variant.channel, doc.variant.version, doc.variant.language];
        if (coordinates.some(value => !/^[A-Za-z0-9._-]+$/.test(value))) throw new Error(`${doc.file}: unsafe publication coordinate for focused contract`);
        const name = operationId.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'operation';
        const focusedContent = JSON.stringify(await focusedOpenApi(api, sourceFile, binding.sourceOperationId), null, 2) + '\n';
        const focusedDigest = digest(focusedContent);
        const focusedUrl = publicPath(`/api/operations/${coordinates.join('/')}/${name}-${focusedDigest}.json`);
        if (focusedContracts.has(focusedUrl)) throw new Error(`Duplicate focused contract ${focusedUrl}`);
        focusedContracts.set(focusedUrl, { content: focusedContent, bytes: Buffer.byteLength(focusedContent), digest: focusedDigest });
        doc.focusedContractUrl = focusedUrl;
        blocks.push({ ...paragraph(text('OpenAPI for this operation: '), link(focusedUrl, 'Download JSON'), text('.')), data: { hProperties: { className: ['api-provenance'] } } });
      }
      blocks = [...blocks, ...generated.blocks];
      if (source.publish === true) {
        const id = binding.apiId;
        if (!/^[a-z0-9.-]+$/i.test(id)) throw new Error(`API ID ${id} is unsafe for a public path`);
        const extension = path.extname(sourceFile).toLowerCase();
        if (!['.yaml', '.yml', '.json'].includes(extension)) throw new Error(`Published API source needs YAML or JSON extension: ${sourceFile}`);
        const sourceUrl = publicPath(`/api/${id}/${doc.variant.channel}/${doc.variant.version}/${path.basename(sourceFile)}`);
        const endpoint = (publicationIndex >= 0 ? binding.definition.publications?.[publicationIndex].discovery?.endpoint : undefined) ?? binding.definition.discovery?.endpoint;
        const recordKey = `${id}|${doc.variant.channel}|${doc.variant.version}`;
        if (!apiPublications.has(recordKey)) apiPublications.set(recordKey, { apiId: id, variant: doc.variant, sourceFile, endpoint, referenceUrl: doc.route, sourceUrl, mediaType: extension === '.json' ? 'application/json' : 'application/yaml' });
      }
    }
    for (const operationId of doc.frontmatter.operations ?? []) {
      if (!knownOperations.has(operationId)) throw new Error(`${doc.file}: unknown operation ${operationId}`);
      (operations[operationId] ??= []).push({ id: doc.frontmatter.id, type: doc.frontmatter.type, ...doc.variant, url: doc.route, markdownUrl: doc.markdownRoute, ...(doc.focusedContractUrl ? { focusedContractUrl: doc.focusedContractUrl } : {}) });
    }
    const apiTargets = relatedApiTargets.get(keyFor(doc.frontmatter.id, doc.variant)) ?? [];
    const apiGuides = guidesByApi.get(keyFor(doc.frontmatter.id, doc.variant)) ?? [];
    const explicit = new Set([...apiTargets, ...apiGuides]);
    const related = [...local.values()].filter(other => other !== doc && !explicit.has(other) && other.frontmatter.operations?.some(id => doc.frontmatter.operations?.includes(id)));
    if (related.length) blocks = [...blocks, heading(2, 'Related documentation'), list(related.map(other => [paragraph(link(other.route, other.frontmatter.title), text(` — ${other.frontmatter.summary}`))]))];
    if (apiTargets.length) blocks = [...blocks, heading(2, 'Related API references'), list(apiTargets.map(other => [paragraph(link(other.route, other.frontmatter.title), text(` — ${other.frontmatter.summary}`))]))];
    if (apiGuides.length) blocks = [...blocks, heading(2, 'Related guides'), list(apiGuides.map(other => [paragraph(link(other.route, other.frontmatter.title), text(` — ${other.frontmatter.summary}`))]))];
    doc.tree = root(blocks);
    rendered.push({ doc, html: '', htmlTree: null, pageExamples, pageShapes, pageCurl, pageSamples, markdown: '' });
  }
  return { apiPublications, focusedContracts, navigationEntries, navigationTagOrder, rendered, snippetUses, apiEmbedUses, operations };
}
