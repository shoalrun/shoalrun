import { createHash } from 'node:crypto';
import { configField, isConfigMapping } from './compiler-config.js';
import { documentKey } from './publication-identity.js';
import { normalizeBasePath, sitePath } from './site-path.js';
import type { Document, Variant } from './content-source.js';

export type PdfButtonConfig = { mode: 'print' | 'endpoint'; label: string; endpoint: string; placement: 'before' | 'after'; style?: string; include?: string[]; exclude?: string[] };
export const pdfRuntimePath = '/pdf-runtime.json';
export const pdfDataPath = '/__shoalrun/pdf-data';

export function resolvePdfButton(outputs: unknown): PdfButtonConfig | undefined {
  const value = configField(configField(outputs, 'html'), 'pdf');
  if (value === undefined || value === false) return undefined;
  if (!isConfigMapping(value) || Object.keys(value).some(key => !['mode', 'label', 'endpoint', 'placement', 'style', 'include', 'exclude'].includes(key))) throw new Error('outputs.html.pdf must be false or a mapping containing mode, label, endpoint, placement, style, include, and exclude');
  const mode = value.mode ?? 'print';
  if (mode !== 'print' && mode !== 'endpoint') throw new Error('outputs.html.pdf.mode must be print or endpoint; site builds do not generate per-page PDFs');
  const label = value.label ?? (mode === 'print' ? 'Print PDF' : 'Download PDF');
  if (typeof label !== 'string' || !label.trim() || label.length > 128) throw new Error('outputs.html.pdf.label must be 1–128 characters');
  const endpoint = value.endpoint ?? '/__shoalrun/pdf';
  if (typeof endpoint !== 'string' || !/^\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/.test(endpoint)) throw new Error('outputs.html.pdf.endpoint must be a same-origin absolute path without query, fragment, or encoded separators');
  if (mode === 'print' && value.endpoint !== undefined) throw new Error('outputs.html.pdf.endpoint requires mode: endpoint');
  const normalizedEndpoint = endpoint.toLowerCase();
  if (['/mcp-runtime.json', '/__shoalrun/mcp-data', pdfRuntimePath, pdfDataPath, '/__shoalrun/ask', '/__shoalrun/search', '/__shoalrun/reload'].some(reserved => normalizedEndpoint === reserved || normalizedEndpoint.startsWith(`${reserved}/`) || reserved.startsWith(`${normalizedEndpoint}/`))) throw new Error('outputs.html.pdf.endpoint overlaps a reserved runtime path');
  if (value.style !== undefined && (typeof value.style !== 'string' || !/^[a-z][a-z0-9-]*$/.test(value.style))) throw new Error('outputs.html.pdf.style must name an export target containing PDF styling');
  const placement = value.placement ?? 'after';
  if (placement !== 'before' && placement !== 'after') throw new Error('outputs.html.pdf.placement must be before or after');
  for (const key of ['include', 'exclude']) if (value[key] !== undefined && (!Array.isArray(value[key]) || (value[key] as unknown[]).some(id => typeof id !== 'string' || !id.trim()) || new Set(value[key] as string[]).size !== (value[key] as string[]).length)) throw new Error(`outputs.html.pdf.${key} must contain unique document IDs`);
  return { mode, label: label.trim(), endpoint, placement, ...(value.style === undefined ? {} : { style: value.style as string }), ...(value.include === undefined ? {} : { include: value.include as string[] }), ...(value.exclude === undefined ? {} : { exclude: value.exclude as string[] }) };
}

export function validatePdfButtonStyle(button: PdfButtonConfig | undefined, exports: unknown): void {
  if (!button?.style) return;
  const target = isConfigMapping(exports) && Object.hasOwn(exports, button.style) ? exports[button.style] : undefined;
  if (!isConfigMapping(target) || !isConfigMapping(target.pdf)) throw new Error(`Unknown PDF button style ${button.style}; define exports.${button.style}.pdf`);
}

export function pdfPageKey(id: string, publication: Variant): string {
  return createHash('sha256').update(documentKey(id, publication)).digest('hex');
}

export function pdfButtonIncludes(doc: Document, button: PdfButtonConfig): boolean {
  return doc.frontmatter.pdf !== false && (!button.include || button.include.includes(doc.frontmatter.id)) && !button.exclude?.includes(doc.frontmatter.id);
}

export function pdfPageAction(doc: Document, outputs: unknown, basePath = ''): { mode: 'print' | 'endpoint'; href?: string; label: string; placement: 'before' | 'after' } | undefined {
  const button = resolvePdfButton(outputs);
  if (!button || !pdfButtonIncludes(doc, button)) return undefined;
  return { mode: button.mode, label: button.label, placement: button.placement, ...(button.mode === 'endpoint' ? { href: `${sitePath(normalizeBasePath(basePath), button.endpoint)}?key=${pdfPageKey(doc.frontmatter.id, doc.variant)}` } : {}) };
}
