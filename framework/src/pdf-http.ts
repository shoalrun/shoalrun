import { createHash } from 'node:crypto';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { pdfDataPath, pdfRuntimePath } from './pdf-button.js';
import { renderPreparedPdf, type PreparedPdf } from './pdf-renderer.js';
import { validatePdfConfig, type PdfConfig } from './pdf-config.js';

type Page = { documentId: string; publication: { product?: string; channel: string; version: string; language: string }; title: string; file: string; digest: string };
export type PdfRuntime = { schemaVersion: 1; endpoint: string; config: PdfConfig; pages: Record<string, Page>; inventory: Record<string, string> };
export type LoadedPdfRuntime = { runtime: PdfRuntime; directory: string };
const digest = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const hex = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const record = (value: unknown): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value);
const maxPreparedBytes = 64 * 1024 * 1024;
const safePath = (file: string) => !!file && !file.startsWith('/') && !/[\\\0:]/.test(file) && !file.split('/').some(part => !part || part === '.' || part === '..');
const within = (root: string, file: string) => file.startsWith(root + path.sep);

async function boundedRead(file: string, max: number): Promise<Buffer> {
  const info = await stat(file);
  if (!info.isFile() || info.size > max) throw new Error('Invalid or oversized PDF runtime resource');
  const bytes = await readFile(file);
  if (bytes.length > max) throw new Error('Oversized PDF runtime resource');
  return bytes;
}

export async function loadPdfRuntime(directory: string): Promise<LoadedPdfRuntime | undefined> {
  const siteRoot = await realpath(directory);
  const metadata = path.join(siteRoot, pdfRuntimePath.slice(1));
  let file: string;
  try { file = await realpath(metadata); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return; throw error; }
  if (!within(siteRoot, file)) throw new Error('PDF runtime escapes the built site');
  const runtime = JSON.parse((await boundedRead(file, 4 * 1024 * 1024)).toString('utf8')) as PdfRuntime;
  if (!record(runtime) || runtime.schemaVersion !== 1 || typeof runtime.endpoint !== 'string' || !/^\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/.test(runtime.endpoint) || !record(runtime.pages) || !record(runtime.inventory)) throw new Error('Invalid PDF runtime metadata; rebuild the site');
  runtime.config = validatePdfConfig(runtime.config);
  const root = await realpath(path.join(siteRoot, pdfDataPath.slice(1)));
  if (!within(siteRoot, root)) throw new Error('PDF runtime data escapes the built site');
  for (const [key, page] of Object.entries(runtime.pages)) {
    if (!hex(key) || !record(page) || typeof page.documentId !== 'string' || !page.documentId || typeof page.title !== 'string' || typeof page.file !== 'string' || !safePath(page.file) || !hex(page.digest) || runtime.inventory[page.file] !== page.digest || !record(page.publication) || ['channel', 'version', 'language'].some(name => typeof (page.publication as any)[name] !== 'string') || page.publication.product !== undefined && typeof page.publication.product !== 'string') throw new Error('Invalid PDF page inventory');
  }
  for (const [name, hash] of Object.entries(runtime.inventory)) {
    if (!safePath(name) || !hex(hash)) throw new Error('Invalid PDF inventory path');
    const resource = await realpath(path.join(root, name));
    if (!within(root, resource) || digest(await boundedRead(resource, maxPreparedBytes)) !== hash) throw new Error('PDF resource integrity mismatch');
  }
  return { runtime, directory: root };
}

const failure = (status: number, message: string) => new Response(JSON.stringify({ error: message }), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...(status === 429 ? { 'Retry-After': '60' } : {}) } });

/** Mount behind the same authentication as the built site. This handler does not grant access to other profiles. */
export function createPdfHttpHandler(input: LoadedPdfRuntime, options: {
  authorize?: (request: Request) => boolean | Promise<boolean>;
  render?: (prepared: PreparedPdf, config: PdfConfig) => Promise<{ bytes: Buffer | Uint8Array }>;
  now?: () => number;
} = {}) {
  let active = false;
  let windowStart = 0;
  let attempts = 0;
  const now = options.now ?? Date.now;
  const render = options.render ?? renderPreparedPdf;
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    if (url.pathname !== input.runtime.endpoint) return failure(404, 'Unknown PDF endpoint');
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD', 'Cache-Control': 'no-store' } });
    if (request.headers.get('sec-fetch-site') === 'cross-site' || request.headers.has('origin') && request.headers.get('origin') !== url.origin) return failure(403, 'PDF origin is not allowed');
    try { if (options.authorize && !await options.authorize(request)) return failure(403, 'PDF access is not allowed'); }
    catch { return failure(503, 'PDF authorization is unavailable'); }
    const keys = [...url.searchParams.keys()];
    const key = url.searchParams.get('key');
    if (keys.length !== 1 || keys[0] !== 'key' || !hex(key) || !Object.hasOwn(input.runtime.pages, key)) return failure(404, 'Unknown PDF page');
    const page = input.runtime.pages[key];
    if (request.method === 'HEAD') return new Response(null, { headers: { 'Content-Type': 'application/pdf', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
    const time = now();
    if (time - windowStart >= 60_000) { windowStart = time; attempts = 0; }
    if (active || attempts >= 10) return failure(429, 'PDF generation is busy. Try again shortly.');
    attempts++;
    active = true;
    try {
      const file = await realpath(path.join(input.directory, page.file));
      if (!within(input.directory, file)) throw new Error('Invalid PDF resource');
      const bytes = await boundedRead(file, maxPreparedBytes);
      if (digest(bytes) !== page.digest) throw new Error('PDF resource integrity mismatch');
      const prepared = hydratePreparedPdf(JSON.parse(bytes.toString('utf8')));
      const result = await render(prepared, input.runtime.config);
      const filename = page.documentId.replace(/[^A-Za-z0-9_.-]/g, '-').slice(0, 100) || 'page';
      return new Response(new Uint8Array(result.bytes), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${filename}.pdf"`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
    } catch { return failure(503, 'PDF generation failed. Check the server browser setup and rebuild the PDF inputs if needed.'); }
    finally { active = false; }
  };
}

export function hydratePreparedPdf(value: unknown): PreparedPdf {
  if (!record(value) || typeof value.html !== 'string' || Buffer.byteLength(value.html) > maxPreparedBytes || !hex(value.styleDigest) || !Array.isArray(value.assets) || value.assets.length > 10000) throw new Error('Invalid prepared PDF');
  const assets: PreparedPdf['assets'] = new Map();
  let total = Buffer.byteLength(value.html);
  for (const asset of value.assets) {
    if (!record(asset) || typeof asset.path !== 'string' || !asset.path.startsWith('/') || !safePath(asset.path.slice(1)) || assets.has(asset.path) || !['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif', 'image/svg+xml', 'font/woff', 'font/woff2', 'font/ttf', 'font/otf'].includes(asset.mediaType) || typeof asset.base64 !== 'string' || /[^A-Za-z0-9+/=]/.test(asset.base64)) throw new Error('Invalid prepared PDF asset');
    const bytes = Buffer.from(asset.base64, 'base64');
    if (bytes.toString('base64') !== asset.base64) throw new Error('Invalid prepared PDF asset encoding');
    total += bytes.length;
    if (bytes.length > 32 * 1024 * 1024 || total > maxPreparedBytes) throw new Error('Prepared PDF assets exceed 64 MiB');
    assets.set(asset.path, { bytes, mediaType: asset.mediaType });
  }
  return { html: value.html, assets, styleDigest: value.styleDigest };
}
