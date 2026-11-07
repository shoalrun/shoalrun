import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { pruneConditionalTree } from './conditional-tree.js';
import { evaluateFeatureGuard } from './deployment-profile.js';
import { matchesSectionContentFilter } from './content-filter.js';
import { validateReaderSelection, type ReaderFiltersConfig, type ReaderSelection } from './reader-filters.js';
import type { CompilerPublicationsConfig } from './compiler-config.js';
import type { Document } from './content-source.js';
import { documentKey } from './publication-identity.js';

export type SectionSelection = {
  facets?: ReaderFiltersConfig; selection?: ReaderSelection;
  decisions: Map<string, Record<string, unknown>>;
  warnings: Map<string, { code: string; message: string }>;
  hasConditions: boolean;
  publications?: CompilerPublicationsConfig;
};
export function createSectionSelection(facets?: ReaderFiltersConfig, selection?: ReaderSelection, publications?: CompilerPublicationsConfig): SectionSelection {
  return { facets, selection, publications, decisions: new Map(), warnings: new Map(), hasConditions: false };
}
/** Share publication validation with pruning so receipts reflect every build-time ancestor. */
export function evaluatePublicationGuard(node: any, doc: Document, file: string, publications?: CompilerPublicationsConfig): boolean | undefined {
  if (node.name !== 'ForPublication') return;
  const attributes = node.attributes ?? [];
  const allowed = ['product', 'channel', 'version', 'language'];
  if (node.type !== 'mdxJsxFlowElement' || !node.children?.length || !attributes.length || attributes.some((item: any) => item.type !== 'mdxJsxAttribute' || typeof item.value !== 'string' || !allowed.includes(item.name) || !item.value.trim()) || new Set(attributes.map((item: any) => item.name)).size !== attributes.length) throw new Error(`${file}: <ForPublication> needs block content and distinct literal product, channel, version, or language attributes`);
  const product = attributes.find((item: any) => item.name === 'product')?.value ?? doc.variant.product;
  for (const item of attributes) {
    const catalog = item.name === 'product' ? publications?.products : item.name === 'channel' ? publications?.channels : item.name === 'version' ? (product ? publications?.products?.[product]?.versions : publications?.versions) : undefined;
    if (publications && item.name !== 'language' && (!catalog || !Object.hasOwn(catalog, item.value))) throw new Error(`${file}: <ForPublication> names unknown ${item.name} ${item.value}`);
  }
  return !attributes.some((item: any) => doc.variant[item.name as keyof typeof doc.variant] !== item.value);
}
export function pruneSelectedTree(tree: any, doc: Document, file = doc.file, record = true): any {
  const context = doc.sectionSelection;
  return pruneConditionalTree(tree, (node, ancestorIncluded) => {
    if (node.name === 'ForPublication') return evaluatePublicationGuard(node, doc, file, context?.publications);
    if (node.name === 'ForFeature') return evaluateFeatureGuard(node, doc.featureContext, file, ancestorIncluded, record);
    if (node.name !== 'ForFacet') return;
    const label = `${file}:${node.position?.start?.line ?? 1}: <ForFacet>`;
    const attributes = node.attributes ?? [];
    if (node.type !== 'mdxJsxFlowElement' || !node.children?.length || !attributes.length || attributes.some((item: any) => item.type !== 'mdxJsxAttribute' || typeof item.value !== 'string' || !item.value.trim()) || new Set(attributes.map((item: any) => item.name)).size !== attributes.length) throw new Error(`${label} needs block content and distinct nonempty literal facet attributes`);
    if (!context?.facets) throw new Error(`${label} needs configured readerFilters.facets`);
    const requirements = validateReaderSelection(Object.fromEntries(attributes.map((item: any) => [item.name, item.value.trim().split(/\s+/)])), context.facets, label);
    context.hasConditions = true;
    const match = matchesSectionContentFilter(requirements, context.selection);
    if (record) {
      const line = node.position?.start?.line ?? 1;
      const key = JSON.stringify([documentKey(doc.frontmatter.id, doc.variant), file, line, requirements, ancestorIncluded]);
      context.decisions.set(key, { documentId: doc.frontmatter.id, publication: doc.variant, source: file, line, requirements, localMatch: match, included: ancestorIncluded && match, reason: !ancestorIncluded ? 'ancestor-excluded' : match ? 'matched' : 'facet-mismatch' });
    }
    return match;
  });
}
export function warnReaderSection(doc: Document, file: string, line: number, requirements: ReaderSelection): void {
  const context = doc.sectionSelection;
  if (!context?.selection) return;
  const overlap = Object.keys(requirements).filter(facet => context.selection?.[facet]);
  if (!overlap.length) return;
  const key = JSON.stringify([file, line, overlap]);
  if (context.warnings.has(key)) return;
  const message = `${file}:${line}: <ReaderSection> uses build-selected facet(s) ${overlap.join(', ')} but only changes reader visibility; its content remains in the output. Use <ForFacet> to omit unmatched content during this build.`;
  context.warnings.set(key, { code: 'reader-section-build-facet', message });
  process.stderr.write(`warning [reader-section-build-facet] ${message}\n`);
}
export function sectionSelectionReport(context: SectionSelection) {
  return { selection: context.selection ?? null, decisions: [...context.decisions.values()], warnings: [...context.warnings.values()] };
}
/** Keep receipts private, atomic, and keyed by artifact so nested exports can't replace a site's record. */
export async function writeSectionSelectionReport(base: string, context: SectionSelection, artifact: Record<string, unknown>): Promise<void> {
  const folder = path.join(base, '.shoalrun');
  await mkdir(folder, { recursive: true });
  const file = path.join(folder, 'content-selection.json');
  const key = createHash('sha256').update(JSON.stringify(artifact.target)).digest('hex');
  const receipt = { schemaVersion: 1, ...artifact, ...sectionSelectionReport(context) };
  const receipts = path.join(folder, 'content-selection');
  await mkdir(receipts, { recursive: true });
  const atomic = async (destination: string, value: unknown) => {
    const temporary = path.join(folder, `.content-selection-${randomUUID()}.json`);
    try { await writeFile(temporary, JSON.stringify(value, null, 2) + '\n'); await rename(temporary, destination); }
    finally { await rm(temporary, { force: true }); }
  };
  await atomic(path.join(receipts, key + '.json'), receipt);
  await atomic(file, { ...receipt, receipt: `content-selection/${key}.json` });
}
