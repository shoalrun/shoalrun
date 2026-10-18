import path from 'node:path';

export type FontRole = 'body' | 'headings' | 'code';
export type FontFace = { family: string; file: string; route: string; style: 'normal' | 'italic'; weight: string };
export type SiteFonts = { bundled: boolean; faces: FontFace[]; tokens: Partial<Record<FontRole, string>>; preload?: string };

// Latin variable fonts from Fontsource, all under the SIL Open Font License. Readers download only the faces a page uses.
export const bundledFonts = [
  { family: 'Inter', file: 'inter.woff2', style: 'normal' },
  { family: 'Inter', file: 'inter-italic.woff2', style: 'italic' },
  { family: 'Figtree', file: 'figtree.woff2', style: 'normal' },
  { family: 'Figtree', file: 'figtree-italic.woff2', style: 'italic' },
  { family: 'Source Serif 4', file: 'source-serif-4.woff2', style: 'normal' },
  { family: 'Source Serif 4', file: 'source-serif-4-italic.woff2', style: 'italic' },
  { family: 'JetBrains Mono', file: 'jetbrains-mono.woff2', style: 'normal' },
  { family: 'Jost', file: 'jost.woff2', style: 'normal' },
  { family: 'Jost', file: 'jost-italic.woff2', style: 'italic' }
] as const;
// Local fonts resized to each bundled font's metrics, so text keeps its place when the bundled font arrives.
// Values come from the font files: average glyph width sets size-adjust; hhea ascent, descent, and gap set the overrides.
const localSans = 'local("Arial"), local("Arimo"), local("Liberation Sans")';
const fallbackFaces = [
  { family: 'Inter', src: localSans, size: '107.34%', ascent: '90.25%', descent: '22.47%' },
  { family: 'Figtree', src: localSans, size: '99.25%', ascent: '95.71%', descent: '25.19%' },
  { family: 'Source Serif 4', src: 'local("Times New Roman"), local("Tinos"), local("Liberation Serif")', size: '118.84%', ascent: '87.18%', descent: '28.19%' },
  { family: 'JetBrains Mono', src: 'local("Courier New"), local("Cousine"), local("Liberation Mono")', size: '99.98%', ascent: '102.02%', descent: '30.00%' },
  { family: 'Jost', src: localSans, size: '95.84%', ascent: '111.65%', descent: '39.13%' }
];
export const bundledFontLicenses = ['inter', 'figtree', 'source-serif-4', 'jetbrains-mono', 'jost'].map(name => `${name}-LICENSE.txt`);

// The body font each preset preloads so the first paint uses it.
const presetBodyFont: Record<string, string> = { shoal: 'inter.woff2', reef: 'figtree.woff2', ledger: 'source-serif-4.woff2', vice: 'figtree.woff2' };

const fallbacks: Record<FontRole, string> = {
  body: 'ui-sans-serif, system-ui, sans-serif',
  headings: 'var(--font-body)',
  code: 'ui-monospace, "SFMono-Regular", Consolas, monospace'
};
const roles: FontRole[] = ['body', 'headings', 'code'];
const formats: Record<string, string> = { '.woff2': 'woff2', '.woff': 'woff', '.ttf': 'truetype', '.otf': 'opentype' };
const familyName = /^[\p{L}\p{N} _.-]+$/u;
const weightValue = /^[1-9]\d{0,2}( [1-9]\d{0,2})?$/;

// theme.fonts: omitted keeps the preset's bundled fonts, `system` turns them off, and body/headings/code bring your own.
export function resolveFonts(value: unknown, preset: string, declaringFile: string): SiteFonts {
  if (value === undefined) return { bundled: true, faces: [], tokens: {}, preload: presetBodyFont[preset] };
  if (value === 'system') return { bundled: false, faces: [], tokens: {} };
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('theme.fonts must be system or a mapping of body, headings, and code');
  const unknown = Object.keys(value).filter(key => !roles.includes(key as FontRole));
  if (unknown.length) throw new Error(`theme.fonts accepts only body, headings, and code; remove ${unknown.join(', ')}`);
  const faces: FontFace[] = [];
  const tokens: Partial<Record<FontRole, string>> = {};
  for (const role of roles) {
    const entry = (value as any)[role];
    if (entry === undefined) continue;
    const spec = typeof entry === 'string' ? { family: entry } : entry;
    if (!spec || typeof spec !== 'object' || Array.isArray(spec) || Object.keys(spec).some(key => !['family', 'files'].includes(key))) throw new Error(`theme.fonts.${role} must be a family name or a mapping with family and files`);
    if (typeof spec.family !== 'string' || !familyName.test(spec.family)) throw new Error(`theme.fonts.${role}.family must be a font name using letters, numbers, spaces, dots, dashes, or underscores`);
    const files = spec.files ?? [];
    if (!Array.isArray(files)) throw new Error(`theme.fonts.${role}.files must be a list`);
    for (const [index, item] of files.entries()) {
      const where = `theme.fonts.${role}.files[${index}]`;
      const face = typeof item === 'string' ? { file: item } : item;
      if (!face || typeof face !== 'object' || Array.isArray(face) || Object.keys(face).some(key => !['file', 'style', 'weight'].includes(key))) throw new Error(`${where} must be a path or a mapping with file, style, and weight`);
      if (typeof face.file !== 'string' || !formats[path.extname(face.file).toLowerCase()]) throw new Error(`${where} must be a local .woff2, .woff, .ttf, or .otf file`);
      const style = face.style ?? 'normal';
      if (style !== 'normal' && style !== 'italic') throw new Error(`${where}.style must be normal or italic`);
      const weight = String(face.weight ?? '100 900');
      if (!weightValue.test(weight)) throw new Error(`${where}.weight must be a number such as 400 or a range such as "100 900"`);
      const file = path.resolve(path.dirname(declaringFile), face.file);
      if (!/^[\w.-]+$/.test(path.basename(file))) throw new Error(`${where} file name may use only letters, numbers, dots, dashes, and underscores`);
      faces.push({ family: spec.family, file, route: `/assets/fonts/project/${path.basename(file)}`, style, weight });
    }
    tokens[role] = `"${spec.family}", ${fallbacks[role]}`;
  }
  return { bundled: true, faces, tokens, preload: tokens.body ? undefined : presetBodyFont[preset] };
}

const face = (family: string, url: string, style: string, weight: string, format: string) =>
  `@font-face{font-family:"${family}";src:url("${url}") format("${format}");font-style:${style};font-weight:${weight};font-display:swap}`;

export function fontsCss(fonts: SiteFonts): string | undefined {
  const rules = [
    ...(fonts.bundled ? bundledFonts.map(font => face(font.family, `/assets/fonts/${font.file}`, font.style, '100 900', 'woff2')) : []),
    ...(fonts.bundled ? fallbackFaces.map(font => `@font-face{font-family:"${font.family} Fallback";src:${font.src};size-adjust:${font.size};ascent-override:${font.ascent};descent-override:${font.descent};line-gap-override:0%}`) : []),
    ...fonts.faces.map(font => face(font.family, font.route, font.style, font.weight, formats[path.extname(font.file).toLowerCase()])),
    ...(Object.keys(fonts.tokens).length ? [`:root{${Object.entries(fonts.tokens).map(([role, stack]) => `--font-${role === 'headings' ? 'heading' : role}:${stack}`).join(';')}}`] : [])
  ];
  return rules.length ? `/* Generated from theme.fonts. */\n${rules.join('\n')}\n` : undefined;
}
