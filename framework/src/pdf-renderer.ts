import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import puppeteer from 'puppeteer-core';
import { parseFragment } from 'parse5';
import { validatePdfConfig, type PdfConfig } from './pdf-config.js';
import { validateExportSvg } from './content-export-assets.js';
import { validatePrintStylesheet } from './pdf-stylesheet.js';

export type PdfDocumentInput = { documents: Array<{ id: string; title: string; html: string }>; title: string; publication?: Record<string, unknown>; assets: Map<string, string | Buffer>; publicBase: string; config: PdfConfig; configFile: string; assetRoots?: string[] };
export type PdfRenderInput = PdfDocumentInput;
export type PreparedPdf = { html: string; assets: Map<string, { bytes: Buffer; mediaType: string }>; styleDigest: string };
export type PdfResult = { bytes: Buffer; metadata: { engine: string; browserVersion: string; styleDigest: string; assets: Array<{ path: string; digest: string }> } };
const digest = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const cssText = (value: string) => JSON.stringify(value).replace(/</g, '\\3c ');
const origin = 'https://pdf.shoalrun.invalid';
const media: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.avif': 'image/avif', '.svg': 'image/svg+xml', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf' };
const baseCss = `:root{--pdf-accent:#225449;--pdf-text:#172722;--pdf-muted:#53665e;--pdf-font:Arial,sans-serif;--pdf-code-font:monospace;--code-foreground:#172722;--code-token-comment:#53665e;--code-token-punctuation:#172722;--code-token-keyword:#7144a0;--code-token-string:#225449;--code-token-string-expression:#225449;--code-token-constant:#855b12;--code-token-function:#145880;--code-token-parameter:#644479;--code-token-link:#225449}*{box-sizing:border-box}body{margin:0;color:var(--pdf-text);font:11pt/1.5 var(--pdf-font)}h1,h2,h3,h4,h5,h6{color:var(--pdf-accent);line-height:1.2;break-after:avoid}h1{font-size:28pt}h2{font-size:20pt}h3{font-size:15pt}a{color:var(--pdf-accent);text-decoration:underline;overflow-wrap:anywhere}p,li{orphans:3;widows:3}img,svg{max-width:100%;height:auto}figure{margin:1em 0}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:9pt/1.5 var(--pdf-code-font);background:#f1f4f2;padding:12pt;border:1px solid #d5dfd9}code{font-family:var(--pdf-code-font)}table{border-collapse:collapse;width:100%;font-size:9pt;table-layout:fixed;overflow-wrap:anywhere}th,td{border:1px solid #c7d2cb;padding:6pt;text-align:left;vertical-align:top}thead{display:table-header-group}tr{break-inside:avoid}blockquote{border-left:3pt solid var(--pdf-accent);margin:1em 0;padding-left:12pt}summary{font-weight:bold}details{display:block}.pdf-cover{break-after:page;padding-top:24%;min-height:60vh}.pdf-cover h1{font-size:38pt}.pdf-logo{display:block;max-width:180pt;max-height:80pt;object-fit:contain;margin-bottom:28pt}.pdf-subtitle{font-size:16pt;color:var(--pdf-muted)}.pdf-publication{color:var(--pdf-muted)}.pdf-toc{break-after:page}.pdf-toc li{margin:5pt 0}.pdf-chapter+.pdf-chapter{break-before:page}hr{border:0;border-top:1px solid #c7d2cb;margin:18pt 0}@media print{*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`;
async function readLocal(file: string, roots: string[], max: number) {
  const resolved = await realpath(file);
  if (!roots.some(root => resolved === root || resolved.startsWith(root + path.sep))) throw new Error(`PDF file escapes asset roots: ${file}`);
  if (resolved.split(path.sep).some(part => /^\.env(?:\.|$)|^\.git$|^(?:PROJECT|DEPLOYMENT)\.local\.md$|^AGENTS\.override\.md$/i.test(part))) throw new Error('Private local files cannot be PDF assets');
  const info = await stat(resolved);
  if (!info.isFile() || info.size > max) throw new Error(`PDF file must be regular and at most ${max} bytes: ${file}`);
  return readFile(resolved);
}
export async function preparePdfDocument(input: PdfDocumentInput): Promise<PreparedPdf> {
  const config = validatePdfConfig(input.config);
  if (!input.documents.length || input.documents.length > 10000) throw new Error('PDF export needs 1–10000 documents');
  const base = path.dirname(path.resolve(input.configFile));
  const roots = await Promise.all([base, ...(input.assetRoots ?? []).map(root => path.resolve(base, root))].map(root => realpath(root)));
  const assets: PreparedPdf['assets'] = new Map();
  // A page preparation can share the publication's asset registry. Carry only
  // resources referenced by the selected print content into its private payload.
  const referencedImages = new Set<string>();
  const collectImages = (node: any) => {
    if (node.tagName === 'img') {
      const source = node.attrs?.find((attr: any) => attr.name === 'src')?.value;
      if (source) {
        const url = new URL(source, origin);
        if (url.origin === origin) referencedImages.add(url.pathname);
      }
    }
    for (const child of node.childNodes ?? []) collectImages(child);
  };
  for (const doc of input.documents) collectImages(parseFragment(doc.html));
  for (const [file, content] of input.assets) {
    const type = media[path.extname(file).toLowerCase()];
    if (!type) continue;
    const url = new URL(`${input.publicBase}${file}`, origin);
    if (url.origin !== origin) throw new Error('PDF publicBase must be a local URL path');
    if (!referencedImages.has(url.pathname)) continue;
    const bytes = Buffer.isBuffer(content) ? content : Buffer.from(content);
    if (bytes.length > 32 * 1024 * 1024) throw new Error(`PDF asset too large: ${file}`);
    if (type === 'image/svg+xml') validateExportSvg(bytes.toString('utf8'));
    assets.set(url.pathname, { bytes, mediaType: type });
  }
  let css = baseCss;
  for (const font of config.fonts ?? []) {
    const extension = path.extname(font.source).toLowerCase();
    if (!['.woff', '.woff2', '.ttf', '.otf'].includes(extension)) throw new Error('PDF fonts must use woff, woff2, ttf, or otf files');
    const bytes = await readLocal(path.resolve(base, font.source), roots, 16 * 1024 * 1024);
    const url = `/__pdf_fonts/${digest(bytes)}${extension}`;
    assets.set(url, { bytes, mediaType: media[extension] });
    css += `\n@font-face{font-family:${cssText(font.family)};src:url("${url}");font-weight:${font.weight ?? 'normal'};font-style:${font.style ?? 'normal'};font-display:block}`;
  }
  if (config.stylesheet) {
    const custom = (await readLocal(path.resolve(base, config.stylesheet), roots, 1024 * 1024)).toString('utf8');
    // CSS is local styling, not a resource loader. Fonts have explicit registrations.
    validatePrintStylesheet(custom);
    css += '\n' + custom;
  }
  let logo = '';
  if (config.logo) {
    const extension = path.extname(config.logo).toLowerCase();
    const type = media[extension];
    if (!type?.startsWith('image/')) throw new Error('PDF logo must be a local image');
    const bytes = await readLocal(path.resolve(base, config.logo), roots, 32 * 1024 * 1024);
    if (type === 'image/svg+xml') validateExportSvg(bytes.toString('utf8'));
    const url = `/__pdf_logo/${digest(bytes)}${extension}`;
    assets.set(url, { bytes, mediaType: type });
    logo = `<img class="pdf-logo" src="${url}" alt="">`;
  }
  const title = escape(input.title);
  const publication = input.publication ? escape(Object.entries(input.publication).filter(([, value]) => value !== undefined).map(([key, value]) => `${key}: ${String(value)}`).join(' · ')) : '';
  const cover = config.cover ? `<section class="pdf-cover">${logo}<h1>${title}</h1>${config.subtitle ? `<p class="pdf-subtitle">${escape(config.subtitle)}</p>` : ''}${publication ? `<p class="pdf-publication">${publication}</p>` : ''}</section>` : '';
  const toc = config.toc ? `<nav class="pdf-toc" aria-label="Contents"><h1>Contents</h1><ol>${input.documents.map((doc, index) => `<li><a href="#pdf-document-${index + 1}">${escape(doc.title)}</a></li>`).join('')}</ol></nav>` : '';
  // Validate resource references before CSP can silently suppress a missing image.
  for (const doc of input.documents) {
    const check = (node: any) => {
      if (['script', 'iframe', 'object', 'embed', 'link', 'base', 'form', 'style', 'meta', 'audio', 'video'].includes(node.tagName)) throw new Error('PDF input must be passive HTML');
      for (const attr of node.attrs ?? []) {
        if (/^on/i.test(attr.name)) throw new Error('PDF input must not contain event handlers');
        if (attr.name === 'src' || attr.name === 'srcset') {
          if (attr.name === 'srcset') throw new Error('PDF images must use one explicit local src');
          const url = new URL(attr.value, origin);
          if (url.origin !== origin || !assets.has(url.pathname) || url.search || url.hash) throw new Error(`PDF requires a registered offline asset: ${attr.value}`);
        }
      }
      for (const child of node.childNodes ?? []) check(child);
    };
    check(parseFragment(doc.html));
  }
  if ([...assets.values()].reduce((total, asset) => total + asset.bytes.length, 0) > 64 * 1024 * 1024) throw new Error('PDF assets exceed 64 MiB');
  const body = input.documents.map((doc, index) => `<article class="pdf-chapter" id="pdf-document-${index + 1}" data-document-id="${escape(doc.id)}">${doc.html}</article>`).join('\n');
  const html = `<!doctype html><html lang="${escape(String(input.publication?.language ?? 'en'))}"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self'; font-src 'self'; style-src 'unsafe-inline'; script-src 'none'; base-uri 'none'"><link rel="icon" href="/favicon.ico"><title>${title}</title><style>${css}</style></head><body>${cover}${toc}${body}</body></html>`;
  if (Buffer.byteLength(html) > 64 * 1024 * 1024) throw new Error('PDF print document exceeds 64 MiB');
  return { html, assets, styleDigest: digest(css) };
}
function template(value: string | undefined) {
  if (!value) return '<span></span>';
  return `<div style="width:100%;font:9px Arial,sans-serif;color:#555;padding:0 36px;text-align:center">${escape(value).replace(/\{title\}/g, '<span class="title"></span>').replace(/\{page\}/g, '<span class="pageNumber"></span>').replace(/\{pages\}/g, '<span class="totalPages"></span>')}</div>`;
}
/** Resolve only synthetic print resources; never continue a browser request. */
export function pdfRequestResponse(prepared: PreparedPdf, address: string, type: string, navigation: boolean, method = 'GET'): { status: number; contentType?: string; body?: string | Buffer } | undefined {
  const url = new URL(address);
  if (method !== 'GET' || url.origin !== origin || url.username || url.password || url.search || url.hash) return undefined;
  if (url.pathname === '/__print' && navigation && type === 'document') return { status: 200, contentType: 'text/html', body: prepared.html };
  // Chromium may request its favicon automatically after navigation. Fulfill only
  // this exact synthetic route without granting access to any external resource.
  if (url.pathname === '/favicon.ico' && !navigation && ['image', 'other'].includes(type)) return { status: 204, body: '' };
  const resource = !navigation ? prepared.assets.get(url.pathname) : undefined;
  if (resource && (type === 'image' && resource.mediaType.startsWith('image/') || type === 'font' && resource.mediaType.startsWith('font/'))) return { status: 200, contentType: resource.mediaType, body: resource.bytes };
  return undefined;
}
export async function renderPreparedPdf(prepared: PreparedPdf, settings: PdfConfig): Promise<PdfResult> {
  const config = validatePdfConfig(settings);
  const executablePath = config.executablePath ?? process.env.SHOALRUN_PDF_BROWSER ?? process.env.PUPPETEER_EXECUTABLE_PATH;
  if (!executablePath) throw new Error('PDF export needs Chrome/Chromium. Set SHOALRUN_PDF_BROWSER or pdf.executablePath to its executable; no browser is downloaded automatically.');
  const timeout = config.timeout ?? 30000;
  const browser = await puppeteer.launch({ executablePath, headless: true, timeout, protocolTimeout: timeout });
  let timedOut = false;
  const deadline = setTimeout(() => { timedOut = true; void browser.close().catch(() => {}); }, timeout);
  deadline.unref();
  try {
    const page = await browser.newPage();
    await page.setJavaScriptEnabled(false);
    await page.setBypassServiceWorker(true);
    await page.setRequestInterception(true);
    const rejected = new Set<string>();
    page.on('request', request => {
      const response = pdfRequestResponse(prepared, request.url(), request.resourceType(), request.isNavigationRequest(), request.method());
      if (response) void request.respond(response).catch(() => {});
      else { rejected.add(request.url()); void request.abort('blockedbyclient').catch(() => {}); }
    });
    await page.goto(`${origin}/__print`, { waitUntil: 'networkidle0', timeout });
    if (rejected.size) throw new Error(`PDF requires offline assets; blocked resource: ${[...rejected][0]}`);
    const missingImages = await page.evaluate(() => [...document.images].some(image => !image.complete || !image.naturalWidth));
    if (missingImages) throw new Error('PDF image could not be decoded');
    const fontsReady = await page.evaluate(async () => {
      try {
        const faces: FontFace[] = [];
        document.fonts.forEach(face => faces.push(face));
        await Promise.all(faces.map(face => face.load()));
        return faces.every(face => face.status === 'loaded');
      } catch { return false; }
    });
    if (!fontsReady) throw new Error('PDF font could not be decoded or loaded');
    const bytes = await page.pdf({ format: config.size ?? 'A4', margin: { top: '18mm', right: '18mm', bottom: '18mm', left: '18mm', ...config.margins }, printBackground: true, preferCSSPageSize: true, displayHeaderFooter: !!(config.header || config.footer), headerTemplate: template(config.header), footerTemplate: template(config.footer), outline: config.bookmarks ?? true, tagged: true, waitForFonts: true, timeout });
    if (rejected.size) throw new Error(`PDF requires offline assets; blocked resource: ${[...rejected][0]}`);
    return { bytes: Buffer.from(bytes), metadata: { engine: 'chromium', browserVersion: await browser.version(), styleDigest: prepared.styleDigest, assets: [...prepared.assets].map(([file, asset]) => ({ path: file, digest: digest(asset.bytes) })) } };
  } catch (error) {
    if (timedOut) throw new Error(`PDF rendering exceeded ${timeout} milliseconds`);
    throw error;
  } finally { clearTimeout(deadline); await browser.close(); }
}
export async function renderPdf(input: PdfDocumentInput): Promise<PdfResult> { return renderPreparedPdf(await preparePdfDocument(input), input.config); }
