import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { isConfigMapping } from './compiler-config.js';
import type { prepareContentWorkspace } from './content-workspace.js';
import type { materializePages } from './page-materialization.js';
import type { Variant } from './content.js';
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const keyFor = (id: string, variant: Variant) => `${id}|${variant.channel}|${variant.version}|${variant.language}`;
export async function reviewApiPublication(configFile: string, apiPlan: Awaited<ReturnType<typeof prepareContentWorkspace>>['apiPlan'], rendered: Awaited<ReturnType<typeof materializePages>>['rendered'], apiEmbedUses: Awaited<ReturnType<typeof materializePages>>['apiEmbedUses'], focusedContracts: Awaited<ReturnType<typeof materializePages>>['focusedContracts'], apiSources: Array<{ apiId: string; sourceUrl: string }>, sourceForOperation: Awaited<ReturnType<typeof prepareContentWorkspace>>['sourceForOperation'], mode?: 'report') {
  const { api, knownOperations, sourceForVariant } = apiPlan;
  // Pin the source bytes and the API selections exposed by public pages. Authored
  // page copy can change without requiring a new review of imported material.
  const apiPublicationReview: Array<{ apiId: string; digest: string; pages: Array<{ id: string; url: string; markdownUrl: string }>; focusedContracts: string[]; fullSources: string[]; inputs: Array<{ source: string; files: Array<{ path: string; digest: string }> }> }> = [];
  for (const [apiId, definition] of Object.entries(apiPlan.apiDefinitions)) {
    const pages = rendered.filter(({ doc }) => {
      const reference = doc.frontmatter.type === 'api-reference' && doc.frontmatter.operations?.some(id => knownOperations.get(id)?.apiId === apiId);
      const embedded = apiEmbedUses.some(use => use.documentKey === keyFor(doc.frontmatter.id, doc.variant) && (use.api === apiId || (use.operation && knownOperations.get(use.operation)?.apiId === apiId)));
      return reference || embedded;
    }).sort((a, b) => a.doc.route.localeCompare(b.doc.route) || keyFor(a.doc.frontmatter.id, a.doc.variant).localeCompare(keyFor(b.doc.frontmatter.id, b.doc.variant)));
    if (!pages.length) continue;
    const bindings = new Map<string, ReturnType<typeof sourceForVariant>>();
    for (const { doc } of pages) {
      const key = `${doc.variant.channel}|${doc.variant.version}`;
      if (!bindings.has(key)) bindings.set(key, sourceForVariant(apiId, definition, doc.variant));
    }
    const inputs: Array<{ source: string; files: Array<{ path: string; digest: string }> }> = [];
    for (const [publication, binding] of [...bindings].sort(([a], [b]) => a.localeCompare(b))) {
      if (!binding) throw new Error(`Missing OpenAPI source for public API ${apiId} ${publication}`);
      const files = await api.collectReferences(binding.file);
      inputs.push({ source: publication, files: await Promise.all(files.map(async file => ({
        path: path.relative(path.dirname(binding.file), file).split(path.sep).join('/'),
        digest: createHash('sha256').update(await readFile(file)).digest('hex')
      }))) });
    }
    const reviewedPages = pages.map(({ doc }) => ({ id: doc.frontmatter.id, url: doc.route, markdownUrl: doc.markdownRoute }));
    const references = pages.filter(({ doc }) => doc.frontmatter.type === 'api-reference').flatMap(({ doc }) =>
      (doc.frontmatter.operations ?? []).filter(id => knownOperations.get(id)?.apiId === apiId).map(id => ({
        channel: doc.variant.channel, version: doc.variant.version, language: doc.variant.language,
        operation: sourceForOperation(id, doc.variant).sourceOperationId
      }))
    ).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    const embeds = apiEmbedUses.filter(use => use.api === apiId || (use.operation && knownOperations.get(use.operation)?.apiId === apiId))
      .map(({ sourceFile, documentKey, ...request }) => request)
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    const contracts = [...new Set(pages.map(({ doc }) => doc.focusedContractUrl).filter((url): url is string => !!url))].sort().map(url => ({ url, digest: focusedContracts.get(url)!.digest }));
    const fullSources = apiSources.filter(source => source.apiId === apiId).map(source => source.sourceUrl).sort();
    const fingerprint = digest(JSON.stringify({ version: 2, apiId, inputs, references, embeds, contracts: contracts.map(item => item.digest), fullSourcePublished: fullSources.length > 0 }));
    const review = definition.publicReview;
    if (review !== undefined && (!isConfigMapping(review) || Object.keys(review).some(key => key !== 'digest') || typeof review.digest !== 'string' || !/^[a-f0-9]{64}$/.test(review.digest))) {
      throw new Error(`apis.${apiId}.publicReview needs a lowercase SHA-256 digest`);
    }
    const reviewDigest = isConfigMapping(review) ? review.digest : undefined;
    apiPublicationReview.push({ apiId, digest: fingerprint, pages: reviewedPages, focusedContracts: contracts.map(item => item.url), fullSources, inputs });
    if (mode !== 'report' && reviewDigest !== fingerprint) {
      throw new Error(`apis.${apiId}.publicReview.digest is ${review ? 'stale' : 'missing'}; run shoalrun api review ${configFile} --output <local-directory>, inspect the candidate site, and pin the reported digest`);
    }
  }
  return apiPublicationReview;
}
