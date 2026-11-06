import { isConfigMapping } from './compiler-config.js';

export type PdfFont = { family: string; source: string; weight?: string; style?: 'normal' | 'italic' };
export type PdfConfig = { stylesheet?: string; logo?: string; subtitle?: string; fonts?: PdfFont[]; size?: 'A4' | 'Letter' | 'Legal' | 'A3' | 'A5'; margins?: { top?: string; right?: string; bottom?: string; left?: string }; header?: string; footer?: string; cover?: boolean; toc?: boolean; bookmarks?: boolean; executablePath?: string; timeout?: number };
const localFile = (value: unknown) => typeof value === 'string' && value.trim() && !/^[a-z][a-z0-9+.-]*:|^\/\//i.test(value) && !value.includes('\0');
export function validatePdfConfig(value: unknown): PdfConfig {
  if (value === undefined) return {};
  const keys = ['stylesheet', 'logo', 'subtitle', 'fonts', 'size', 'margins', 'header', 'footer', 'cover', 'toc', 'bookmarks', 'executablePath', 'timeout'];
  if (!isConfigMapping(value) || Object.keys(value).some(key => !keys.includes(key))) throw new Error(`PDF settings accept ${keys.join(', ')}`);
  for (const key of ['stylesheet', 'logo', 'executablePath']) if (value[key] !== undefined && !localFile(value[key])) throw new Error(`PDF ${key} must be a local file path`);
  if (value.subtitle !== undefined && (typeof value.subtitle !== 'string' || value.subtitle.length > 1000)) throw new Error('PDF subtitle must be text of at most 1000 characters');
  if (value.size !== undefined && !['A4', 'Letter', 'Legal', 'A3', 'A5'].includes(value.size as string)) throw new Error('PDF size must be A4, Letter, Legal, A3, or A5');
  if (value.margins !== undefined) {
    if (!isConfigMapping(value.margins) || Object.keys(value.margins).some(key => !['top', 'right', 'bottom', 'left'].includes(key))) throw new Error('PDF margins accept top, right, bottom, left');
    for (const margin of Object.values(value.margins)) if (typeof margin !== 'string' || !/^(?:\d+(?:\.\d+)?|\.\d+)(?:mm|cm|in|px)$/.test(margin) || parseFloat(margin) > 1000) throw new Error('PDF margins need nonnegative dimensions with mm, cm, in, or px units');
  }
  for (const key of ['cover', 'toc', 'bookmarks']) if (value[key] !== undefined && typeof value[key] !== 'boolean') throw new Error(`PDF ${key} must be boolean`);
  for (const key of ['header', 'footer']) if (value[key] !== undefined && (typeof value[key] !== 'string' || value[key].length > 2000 || /\{(?!title\}|page\}|pages\})[^}]*\}/.test(value[key]))) throw new Error(`PDF ${key} accepts text and {title}, {page}, {pages} placeholders`);
  if (value.timeout !== undefined && (!Number.isInteger(value.timeout) || Number(value.timeout) < 1000 || Number(value.timeout) > 120000)) throw new Error('PDF timeout must be 1000–120000 milliseconds');
  if (value.fonts !== undefined) {
    if (!Array.isArray(value.fonts) || value.fonts.length > 32) throw new Error('PDF fonts must be an array of at most 32 local fonts');
    for (const font of value.fonts) if (!isConfigMapping(font) || Object.keys(font).some(key => !['family', 'source', 'weight', 'style'].includes(key)) || typeof font.family !== 'string' || !font.family.trim() || font.family.length > 100 || !localFile(font.source) || (font.weight !== undefined && (typeof font.weight !== 'string' || !/^(?:normal|bold|[1-9]00)$/.test(font.weight))) || (font.style !== undefined && !['normal', 'italic'].includes(font.style as string))) throw new Error('Each PDF font needs family and local source, with optional weight and normal/italic style');
  }
  return structuredClone(value) as PdfConfig;
}
export function mergePdfConfig(base: unknown, override: unknown): PdfConfig {
  const first = validatePdfConfig(base), second = validatePdfConfig(override);
  return { ...first, ...second, ...(first.margins || second.margins ? { margins: { ...first.margins, ...second.margins } } : {}) };
}
