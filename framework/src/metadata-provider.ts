import path from 'node:path';
import { pathToFileURL } from 'node:url';

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const safeKey = (key: string) => /^[A-Za-z_][A-Za-z0-9_-]*$/.test(key) && !['__proto__', 'prototype', 'constructor'].includes(key);
const fixed = new Set(['id', 'slug', 'channel', 'version', 'language', 'access']);

export type MetadataContext = { file: string; source: Readonly<Record<string, unknown>>; projectRoot: string };
export type MetadataResult = { values: Record<string, unknown>; ownedKeys?: string[]; dependencies?: string[] };
export type MetadataProvider = (context: MetadataContext) => Promise<MetadataResult | undefined> | MetadataResult | undefined;

export async function loadMetadataProvider(setting: unknown, declaringFile: string): Promise<{ provide: MetadataProvider; module: string } | undefined> {
  if (setting === undefined) return undefined;
  if (!object(setting) || Object.keys(setting).some(key => key !== 'module') || typeof setting.module !== 'string' || !setting.module.trim()) throw new Error('metadata.provider needs a local module path');
  const module = path.resolve(path.dirname(declaringFile), setting.module);
  const imported = await import(pathToFileURL(module).href);
  if (typeof imported.provideMetadata !== 'function') throw new Error(`${module}: metadata provider must export provideMetadata(context)`);
  return { provide: imported.provideMetadata, module };
}

export function mergeProvidedMetadata(source: Record<string, unknown>, result: MetadataResult | undefined, file: string): { page: Record<string, unknown>; dependencies: string[] } {
  if (result === undefined) return { page: source, dependencies: [] };
  if (!object(result) || !object(result.values)) throw new Error(`${file}: metadata provider must return { values }`);
  const values = result.values;
  const ownedKeys = result.ownedKeys ?? Object.keys(values);
  if (!Array.isArray(ownedKeys) || ownedKeys.some(key => typeof key !== 'string' || !safeKey(key)) || new Set(ownedKeys).size !== ownedKeys.length) throw new Error(`${file}: metadata provider ownedKeys must be unique top-level field names`);
  for (const key of Object.keys(values)) {
    if (!safeKey(key) || fixed.has(key)) throw new Error(`${file}: metadata provider cannot set ${key}`);
    if (!ownedKeys.includes(key)) throw new Error(`${file}: metadata provider value ${key} must be owned`);
  }
  for (const key of ownedKeys) if (Object.hasOwn(source, key)) throw new Error(`${file}: ${key} is owned by the metadata provider and also appears in page frontmatter`);
  if (result.dependencies !== undefined && (!Array.isArray(result.dependencies) || result.dependencies.some(item => typeof item !== 'string' || !path.isAbsolute(item)))) throw new Error(`${file}: metadata provider dependencies must be absolute file paths`);
  return { page: { ...source, ...values }, dependencies: result.dependencies ?? [] };
}
