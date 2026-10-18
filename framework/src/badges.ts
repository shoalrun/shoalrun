import { contrast, type Mode, type Palette } from './palettes.js';

export const builtInBadgeVariants = ['neutral', 'info', 'success', 'warning', 'new'] as const;
type BadgeColors = { background: string; text: string; border: string };
export type BadgeVariant = { light?: BadgeColors; dark?: BadgeColors };
export type BadgeVariants = Map<string, BadgeVariant>;

const mapping = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const namePattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const hexColor = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function colors(value: unknown, where: string): BadgeColors {
  if (!mapping(value) || Object.keys(value).some(key => !['background', 'text', 'border'].includes(key))) throw new Error(`${where} only accepts background, text, and border`);
  for (const key of ['background', 'text'] as const) if (typeof value[key] !== 'string' || !hexColor.test(value[key])) throw new Error(`${where}.${key} must be a hex color`);
  if (value.border !== undefined && (typeof value.border !== 'string' || !hexColor.test(value.border))) throw new Error(`${where}.border must be a hex color`);
  return { background: value.background as string, text: value.text as string, border: (value.border ?? value.text) as string };
}

export function resolveBadgeVariants(config: unknown, file: string): BadgeVariants {
  const variants: BadgeVariants = new Map(builtInBadgeVariants.map(name => [name, {}]));
  if (config === undefined) return variants;
  if (!mapping(config) || Object.keys(config).some(key => key !== 'variants') || !mapping(config.variants)) throw new Error(`${file}: badges must contain a variants mapping`);
  for (const [name, value] of Object.entries(config.variants)) {
    if (!namePattern.test(name)) throw new Error(`${file}: badges.variants name "${name}" must use lowercase kebab-case`);
    if (!mapping(value) || Object.keys(value).some(key => !['light', 'dark'].includes(key)) || !value.light) throw new Error(`${file}: badges.variants.${name} needs light colors and optional dark colors`);
    variants.set(name, { light: colors(value.light, `${file}: badges.variants.${name}.light`), ...(value.dark ? { dark: colors(value.dark, `${file}: badges.variants.${name}.dark`) } : {}) });
  }
  return variants;
}

export function badgeContrastProblems(variants: BadgeVariants, palette: Palette, modes: Mode[]): string[] {
  return [...variants].flatMap(([name, variant]) => modes.flatMap(mode => {
    const colors = variant[mode];
    if (!variant.light) return [];
    if (!colors) return [`badges.variants.${name} needs dark colors because the site shows dark mode`];
    const ratio = contrast(colors.text, colors.background, palette[mode].page);
    return ratio + 1e-9 < 4.5 ? [`badges.variants.${name} ${mode}: text ${colors.text} on background ${colors.background} is ${ratio.toFixed(2)}:1; needs 4.5:1`] : [];
  }));
}

export function badgeCss(variants: BadgeVariants, mode: Mode | 'system'): string | undefined {
  const custom = [...variants].filter(([, variant]) => variant.light);
  if (!custom.length) return undefined;
  const rules = (selected: Mode) => custom.map(([name, variant]) => {
    const colors = variant[selected] ?? variant.light!;
    return `.content .doc-badge-${name}{background:${colors.background};color:${colors.text};border-color:${colors.border}}`;
  }).join('\n');
  if (mode !== 'system') return `${rules(mode)}\n`;
  const darkRules = custom.map(([name, variant]) => {
    const colors = variant.dark!;
    return `.content .doc-badge-${name}{background:${colors.background};color:${colors.text};border-color:${colors.border}}`;
  }).join('\n');
  return `${rules('light')}\n@media(prefers-color-scheme:dark){:root:not([data-mode=light]) ${darkRules.replaceAll('\n', '\n:root:not([data-mode=light]) ')}}\n:root[data-mode=dark] ${darkRules.replaceAll('\n', '\n:root[data-mode=dark] ')}\n`;
}
