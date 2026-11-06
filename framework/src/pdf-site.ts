import { createHash } from 'node:crypto';
import type { Document, Variant } from './content-source.js';
import { publicationKey } from './publication-identity.js';
import { preparePdfExport } from './content-export.js';
import { preparePdfDocument, type PreparedPdf } from './pdf-renderer.js';
import { type PdfConfig } from './pdf-config.js';
import { pdfButtonIncludes, pdfDataPath, pdfPageKey, pdfRuntimePath, resolvePdfButton, validatePdfButtonStyle } from './pdf-button.js';
import { sitePath } from './site-path.js';
import { browserPrintAssets } from './browser-print-assets.js';

export type SerializedPreparedPdf = { html: string; assets: Array<{ path: string; mediaType: string; base64: string }>; styleDigest: string };
export type PdfSiteRuntime = { schemaVersion: 1; endpoint: string; config: PdfConfig; pages: Record<string, { documentId: string; publication: Variant; title: string; file: string; digest: string }>; inventory: Record<string, string> };
const digest = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
export const serializePreparedPdf = (prepared: PreparedPdf): SerializedPreparedPdf => ({ html: prepared.html, styleDigest: prepared.styleDigest, assets: [...prepared.assets].map(([path, asset]) => ({ path, mediaType: asset.mediaType, base64: asset.bytes.toString('base64') })) });

export async function buildPdfSiteArtifacts(configFile: string, options: { outputs: unknown; exports?: unknown; documents: Document[]; knownDocumentIds?: ReadonlySet<string>; basePath: string; profile?: string }) {
  const artifacts = new Map<string, string | Buffer>();
  const dependencies = new Set<string>();
  const button = resolvePdfButton(options.outputs);
  if (!button) return { artifacts, dependencies };
  validatePdfButtonStyle(button, options.exports);
  const knownIds = options.knownDocumentIds ?? new Set(options.documents.map(doc => doc.frontmatter.id));
  for (const id of [...button.include ?? [], ...button.exclude ?? []]) if (!knownIds.has(id)) throw new Error(`PDF button selects unknown document ${id}`);
  if (button.mode === 'print') {
    if (!options.documents.some(doc => pdfButtonIncludes(doc, button))) return { artifacts, dependencies };
    return browserPrintAssets(configFile, { basePath: options.basePath, profile: options.profile, style: button.style });
  }
  const selected = options.documents.filter(doc => pdfButtonIncludes(doc, button));
  if (!selected.length) return { artifacts, dependencies };
  const groups = new Map<string, Document[]>();
  for (const doc of selected) { const key = publicationKey(doc.variant); groups.set(key, [...groups.get(key) ?? [], doc]); }
  const runtime: PdfSiteRuntime = { schemaVersion: 1, endpoint: sitePath(options.basePath, button.endpoint), config: {}, pages: {}, inventory: {} };
  for (const docs of groups.values()) {
    const exported = await preparePdfExport(configFile, { profile: options.profile, documents: docs.map(doc => doc.frontmatter.id), publication: docs[0].variant, pdfLinks: 'canonical', pdfStyleTarget: button.style });
    for (const file of exported.inputs) dependencies.add(file);
    const { stylesheet, fonts, logo, ...renderConfig } = exported.input.config;
    runtime.config = renderConfig;
    for (const doc of docs) {
      const document = exported.input.documents.find(item => item.id === doc.frontmatter.id);
      if (!document) throw new Error(`PDF preparation omitted selected document ${doc.frontmatter.id}`);
      const input = { ...exported.input, documents: [document], title: doc.frontmatter.title, config: { ...exported.input.config, cover: false, toc: false } };
      const prepared = await preparePdfDocument(input);
      const key = pdfPageKey(doc.frontmatter.id, doc.variant);
      const file = `${key}.json`;
      const bytes = JSON.stringify(serializePreparedPdf(prepared));
      if (Buffer.byteLength(bytes) > 64 * 1024 * 1024) throw new Error(`Prepared page PDF exceeds 64 MiB: ${doc.frontmatter.id}`);
      const hash = digest(bytes);
      artifacts.set(`${pdfDataPath}/${file}`, bytes);
      runtime.inventory[file] = hash;
      runtime.pages[key] = { documentId: doc.frontmatter.id, publication: doc.variant, title: doc.frontmatter.title, file, digest: hash };
    }
  }
  if (button.mode === 'endpoint') {
    const metadata = JSON.stringify(runtime);
    if (Buffer.byteLength(metadata) > 4 * 1024 * 1024) throw new Error('PDF runtime metadata exceeds 4 MiB');
    artifacts.set(pdfRuntimePath, metadata);
  }
  return { artifacts, dependencies };
}
