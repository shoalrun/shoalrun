import { validateLucideIcon } from './icons.js';

export const calloutTones = ['note', 'tip', 'important', 'warning', 'caution'] as const;
type ToneColors = { line: string; background: string; text: string };
// dark holds the colors used when the site shows dark mode; see theme.mode.
export type CalloutColors = ToneColors & { dark?: ToneColors };
export type CalloutType = { label: string; tone: string; icon?: string; colors?: CalloutColors };
export type CalloutTypes = Map<string, CalloutType>;

const defaults: Record<string, CalloutType> = {
  note: { label: 'Note', tone: 'note', icon: 'info' },
  tip: { label: 'Tip', tone: 'tip', icon: 'lightbulb' },
  important: { label: 'Important', tone: 'important', icon: 'circle-alert' },
  warning: { label: 'Warning', tone: 'warning', icon: 'triangle-alert' },
  caution: { label: 'Caution', tone: 'caution', icon: 'octagon-alert' }
};
const mapping = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const namePattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const hexColor = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export function resolveCalloutTypes(config: unknown, file: string): CalloutTypes {
  const types: CalloutTypes = new Map(Object.entries(defaults));
  if (config === undefined) return types;
  if (!mapping(config) || Object.keys(config).some(key => !['types', 'tones'].includes(key)) || (config.types !== undefined && !mapping(config.types)) || (config.tones !== undefined && !mapping(config.tones))) throw new Error(`${file}: callouts must contain types and/or tones mappings`);
  const tones = new Map<string, CalloutColors>();
  for (const [name, value] of Object.entries(config.tones ?? {})) {
    if (!namePattern.test(name)) throw new Error(`${file}: callouts.tones name "${name}" must use lowercase kebab-case`);
    if (!mapping(value) || Object.keys(value).some(key => !['line', 'background', 'text', 'dark'].includes(key))) throw new Error(`${file}: callouts.tones.${name} only accepts line, background, text, and dark`);
    for (const key of ['line', 'background', 'text'] as const) if (typeof value[key] !== 'string' || !hexColor.test(value[key])) throw new Error(`${file}: callouts.tones.${name}.${key} must be a hex color`);
    const dark = value.dark;
    if (dark !== undefined) {
      if (!mapping(dark) || Object.keys(dark).some(key => !['line', 'background', 'text'].includes(key))) throw new Error(`${file}: callouts.tones.${name}.dark only accepts line, background, and text`);
      for (const key of ['line', 'background', 'text'] as const) if (typeof dark[key] !== 'string' || !hexColor.test(dark[key])) throw new Error(`${file}: callouts.tones.${name}.dark.${key} must be a hex color`);
    }
    const colors = { line: value.line as string, background: value.background as string, text: value.text as string };
    tones.set(name, dark === undefined ? colors : { ...colors, dark: { line: dark.line as string, background: dark.background as string, text: dark.text as string } });
  }
  for (const [name, value] of Object.entries(config.types ?? {})) {
    if (!namePattern.test(name)) throw new Error(`${file}: callouts.types name "${name}" must use lowercase kebab-case`);
    if (!mapping(value) || Object.keys(value).some(key => !['label', 'tone', 'icon'].includes(key))) throw new Error(`${file}: callouts.types.${name} only accepts label, tone, and icon`);
    const original = types.get(name);
    const label = value.label ?? original?.label;
    const tone = value.tone ?? original?.tone;
    const icon = value.icon ?? original?.icon;
    if (typeof label !== 'string' || !label.trim()) throw new Error(`${file}: callouts.types.${name}.label must be nonempty text`);
    if (typeof tone !== 'string' || !(calloutTones.includes(tone as typeof calloutTones[number]) || tones.has(tone))) throw new Error(`${file}: callouts.types.${name}.tone must be a built-in or registered tone`);
    if (icon !== undefined) {
      if (typeof icon !== 'string') throw new Error(`${file}: callouts.types.${name}.icon must be a Lucide icon name`);
      validateLucideIcon(icon, file, `callouts.types.${name}.icon`);
    }
    types.set(name, { label: label.trim(), tone, icon, ...(tones.has(tone) ? { colors: tones.get(tone) } : {}) });
  }
  for (const [name, definition] of types) if (tones.has(definition.tone)) types.set(name, { ...definition, colors: tones.get(definition.tone) });
  return types;
}
