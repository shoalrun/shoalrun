import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

// Palette tokens are written without the --color- prefix. Every palette defines all of them for both modes.
export const paletteTokens = [
  'text', 'page', 'surface', 'link', 'link-hover', 'focus', 'ink', 'accent', 'accent-contrast',
  'header-muted', 'header-border', 'border', 'border-soft', 'border-nested',
  'field-surface', 'field-border', 'field-accent',
  'presence-bg', 'presence-text', 'optional-bg', 'optional-text',
  'muted', 'nav-heading', 'section-heading', 'nav-text', 'nav-hover', 'nav-active', 'nav-active-text',
  'deprecated-bg', 'deprecated-text', 'beta-bg', 'beta-text', 'development-bg', 'development-text', 'experimental-bg', 'experimental-text',
  'emphasis', 'summary', 'code-bg', 'code-text', 'code-muted', 'code-border', 'code-block',
  'callout-line', 'callout-bg',
  ...(['note', 'tip', 'important', 'warning', 'caution'] as const).flatMap(tone => [`callout-${tone}-line`, `callout-${tone}-bg`, `callout-${tone}-text`] as const),
  'strong-surface', 'strong-text'
] as const;
export type Token = typeof paletteTokens[number];
export type Mode = 'light' | 'dark';
export type Palette = { name: string; light: Record<Token, string>; dark: Record<Token, string>; files: string[] };
// One catalog feeds config validation, the theme previewer, and its Markdown fallback.
export const presetCatalog = [
  { name: 'shoal', palette: 'kelp', shape: 'Flat page with a ruled sidebar and square-cornered controls.' },
  { name: 'reef', palette: 'coral', shape: 'Rounded panels on a tinted page, with pill navigation and controls.' },
  { name: 'ledger', palette: 'ink', masthead: 'inked', shape: 'Technical manual with an inked masthead, monospace headings, and numbered sections.' },
  { name: 'vice', palette: 'vice', masthead: 'inked', shape: 'Night masthead with a sunset stripe, bold italic type, and neon rules.' }
];
export const paletteCatalog = [
  { name: 'kelp', colors: 'Sea green on white.' },
  { name: 'coral', colors: 'Coral accent over cool blue-gray neutrals.' },
  { name: 'ink', colors: 'Black ink on warm paper with a vermilion accent.' },
  { name: 'harbor', colors: 'Navy ink, blue links, and a yellow callout rule.' },
  { name: 'amethyst', colors: 'Violet accents over lavender neutrals.' },
  { name: 'vice', colors: 'Flamingo pink and aqua by day, neon on night purple after dark.' }
];
export const paletteNames = paletteCatalog.map(palette => palette.name);
const paletteDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../styles/themes/palettes');
const hex = /^#(?:[\da-f]{3}|[\da-f]{6})$/i;

// WCAG 2.2 pairs: 1.4.3 needs 4.5:1 for text; 1.4.11 needs 3:1 for focus rings, field boundaries, and filled controls.
export const contrastPairs: Array<[Token, Token, number]> = [
  ...(['page', 'surface', 'field-surface'] as const).flatMap(bg => (['text', 'muted', 'link', 'ink', 'emphasis', 'section-heading', 'nav-text', 'nav-heading', 'summary', 'header-muted'] as const).map(fg => [fg, bg, 4.5] as [Token, Token, number])),
  ['link-hover', 'page', 4.5], ['link-hover', 'surface', 4.5], ['nav-text', 'nav-hover', 4.5], ['ink', 'nav-hover', 4.5],
  ['muted', 'code-bg', 4.5],
  ['text', 'callout-bg', 4.5], ['link', 'callout-bg', 4.5], ['text', 'code-bg', 4.5],
  ['nav-active-text', 'nav-active', 4.5], ['presence-text', 'presence-bg', 4.5], ['optional-text', 'optional-bg', 4.5],
  ['deprecated-text', 'deprecated-bg', 4.5], ['beta-text', 'beta-bg', 4.5], ['development-text', 'development-bg', 4.5], ['experimental-text', 'experimental-bg', 4.5],
  // Typed callouts: body text and links on the tinted background, and the label and icon in the tone's text color.
  ...(['note', 'tip', 'important', 'warning', 'caution'] as const).flatMap(tone => (['text', 'link', `callout-${tone}-text`] as const).map(fg => [fg, `callout-${tone}-bg`, 4.5] as [Token, Token, number])),
  ['code-text', 'code-block', 4.5], ['code-muted', 'code-block', 4.5], ['accent-contrast', 'accent', 4.5], ['strong-text', 'strong-surface', 4.5],
  ['focus', 'page', 3], ['focus', 'surface', 3], ['field-border', 'page', 3], ['field-border', 'surface', 3], ['field-border', 'field-surface', 3],
  ['accent', 'page', 3], ['accent', 'surface', 3]
];

const channel = (value: number) => { const c = value / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
// Accepts #rgb, #rgba, #rrggbb, and #rrggbbaa. A translucent color is blended over `under` before measuring.
function rgb(color: string, under = '#ffffff'): number[] {
  const digits = color.slice(1);
  const full = digits.length <= 4 ? [...digits].map(c => c + c).join('') : digits;
  const [r, g, b, a = 255] = [0, 2, 4, 6].map(i => i < full.length ? parseInt(full.slice(i, i + 2), 16) : undefined).filter((value): value is number => value !== undefined);
  if (a === 255) return [r, g, b];
  const base = rgb(under);
  return [r, g, b].map((value, index) => value * (a / 255) + base[index] * (1 - a / 255));
}
function luminance(channels: number[]) {
  const [r, g, b] = channels.map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(foreground: string, background: string, backdrop = '#ffffff') {
  const solidBackground = rgb(background, backdrop);
  const solidHex = `#${solidBackground.map(value => Math.round(value).toString(16).padStart(2, '0')).join('')}`;
  const [high, low] = [luminance(rgb(foreground, solidHex)), luminance(solidBackground)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

function tokenMap(value: unknown, where: string, complete: boolean): Partial<Record<Token, string>> {
  if (value === undefined && !complete) return {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${where} must be a mapping of color tokens`);
  const map: Partial<Record<Token, string>> = {};
  for (const [key, color] of Object.entries(value)) {
    if (!(paletteTokens as readonly string[]).includes(key)) throw new Error(`${where}.${key} is not a palette token. Use one of: ${paletteTokens.join(', ')}`);
    if (typeof color !== 'string' || !hex.test(color)) throw new Error(`${where}.${key} must be a hex color such as "#1b5fd1"`);
    map[key as Token] = color.toLowerCase();
  }
  if (complete) {
    const missing = paletteTokens.filter(token => !map[token]);
    if (missing.length) throw new Error(`${where} is missing ${missing.join(', ')}`);
  }
  return map;
}

async function builtIn(name: string): Promise<Palette> {
  const file = path.join(paletteDirectory, `${name}.yaml`);
  const parsed = YAML.parse(await readFile(file, 'utf8'));
  return { name, light: tokenMap(parsed?.light, `${name}.light`, true) as Palette['light'], dark: tokenMap(parsed?.dark, `${name}.dark`, true) as Palette['dark'], files: [file] };
}

// A palette setting is a built-in name, or { extends, light, dark } with partial overrides.
export async function resolvePalette(value: unknown, fallback: string): Promise<Palette> {
  if (value === undefined || typeof value === 'string') {
    const name = value ?? fallback;
    if (!paletteNames.includes(name)) throw new Error(`theme.palette must be one of ${paletteNames.join(', ')}, or a mapping with extends, light, and dark`);
    return builtIn(name);
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('theme.palette must be a palette name or a mapping');
  const { extends: base = fallback, light, dark, ...extra } = value as Record<string, unknown>;
  if (Object.keys(extra).length) throw new Error(`theme.palette does not accept ${Object.keys(extra).join(', ')}`);
  if (typeof base !== 'string' || !paletteNames.includes(base)) throw new Error(`theme.palette.extends must be one of ${paletteNames.join(', ')}`);
  const parent = await builtIn(base);
  return {
    name: 'custom',
    light: { ...parent.light, ...tokenMap(light, 'theme.palette.light', false) },
    dark: { ...parent.dark, ...tokenMap(dark, 'theme.palette.dark', false) },
    files: parent.files
  };
}

export function contrastProblems(palette: Palette, modes: Mode[]) {
  return modes.flatMap(mode => contrastPairs.flatMap(([fg, bg, minimum]) => {
    const ratio = contrast(palette[mode][fg], palette[mode][bg]);
    return ratio + 1e-9 < minimum ? [`${mode}: ${fg} ${palette[mode][fg]} on ${bg} ${palette[mode][bg]} is ${ratio.toFixed(2)}:1; needs ${minimum}:1`] : [];
  }));
}

type ToneColors = { line: string; background: string; text: string };
export type CalloutTone = ToneColors & { dark?: ToneColors };

// Custom callout tones sit on the page, so check body text, links, and the tone's label against its background.
export function calloutToneProblems(tones: Map<string, CalloutTone>, palette: Palette, modes: Mode[]) {
  return [...tones].flatMap(([name, tone]) => modes.flatMap(mode => {
    const colors = mode === 'dark' ? tone.dark : tone;
    if (!colors) return [`callouts.tones.${name} needs dark colors because the site shows dark mode. Add callouts.tones.${name}.dark with line, background, and text.`];
    const page = palette[mode].page;
    return ([['text', palette[mode].text], ['link', palette[mode].link], ['label text', colors.text]] as const).flatMap(([role, foreground]) => {
      const ratio = contrast(foreground, colors.background, page);
      return ratio + 1e-9 < 4.5 ? [`callouts.tones.${name} ${mode}: ${role} ${foreground} on background ${colors.background} is ${ratio.toFixed(2)}:1; needs 4.5:1`] : [];
    });
  }));
}

// Custom callout tones carry their dark colors inline; these rules switch to them wherever dark mode applies.
const darkCallouts = '.content blockquote.callout[data-callout-dark]{--callout-line:var(--callout-dark-line)!important;--callout-bg:var(--callout-dark-bg)!important;--callout-text:var(--callout-dark-text)!important}';

// Dark surfaces get a faint edge so panels, code, and cards stay distinct from the page.
const edge = { light: '0 0 #0000', dark: '0 0 0 1px #ffffff0f,inset 0 1px 0 #ffffff0d' };
const declarations = (tokens: Record<Token, string>, mode: Mode) => `color-scheme:${mode};${paletteTokens.map(token => `--color-${token}:${tokens[token]}`).join(';')};--shadow-edge:${edge[mode]}`;

// Code blocks are dark in both modes, so syntax colors come from the palette's dark set. A color that falls
// below 4.5:1 on either mode's code background falls back to plain code text rather than failing the build.
const syntaxSources = { keyword: 'accent', string: 'callout-tip-text', 'string-expression': 'callout-tip-text', constant: 'callout-warning-text', function: 'callout-note-text', parameter: 'callout-important-text', link: 'link' } as const;
export function syntaxColors(palette: Palette): Record<string, string> {
  return Object.fromEntries(Object.entries(syntaxSources).map(([role, token]) => {
    const color = palette.dark[token];
    const readable = (['light', 'dark'] as const).every(mode => contrast(color, palette[mode]['code-block']) + 1e-9 >= 4.5);
    return [role, readable ? color : 'var(--color-code-text)'];
  }));
}
const syntaxCss = (palette: Palette) => `:root{${Object.entries(syntaxColors(palette)).map(([role, color]) => `--code-token-${role}:${color}`).join(';')}}`;

// light and dark lock the site to one mode. system follows the reader's OS until they choose with the toggle.
export function paletteCss(palette: Palette, mode: Mode | 'system') {
  const blocks = mode === 'system'
    ? [`:root{${declarations(palette.light, 'light')}}`, `@media (prefers-color-scheme:dark){:root:not([data-mode=light]){${declarations(palette.dark, 'dark')}}:root:not([data-mode=light]) ${darkCallouts}}`, `:root[data-mode=dark]{${declarations(palette.dark, 'dark')}}`, `:root[data-mode=dark] ${darkCallouts}`]
    : [`:root{${declarations(palette[mode], mode)}}`, ...(mode === 'dark' ? [darkCallouts] : [])];
  return `/* Generated from the ${palette.name} palette. */\n${blocks.join('\n')}\n${syntaxCss(palette)}\n.content pre,.examples pre,.code-block{background:var(--color-code-block)}\n`;
}
