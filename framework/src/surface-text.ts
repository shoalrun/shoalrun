export type TextSurface = 'card' | 'pageHeader' | 'search' | 'htmlDescription' | 'socialCard';

const surfaces = new Set<TextSurface>(['card', 'pageHeader', 'search', 'htmlDescription', 'socialCard']);
const defaults: Partial<Record<TextSurface, string[]>> = {
  card: ['summary'], pageHeader: ['summary'], search: ['summary'], htmlDescription: ['summary']
};
const fieldPath = /^[A-Za-z_][A-Za-z0-9_-]*(?:\.[A-Za-z_][A-Za-z0-9_-]*)*$/;
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

export function validateTextSurfaces(config: unknown): void {
  if (config === undefined) return;
  if (!object(config)) throw new Error('outputs.text must be a mapping');
  for (const [surface, fields] of Object.entries(config)) {
    if (!surfaces.has(surface as TextSurface)) throw new Error(`Unknown text surface ${surface}`);
    if (!Array.isArray(fields) || fields.some(field => typeof field !== 'string' || !fieldPath.test(field) || field.split('.').some(part => ['__proto__', 'prototype', 'constructor'].includes(part)))) throw new Error(`outputs.text.${surface} must list frontmatter field paths`);
  }
}

export function validatePageText(value: unknown, file: string): void {
  if (value === undefined) return;
  if (!object(value)) throw new Error(`${file}: displayText must be a mapping`);
  for (const [surface, text] of Object.entries(value)) {
    if (!surfaces.has(surface as TextSurface)) throw new Error(`${file}: unknown displayText surface ${surface}`);
    if (typeof text !== 'string' || !text.trim()) throw new Error(`${file}: displayText.${surface} must be nonempty text`);
  }
}

export function surfaceText(frontmatter: Record<string, unknown>, surface: TextSurface, config: any = {}): string | undefined {
  const override = (frontmatter.displayText as Record<string, string> | undefined)?.[surface];
  if (override !== undefined) return override;
  const fields: string[] = config.outputs?.text?.[surface] ?? defaults[surface] ?? [];
  for (const field of fields) {
    const value = field.split('.').reduce<unknown>((at, part) => object(at) ? at[part] : undefined, frontmatter);
    if (typeof value === 'string' && value.trim()) return value;
  }
  return undefined;
}
