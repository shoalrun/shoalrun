import { readFile, lstat, realpath } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parseYaml } from './yaml-value.js';
import { defaultLanguage } from './frontmatter.js';
import { paletteCatalog, presetCatalog } from './palettes.js';
import { validateHeader, validateFooter } from './site-identity.js';
import { normalizeBasePath } from './site-path.js';

const object = (value: unknown): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value);
const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const id = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value);
function keys(value: unknown, allowed: string[], label: string): asserts value is Record<string, any> {
  if (!object(value)) throw new Error(`${label} must be a mapping`);
  for (const key of Object.keys(value)) if (!allowed.includes(key)) throw new Error(`${label}: unsupported setting ${key}`);
}
function names(value: unknown, label: string, nonempty = false): string[] {
  if (!Array.isArray(value) || (nonempty && !value.length) || value.some(item => !id(item))) throw new Error(`${label} must be ${nonempty ? 'a nonempty' : 'a'} list of feature IDs`);
  return [...new Set(value)];
}
function profileData(value: unknown) {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error(`Deployment profile: unsupported data key ${key}`);
    profileData(child);
  }
}
export type FeatureRequirements = { allOf?: string[]; anyOf?: string[] };
export type FeatureContext = {
  requireClassification?: boolean;
  classificationPublications?: Array<{ channel: string; version: string; language: string }>;
  features: Set<string>; grants?: Set<string>; digest: string; pruneNavigation: boolean;
  decisions: Array<{ kind: 'page' | 'section'; id: string; included: boolean; requires?: FeatureRequirements }>;
  provenance: Record<string, string[]>;
};
export type ProfileResolution = { context: FeatureContext; overlay: Record<string, unknown>; file?: string; dependencies: string[]; assetFiles: string[]; digest: string };

/** Classification is an authored decision, never inferred from merged defaults. */
export function validateFeatureClassification(source: Record<string, unknown>, context: FeatureContext | undefined, label: string): void {
  if (source.shared !== undefined && source.shared !== true) throw new Error(`${label}: shared must be true; use requires for restricted content`);
  if (source.shared === true && source.requires !== undefined) throw new Error(`${label}: declare shared: true or requires, not both`);
  if (context?.requireClassification && source.shared !== true && source.requires === undefined) throw new Error(`${label}: unclassified content; declare shared: true or requires explicitly in this source (inherited defaults do not count)`);
  if (source.requires !== undefined) featureRequirements(source.requires, context, label);
}

export function featureRequirements(value: unknown, context: FeatureContext | undefined, label: string): FeatureRequirements | undefined {
  if (value === undefined) return;
  keys(value, ['allOf', 'anyOf'], `${label}: requires`);
  if (!Object.keys(value).length) throw new Error(`${label}: requires needs allOf or anyOf`);
  if (!context) throw new Error(`${label}: feature requirements need profiles.manifest and an explicit --profile`);
  const result: FeatureRequirements = {};
  for (const clause of ['allOf', 'anyOf'] as const) if (value[clause] !== undefined) {
    result[clause] = names(value[clause], `${label}: requires.${clause}`, true);
    for (const name of result[clause]!) if (!context.features.has(name)) throw new Error(`${label}: unknown feature ${name}`);
  }
  if (!context.grants) throw new Error(`${label}: feature requirements need an explicit --profile (an empty feature list is valid)`);
  return result;
}
export function matchesFeatures(value: unknown, context: FeatureContext | undefined, label: string, kind: 'page' | 'section' = 'page'): boolean {
  const requirement = featureRequirements(value, context, label);
  const included = !requirement || ((!requirement.allOf || requirement.allOf.every(name => context!.grants!.has(name))) && (!requirement.anyOf || requirement.anyOf.some(name => context!.grants!.has(name))));
  context?.decisions.push({ kind, id: label, included, ...(requirement ? { requires: requirement } : {}) });
  return included;
}

/** Validate every condition, but never resolve a dependency in an excluded branch. */
export function pruneFeatureTree(tree: any, context: FeatureContext | undefined, file: string): any {
  const walk = (node: any, parentIncluded = true): any[] => {
    if (!node || typeof node !== 'object') return [node];
    if (node.name === 'ForFeature') {
      const label = `${file}:${node.position?.start?.line ?? 1}: <ForFeature>`;
      const attributes = node.attributes ?? [];
      if (node.type !== 'mdxJsxFlowElement' || !node.children?.length || !attributes.length || attributes.some((item: any) => item.type !== 'mdxJsxAttribute' || !['allOf', 'anyOf'].includes(item.name) || typeof item.value !== 'string') || new Set(attributes.map((item: any) => item.name)).size !== attributes.length) throw new Error(`${label} needs block content and distinct literal allOf/anyOf attributes`);
      const requirements = Object.fromEntries(attributes.map((item: any) => [item.name, item.value.trim().split(/\s+/).filter(Boolean)]));
      const included = matchesFeatures(requirements, context, label, 'section');
      if (!parentIncluded && context?.decisions.length) context.decisions[context.decisions.length - 1].included = false;
      const children = node.children.flatMap((child: any) => walk(child, parentIncluded && included));
      return included && parentIncluded ? children : [];
    }
    return [{ ...node, ...(node.children ? { children: node.children.flatMap((child: any) => walk(child, parentIncluded)) } : {}) }];
  };
  return walk(tree)[0];
}

/** Returned to the caller or written under .shoalrun, never a served artifact. */
export function profileSelection(resolution: ProfileResolution | undefined) {
  if (!resolution?.context.grants) return;
  return { schemaVersion: 1, profileDigest: resolution.digest, features: [...resolution.context.grants].sort(), provenance: resolution.context.provenance, decisions: resolution.context.decisions };
}

/** A profile is data, never executable configuration or a directory to discover. */
export async function resolveDeploymentProfile(settings: unknown, config: Record<string, any>, declaringFile: string, profileFile?: string): Promise<ProfileResolution | undefined> {
  if (settings === undefined) {
    if (profileFile) throw new Error('--profile requires profiles.manifest in the shared configuration');
    return;
  }
  keys(settings, ['manifest', 'required', 'pruneNavigation', 'requireClassification'], 'profiles');
  if (typeof settings.manifest !== 'string' || !settings.manifest.trim()) throw new Error('profiles.manifest must be a local path');
  for (const setting of ['required', 'pruneNavigation', 'requireClassification']) if (settings[setting] !== undefined && typeof settings[setting] !== 'boolean') throw new Error(`profiles.${setting} must be boolean`);
  const manifestFile = path.resolve(path.dirname(declaringFile), settings.manifest);
  const manifestBytes = await readFile(manifestFile);
  const manifest = parseYaml(manifestBytes.toString('utf8'), manifestFile);
  keys(manifest, ['schemaVersion', 'features', 'skus'], 'SKU manifest');
  if (manifest.schemaVersion !== 1 || !object(manifest.features) || !object(manifest.skus)) throw new Error('SKU manifest needs schemaVersion: 1, features, and skus mappings');
  const features = new Set(Object.keys(manifest.features));
  for (const [name, definition] of Object.entries(manifest.features)) {
    if (!id(name)) throw new Error(`SKU manifest: invalid feature ID ${name}`);
    keys(definition, ['description', 'lifecycle'], `Feature ${name}`);
    if (definition.description !== undefined && typeof definition.description !== 'string') throw new Error(`Feature ${name}: description must be text`);
    if (definition.lifecycle !== undefined && !['active', 'deprecated', 'retired'].includes(definition.lifecycle)) throw new Error(`Feature ${name}: invalid lifecycle`);
  }
  for (const [sku, definition] of Object.entries(manifest.skus)) {
    if (!id(sku)) throw new Error(`SKU manifest: invalid SKU ID ${sku}`);
    keys(definition, ['revisions'], `SKU ${sku}`);
    if (!object(definition.revisions) || !Object.keys(definition.revisions).length) throw new Error(`SKU ${sku}: revisions must be a nonempty mapping`);
    for (const [revision, grant] of Object.entries(definition.revisions)) {
      if (!id(revision)) throw new Error(`SKU ${sku}: invalid revision ${revision}`);
      keys(grant, ['features'], `SKU ${sku}@${revision}`);
      for (const feature of names(grant.features, `SKU ${sku}@${revision}.features`)) if (!features.has(feature)) throw new Error(`SKU ${sku}@${revision}: unknown feature ${feature}`);
    }
  }
  const digest = hash(manifestBytes);
  const context: FeatureContext = { features, digest, pruneNavigation: settings.pruneNavigation ?? false, decisions: [], provenance: Object.create(null) };
  context.requireClassification = settings.requireClassification ?? false;
  if (context.requireClassification) context.classificationPublications = (config.publications?.enabled ?? []).map((entry: Record<string, any>) => ({ channel: entry.channel, version: entry.version, language: entry.language ?? defaultLanguage(config) }));
  if (!profileFile) {
    if (settings.required !== false) throw new Error('This project requires an explicit --profile FILE');
    return { context, overlay: {}, dependencies: [manifestFile], assetFiles: [], digest };
  }
  const file = await realpath(path.resolve(profileFile));
  const bytes = await readFile(file);
  const profile = parseYaml(bytes.toString('utf8'), file);
  profileData(profile);
  keys(profile, ['schemaVersion', 'skus', 'features', 'site', 'theme', 'variables', 'publications'], 'Deployment profile');
  if (profile.schemaVersion !== 1) throw new Error('Deployment profile needs schemaVersion: 1');
  if (!Object.hasOwn(profile, 'skus') && !Object.hasOwn(profile, 'features')) throw new Error('Deployment profile must declare skus or features explicitly (empty lists are valid)');
  const grants = new Set<string>();
  const add = (feature: string, reason: string) => {
    if (!features.has(feature)) throw new Error(`Deployment profile: unknown feature ${feature}`);
    grants.add(feature);
    (context.provenance[feature] ??= []).push(reason);
  };
  if (profile.skus !== undefined) {
    if (!Array.isArray(profile.skus)) throw new Error('Deployment profile skus must be a list');
    for (const purchase of profile.skus) {
      keys(purchase, ['id', 'revision'], 'Profile SKU');
      if (!id(purchase.id) || !id(purchase.revision)) throw new Error('Profile SKU needs explicit id and revision strings');
      const definition = manifest.skus[purchase.id];
      if (!Object.hasOwn(manifest.skus, purchase.id) || !Object.hasOwn(definition.revisions, purchase.revision)) throw new Error(`Deployment profile: unknown SKU revision ${purchase.id}@${purchase.revision}`);
      for (const feature of definition.revisions[purchase.revision].features) add(feature, `sku:${purchase.id}@${purchase.revision}`);
    }
  }
  for (const feature of names(profile.features === undefined ? [] : profile.features, 'Deployment profile features')) add(feature, 'direct');
  context.grants = grants;
  context.digest = hash(JSON.stringify([digest, hash(bytes)]));
  const overlay: Record<string, unknown> = {};
  const assetFiles: string[] = [];
  if (profile.site !== undefined) {
    keys(profile.site, ['title', 'origin', 'basePath', 'favicon', 'logo', 'header', 'footer', 'indexing'], 'Profile site');
    if (profile.site.title !== undefined && (typeof profile.site.title !== 'string' || !profile.site.title.trim())) throw new Error('Profile site.title must be nonempty text');
    if (profile.site.indexing !== undefined && typeof profile.site.indexing !== 'boolean') throw new Error('Profile site.indexing must be boolean');
    if (profile.site.basePath !== undefined) normalizeBasePath(profile.site.basePath);
    if (profile.site.origin !== undefined) {
      let valid = false;
      try { const origin = new URL(profile.site.origin); valid = origin.protocol === 'https:' && origin.origin === profile.site.origin; } catch { /* Report the input contract below. */ }
      if (!valid) throw new Error('Profile site.origin must be an HTTPS origin without a path');
    }
    if (profile.site.header !== undefined) {
      keys(profile.site.header, ['links'], 'Profile site.header');
      validateHeader({ ...(object(config.site?.header) ? config.site.header : {}), ...profile.site.header });
    }
    if (profile.site.footer !== undefined) {
      keys(profile.site.footer, ['columns', 'links', 'text'], 'Profile site.footer');
      validateFooter({ ...(object(config.site?.footer) ? config.site.footer : {}), ...profile.site.footer });
    }
    overlay.site = profile.site;
    for (const setting of ['favicon', 'logo']) if (profile.site[setting] !== undefined) {
      const asset = profile.site[setting];
      if (typeof asset !== 'string' || path.isAbsolute(asset) || !/\.(svg|png)$/i.test(asset)) throw new Error(`Profile site.${setting} must be a relative .svg or .png path`);
      const target = path.resolve(path.dirname(file), asset);
      if (!target.startsWith(path.dirname(file) + path.sep)) throw new Error('Profile asset must stay within the profile directory');
      // Explicit assets only. Symlinks must not introduce an undeclared capture root.
      let current = target;
      while (current !== path.dirname(file)) { if ((await lstat(current)).isSymbolicLink()) throw new Error('Profile assets must not use symlinks'); current = path.dirname(current); }
      if (!(await lstat(target)).isFile()) throw new Error(`Profile ${setting} must be a regular file`);
      assetFiles.push(target);
    }
  }
  if (profile.theme !== undefined) {
    keys(profile.theme, ['preset', 'palette', 'mode', 'toggle'], 'Profile theme');
    // File-backed palettes/fonts and CSS require a separate dependency contract.
    if (profile.theme.palette !== undefined && !paletteCatalog.some(entry => entry.name === profile.theme.palette)) throw new Error('Profile theme.palette must name a built-in palette');
    if (profile.theme.preset !== undefined && !presetCatalog.some(entry => entry.name === profile.theme.preset)) throw new Error('Profile theme.preset must name a built-in preset');
    if (profile.theme.mode !== undefined && !['light', 'dark', 'system'].includes(profile.theme.mode)) throw new Error('Profile theme.mode must be light, dark, or system');
    if (profile.theme.toggle !== undefined && typeof profile.theme.toggle !== 'boolean') throw new Error('Profile theme.toggle must be boolean');
    const mode = profile.theme.mode ?? config.theme?.mode ?? 'light';
    const toggle = profile.theme.toggle ?? config.theme?.toggle ?? (mode === 'system');
    if (toggle && mode !== 'system') throw new Error('Profile theme.toggle needs effective theme.mode: system');
    overlay.theme = profile.theme;
  }
  if (profile.variables !== undefined) {
    if (!object(profile.variables) || Object.entries(profile.variables).some(([key, value]) => !id(key) || (!['string', 'number', 'boolean'].includes(typeof value) || typeof value === 'number' && !Number.isFinite(value)))) throw new Error('Profile variables must map IDs to string, number, or boolean values');
    overlay.variables = profile.variables;
  }
  if (profile.publications !== undefined) {
    keys(profile.publications, ['enabled'], 'Profile publications');
    const enabled = profile.publications.enabled;
    const language = defaultLanguage(config);
    const coordinate = (value: Record<string, unknown>) => JSON.stringify([value.channel, value.version, value.language ?? language]);
    if (!Array.isArray(enabled) || !enabled.length) throw new Error('Profile publications.enabled must be a nonempty subset of shared publications.enabled');
    const selected = new Set<string>();
    for (const variant of enabled) {
      keys(variant, ['channel', 'version', 'language'], 'Profile publication');
      if (typeof variant.channel !== 'string' || typeof variant.version !== 'string' || (variant.language !== undefined && typeof variant.language !== 'string') || !config.publications?.enabled?.some((entry: Record<string, unknown>) => coordinate(entry) === coordinate(variant))) throw new Error('Profile publication is not enabled by the shared configuration');
      const key = coordinate(variant);
      if (selected.has(key)) throw new Error('Profile publications.enabled must not repeat publication coordinates');
      selected.add(key);
    }
    overlay.publications = profile.publications;
  }
  context.digest = hash(JSON.stringify([digest, hash(bytes), await Promise.all(assetFiles.map(async asset => hash(await readFile(asset))))]));
  return { context, overlay, file, dependencies: [manifestFile, file, ...assetFiles], assetFiles, digest: context.digest };
}
