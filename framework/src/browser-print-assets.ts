import path from 'node:path';
import { parse } from 'parse5';
import { loadConfig } from './config.js';
import { projectPdfSettings } from './pdf-project.js';
import { preparePdfDocument } from './pdf-renderer.js';
import { sitePath } from './site-path.js';

/** One shared print theme for the entire build; no page content is materialized. */
export async function browserPrintAssets(configFile: string, options: { basePath: string; profile?: string; style?: string }) {
  const loaded = await loadConfig(configFile, { profile: options.profile });
  const { config, files } = projectPdfSettings(loaded, configFile, options.style);
  const prepared = await preparePdfDocument({
    documents: [{ id: 'print-theme', title: '', html: '' }], title: '', assets: new Map(), publicBase: '/',
    config: { ...config, cover: false, toc: false }, configFile,
    assetRoots: files.map(file => path.dirname(file))
  });
  let css = '';
  const findStyle = (node: any) => { if (node.tagName === 'style') css += (node.childNodes ?? []).map((child: any) => child.value ?? '').join(''); for (const child of node.childNodes ?? []) findStyle(child); };
  findStyle(parse(prepared.html));
  const artifacts = new Map<string, string | Buffer>();
  let logo: string | undefined;
  for (const [original, asset] of prepared.assets) {
    const route = sitePath(options.basePath, `/assets/print/${path.posix.basename(original)}`);
    artifacts.set(route, asset.bytes);
    css = css.replaceAll(original, route);
    if (original.startsWith('/__pdf_logo/')) logo = route;
  }
  const margins = { top: '18mm', right: '18mm', bottom: '18mm', left: '18mm', ...config.margins };
  css = `@page{size:${config.size ?? 'A4'};margin:${margins.top} ${margins.right} ${margins.bottom} ${margins.left}}\n` + css;
  css += '\n.pdf-print-tools{display:flex;gap:10px;align-items:center;padding:12px 0;margin-bottom:24px;font:14px Arial,sans-serif}.pdf-print-tools button{font:inherit;padding:8px 12px;border:1px solid #89998e;border-radius:4px;cursor:pointer}.pdf-print-tools .pdf-print-note{margin-left:auto;color:#53665e;font-size:12px}.pdf-chapter .page-head h1{margin-bottom:8pt}.pdf-chapter .page-head .summary{font-size:10pt;line-height:1.5;margin:0 0 8pt}.pdf-chapter .page-head .pdf-page-meta{font-size:8pt;margin:5pt 0 12pt}.pdf-page-meta{color:var(--pdf-muted);font-size:9pt;margin-bottom:14pt}.pdf-chapter .eyebrow{color:var(--pdf-muted);font-size:9pt}.pdf-chapter .page-dates{display:flex;flex-wrap:wrap;gap:4pt 10pt;font-size:9pt;color:var(--pdf-muted)}.pdf-chapter .doc-callout{border-left:3pt solid var(--pdf-accent);padding:10pt 14pt;background:#f1f4ee;margin:14pt 0}.pdf-chapter details{display:block}.pdf-reader-label{font-weight:bold;margin-top:14pt}@media screen{html{background:#dfe5de}body{max-width:210mm;margin:24px auto;padding:18mm;background:white;box-shadow:0 8px 40px #173c3520}}@media print{.pdf-print-tools{display:none!important}}';
  // A manual theme may start every chapter on a new page. When no cover or
  // contents precede this chapter, that break can produce a blank first sheet.
  css += '\n.pdf-print-tools + .pdf-chapter{break-before:auto}';
  const stylesheet = sitePath(options.basePath, '/assets/print/theme.css');
  artifacts.set(stylesheet, css);
  const settings = {
    schemaVersion: 1, stylesheet, ...(logo ? { logo } : {}), cover: config.cover ?? false,
    toc: config.toc ?? false, subtitle: config.subtitle ?? '', header: config.header ?? '', footer: config.footer ?? '',
    fonts: (config.fonts ?? []).map(({ family, weight, style }) => ({ family, weight, style }))
  };
  artifacts.set(sitePath(options.basePath, '/assets/print/settings.json'), JSON.stringify(settings));
  return { artifacts, dependencies: new Set([...loaded.dependencies, ...files]) };
}
