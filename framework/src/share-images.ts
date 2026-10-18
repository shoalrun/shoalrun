import path from 'node:path';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import type { Palette } from './palettes.js';

// Share images: a 1200×630 PNG per page for link previews, drawn from an SVG template with resvg at build time.
// resvg reads TrueType and OpenType only, so styles/fonts/share holds static TTF cuts of the bundled fonts
// plus their glyph widths, which the default template uses to wrap titles.
const shareFontDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../styles/fonts/share');
type FontMetrics = Record<string, { family: string; weight: number; style: 'normal' | 'italic'; widths: Record<string, number> }>;
export type ShareSettings = { enabled: boolean; template?: string; fonts: string[] };
export type ShareCard = { title: string; summary: string; site: string; type: string; url: string };
export const shareWidth = 1200;
export const shareHeight = 630;

const presetFonts: Record<string, { title: string; body: string }> = {
  shoal: { title: 'inter-700.ttf', body: 'inter-400.ttf' },
  reef: { title: 'figtree-700.ttf', body: 'figtree-400.ttf' },
  ledger: { title: 'jetbrains-mono-700.ttf', body: 'source-serif-4-400.ttf' },
  vice: { title: 'jost-italic-800.ttf', body: 'figtree-400.ttf' }
};
const fontFormats = new Set(['.ttf', '.otf']);

// outputs.html.shareImages: omitted or true draws the default card, false turns images off, and a mapping names a template.
export function resolveShareImages(value: unknown, declaringFile: string): ShareSettings {
  if (value === undefined || value === true) return { enabled: true, fonts: [] };
  if (value === false) return { enabled: false, fonts: [] };
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !['template', 'fonts'].includes(key))) throw new Error('outputs.html.shareImages must be true, false, or a mapping with template and fonts');
  const settings = value as { template?: unknown; fonts?: unknown };
  const local = (file: string) => path.resolve(path.dirname(declaringFile), file);
  if (settings.template !== undefined && (typeof settings.template !== 'string' || path.extname(settings.template).toLowerCase() !== '.svg')) throw new Error('outputs.html.shareImages.template must be a local .svg file');
  const fonts = settings.fonts ?? [];
  if (!Array.isArray(fonts) || fonts.some(file => typeof file !== 'string' || !fontFormats.has(path.extname(file).toLowerCase()))) throw new Error('outputs.html.shareImages.fonts must list local .ttf or .otf files');
  const resolved = { enabled: true, template: settings.template === undefined ? undefined : local(settings.template as string), fonts: (fonts as string[]).map(local) };
  for (const file of [...(resolved.template ? [resolved.template] : []), ...resolved.fonts]) if (!existsSync(file)) throw new Error(`outputs.html.shareImages: file not found: ${file}`);
  return resolved;
}

// Each page's image lives beside its route, so /styling/themes becomes /assets/share/styling/themes.png.
export const shareRoute = (route: string) => `/assets/share${route === '/' ? '/index' : route}.png`;

const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

let metricsCache: FontMetrics | undefined;
async function metrics(): Promise<FontMetrics> {
  metricsCache ??= JSON.parse(await readFile(path.join(shareFontDirectory, 'metrics.json'), 'utf8')) as FontMetrics;
  return metricsCache;
}

// Greedy word wrap using the font's advance widths; the last line gets an ellipsis when text is cut.
export function wrapText(text: string, widths: Record<string, number>, size: number, maxWidth: number, maxLines: number): string[] {
  const measure = (value: string) => [...value].reduce((total, char) => total + (widths[char] ?? .56) * size, 0);
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (measure(next) <= maxWidth || !line) { line = next; continue; }
    lines.push(line);
    line = word;
  }
  if (line) lines.push(line);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  let last = kept[maxLines - 1];
  while (last && measure(`${last}…`) > maxWidth) last = last.replace(/\s*\S+$/, '');
  kept[maxLines - 1] = `${last}…`;
  return kept;
}

// Lines split at word boundaries by character count, for project templates whose fonts the build cannot measure.
function wrapByCharacters(text: string, perLine: number, maxLines: number): string[] {
  const widths = new Proxy({}, { get: () => 1 }) as Record<string, number>;
  return wrapText(text, widths, 1, perLine, maxLines);
}

function brandMark(preset: string, x: number, y: number, size: number, palette: Palette): string {
  const accent = palette.dark.accent;
  if (preset === 'ledger') return `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${accent}"/>`;
  if (preset === 'vice') return `<defs><linearGradient id="sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd166"/><stop offset=".45" stop-color="#ff8a3d"/><stop offset="1" stop-color="#ff4fa3"/></linearGradient></defs><circle cx="${x + size / 2}" cy="${y + size / 2}" r="${size / 2}" fill="url(#sun)"/>`;
  if (preset === 'reef') return `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${size * .3}" fill="${accent}" transform="rotate(12 ${x + size / 2} ${y + size / 2})"/>`;
  const s = size / 64;
  return `<g transform="translate(${x} ${y}) scale(${s})" fill="${accent}"><path d="M4 40c2-7 6-11 10-11 5 0 8 5 8 12v3H4z"/><path d="M26 37c2-10 6-16 10-16 5 0 9 7 9 17v6H26z"/><path d="M47 40c2-7 5-10 9-10 5 0 8 5 8 11v3H47z"/><path d="M5 51c8-4 15-4 23 0s15 4 23 0 10-4 13-3" fill="none" stroke="${accent}" stroke-width="4" stroke-linecap="round"/><path d="M5 59c8-4 15-4 23 0s15 4 23 0 10-4 13-3" fill="none" stroke="${accent}" stroke-width="4" stroke-linecap="round"/></g>`;
}

export async function defaultShareSvg(card: ShareCard, preset: string, palette: Palette): Promise<string> {
  const fonts = presetFonts[preset] ?? presetFonts.shoal;
  const all = await metrics();
  const titleFont = all[fonts.title];
  const bodyFont = all[fonts.body];
  const pad = 80;
  const width = shareWidth - pad * 2;
  const background = palette.light['strong-surface'];
  const ink = palette.light['strong-text'];
  const accent = palette.dark.accent;
  const muted = palette.dark.muted;
  let size = 68;
  let title = wrapText(card.title, titleFont.widths, size, width, 3);
  if (title.length > 2) { size = 56; title = wrapText(card.title, titleFont.widths, size, width, 3); }
  const summary = card.summary ? wrapText(card.summary, bodyFont.widths, 30, width, 2) : [];
  const text = (family: { family: string; weight: number; style: string }) => `font-family="${escape(family.family)}" font-weight="${family.weight}" font-style="${family.style}"`;
  const titleTop = 200;
  const titleLead = size * 1.12;
  const summaryTop = titleTop + (title.length - 1) * titleLead + 64;
  const decoration = {
    shoal: `<rect x="0" y="0" width="12" height="${shareHeight}" fill="${accent}"/>`,
    reef: `<circle cx="${shareWidth - 60}" cy="${shareHeight + 40}" r="360" fill="${accent}" opacity=".22"/>`,
    ledger: `<rect x="0" y="${shareHeight - 14}" width="${shareWidth}" height="14" fill="${accent}"/>`,
    vice: `<defs><linearGradient id="stripe" x1="0" x2="1"><stop offset="0" stop-color="#ff4fa3"/><stop offset=".5" stop-color="#ff8a3d"/><stop offset="1" stop-color="#3ee6dc"/></linearGradient><radialGradient id="glow" cx=".85" cy="1.2" r=".8"><stop offset="0" stop-color="#ff4fa3" stop-opacity=".45"/><stop offset="1" stop-color="#ff4fa3" stop-opacity="0"/></radialGradient></defs><rect width="${shareWidth}" height="${shareHeight}" fill="url(#glow)"/><rect x="0" y="${shareHeight - 12}" width="${shareWidth}" height="12" fill="url(#stripe)"/>`
  }[preset] ?? '';
  const footerY = shareHeight - pad + 10;
  // The URL sits at the right of the footer; drop it rather than let it collide with a long site name.
  const measure = (value: string, widths: Record<string, number>, px: number) => [...value].reduce((total, char) => total + (widths[char] ?? .56) * px, 0);
  const site = wrapText(card.site, titleFont.widths, 26, width - 50, 1)[0] ?? '';
  const url = card.url && 50 + measure(site, titleFont.widths, 26) + 48 + measure(card.url, bodyFont.widths, 22) <= width ? card.url : '';
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${shareWidth}" height="${shareHeight}" viewBox="0 0 ${shareWidth} ${shareHeight}">`,
    `<rect width="${shareWidth}" height="${shareHeight}" fill="${background}"/>`,
    decoration,
    `<text x="${pad}" y="${titleTop - 78}" ${text(bodyFont)} font-size="22" letter-spacing="4" fill="${accent}">${escape(card.type.toUpperCase())}</text>`,
    ...title.map((line, index) => `<text x="${pad}" y="${titleTop + index * titleLead}" ${text(titleFont)} font-size="${size}" letter-spacing="${preset === 'ledger' ? -1 : -2}" fill="${ink}">${escape(line)}</text>`),
    ...summary.map((line, index) => `<text x="${pad}" y="${summaryTop + index * 42}" ${text(bodyFont)} font-size="30" fill="${muted}">${escape(line)}</text>`),
    brandMark(preset, pad, footerY - 30, 34, palette),
    `<text x="${pad + 50}" y="${footerY}" ${text(titleFont)} font-size="26" fill="${ink}">${escape(site)}</text>`,
    ...(url ? [`<text x="${shareWidth - pad}" y="${footerY}" text-anchor="end" ${text(bodyFont)} font-size="22" fill="${muted}">${escape(url)}</text>`] : []),
    '</svg>'
  ].join('');
}

// Project templates use {{placeholders}}; unknown names fail so a typo cannot ship an image with raw braces.
export function fillShareTemplate(template: string, card: ShareCard, file: string): string {
  const title = wrapByCharacters(card.title, 30, 3);
  const summary = wrapByCharacters(card.summary, 60, 2);
  const values: Record<string, string> = {
    title: card.title, summary: card.summary, site: card.site, type: card.type, url: card.url,
    'title.1': title[0] ?? '', 'title.2': title[1] ?? '', 'title.3': title[2] ?? '',
    'summary.1': summary[0] ?? '', 'summary.2': summary[1] ?? ''
  };
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, name: string) => {
    if (!Object.hasOwn(values, name)) throw new Error(`${file}: unknown share image placeholder {{${name}}}; use ${Object.keys(values).join(', ')}`);
    return escape(values[name]);
  });
}

export const bundledShareFonts = () => Object.values(presetFonts).flatMap(font => [font.title, font.body]).filter((file, index, all) => all.indexOf(file) === index).map(file => path.join(shareFontDirectory, file));

// Rendered PNGs are cached by content, so unchanged pages skip resvg on later builds.
// The key covers the SVG, the font bytes, the output width, and the resvg version, so any change redraws.
// Digests are memoized per file version, so a font edited during `shoalrun dev` is hashed again.
const fontDigests = new Map<string, Promise<string>>();
const fontDigest = async (file: string) => {
  const { mtimeMs, size } = await stat(file);
  const version = `${file}|${mtimeMs}|${size}`;
  if (!fontDigests.has(version)) fontDigests.set(version, readFile(file).then(bytes => createHash('sha256').update(bytes).digest('hex')));
  return fontDigests.get(version)!;
};
const resvgVersion = String(createRequire(import.meta.url)('@resvg/resvg-js/package.json').version);

export async function renderPng(svg: string, fontFiles: string[], cacheDirectory: string, width = shareWidth): Promise<Buffer> {
  const { Resvg } = await import('@resvg/resvg-js');
  const key = createHash('sha256').update(JSON.stringify([svg, await Promise.all(fontFiles.map(fontDigest)), width, resvgVersion])).digest('hex').slice(0, 24);
  const cached = path.join(cacheDirectory, `${key}.png`);
  if (existsSync(cached)) return readFile(cached);
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: width }, font: { fontFiles, loadSystemFonts: false, defaultFontFamily: 'Inter' } }).render().asPng();
  await mkdir(cacheDirectory, { recursive: true });
  await writeFile(cached, png);
  return png;
}

// The favicon repeats the preset's brand mark in the palette accent; a 180px touch icon puts it on the inked surface.
export function faviconSvg(preset: string, palette: Palette): string {
  const light = { ...palette, dark: { ...palette.dark, accent: palette.light.accent } } as Palette;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">${brandMark(preset, preset === 'shoal' ? 0 : 6, preset === 'shoal' ? 0 : 6, preset === 'shoal' ? 64 : 52, light)}</svg>`;
}

export function touchIconSvg(icon: string, palette: Palette): string {
  // Nest the icon's own <svg> so its viewBox still applies; only its position and size change.
  const body = icon.replace(/^(?:\s|<\?xml[\s\S]*?\?>|<!--[\s\S]*?-->|<!DOCTYPE[^>]*>)+/i, '');
  if (!/^<svg\b/.test(body)) throw new Error('site.favicon must be an SVG document with an <svg> root element');
  const nested = body.replace(/^<svg\b([^>]*)>/, (_, attributes: string) => `<svg${attributes.replace(/\s(?:x|y|width|height)=(?:"[^"]*"|'[^']*')/g, '')} x="40" y="40" width="100" height="100">`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" width="180" height="180"><rect width="180" height="180" fill="${palette.light['strong-surface']}"/>${nested}</svg>`;
}
