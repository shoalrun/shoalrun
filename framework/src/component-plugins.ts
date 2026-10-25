import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import type { loadConfig } from './config.js';
import { bundleComponent } from './component-bundle.js';
import { discoverComponents } from './component-manifest.js';
import { componentContent, type ComponentDefinition, type JsonValue } from './component-content.js';

export type ComponentBrowser = { moduleUrl: string; styleUrls: string[] };
export type ComponentRegistry = Map<string, { definition: ComponentDefinition; browser?: ComponentBrowser }>;
export type ComponentAsset = { route: string; content: string };
const object = (value: unknown): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value);
const digest = (content: string) => createHash('sha256').update(content).digest('hex');

export async function loadComponentPlugins(loaded: Awaited<ReturnType<typeof loadConfig>>, options: { browser?: boolean } = {}) {
  const discovery = await discoverComponents(loaded);
  const dependencies = new Set(discovery.dependencies);
  const registry: ComponentRegistry = new Map();
  const assets = new Map<string, ComponentAsset>();
  for (const entry of discovery.entries) {
    const built = await bundleComponent(entry.module, 'node');
    for (const file of built.dependencies) dependencies.add(file);
    let definition: ComponentDefinition;
    try {
      // A fresh module instance per build, including its imported modules. No
      // data-URL import cache or separately maintained dependency declarations.
      const module = { exports: {} as any };
      const require = createRequire(entry.module);
      new Function('module', 'exports', 'require', '__filename', '__dirname', built.code)(module, module.exports, require, entry.module, path.dirname(entry.module));
      definition = module.exports.default;
    } catch (error) { throw new Error(`${entry.module}: <${entry.name}> cannot load component: ${(error as Error).message}`); }
    const fail = (message: string): never => { throw new Error(`${entry.module}: <${entry.name}> ${message}`); };
    if (!object(definition) || typeof definition.content !== 'function') fail('requires content() to generate HTML and Markdown; HTML-only renderers are unsupported');
    if (Object.keys(definition).some(key => !['attributes', 'children', 'content'].includes(key))) fail('accepts attributes, children, and content(); separate HTML/Markdown renderers are unsupported');
    if (definition.children !== undefined && !['none', 'optional', 'required'].includes(definition.children)) fail('children must be none, optional, or required');
    if (definition.attributes !== undefined && !object(definition.attributes)) fail('attributes must be a mapping');
    for (const [key, declared] of Object.entries(definition.attributes ?? {})) {
      const schema: Record<string, any> = declared;
      if (!object(schema) || Object.keys(schema).some(key => !['type', 'required', 'default', 'values', 'min', 'max', 'integer'].includes(key)) || !['string', 'boolean', 'number'].includes(schema.type)) fail(`has invalid attribute schema ${key}`);
      if (schema.default !== undefined && typeof schema.default !== schema.type || schema.required !== undefined && typeof schema.required !== 'boolean') fail(`has invalid default or required setting for ${key}`);
      if (schema.values !== undefined && (schema.type !== 'string' || !Array.isArray(schema.values) || !schema.values.length || schema.values.some((value: unknown) => typeof value !== 'string') || schema.default !== undefined && !schema.values.includes(String(schema.default)))) fail(`has invalid values for ${key}`);
      if ((schema.min !== undefined || schema.max !== undefined || schema.integer !== undefined) && schema.type !== 'number' || schema.min !== undefined && !Number.isFinite(schema.min) || schema.max !== undefined && !Number.isFinite(schema.max) || schema.min !== undefined && schema.max !== undefined && schema.min > schema.max || schema.integer !== undefined && typeof schema.integer !== 'boolean') fail(`has invalid numeric constraints for ${key}`);
      if (typeof schema.default === 'number' && (!Number.isFinite(schema.default) || schema.integer && !Number.isInteger(schema.default) || schema.min !== undefined && schema.default < schema.min || schema.max !== undefined && schema.default > schema.max)) fail(`has invalid numeric default for ${key}`);
    }
    let browser: ComponentBrowser | undefined;
    if (entry.browser && options.browser !== false) {
      const publish = (content: string, extension: string) => {
        const route = `/assets/components/${digest(content)}${extension}`;
        assets.set(route, { route, content });
        return route;
      };
      const client = await bundleComponent(entry.browser, 'browser');
      for (const file of client.dependencies) dependencies.add(file);
      browser = { moduleUrl: publish(client.code, '.js'), styleUrls: [] };
      for (const file of entry.styles) { dependencies.add(file); browser.styleUrls.push(publish(await readFile(file, 'utf8'), '.css')); }
    }
    registry.set(entry.name, { definition, browser });
  }
  return { registry, dependencies: [...dependencies].sort(), assets: [...assets.values()] };
}

function jsonData(value: unknown): JsonValue {
  const seen = new Set<object>();
  const check = (item: unknown): void => {
    if (item === null || typeof item === 'string' || typeof item === 'boolean' || typeof item === 'number' && Number.isFinite(item)) return;
    if (typeof item !== 'object' || item === null || seen.has(item) || !Array.isArray(item) && Object.getPrototypeOf(item) !== Object.prototype && Object.getPrototypeOf(item) !== null) throw new Error('browser data must contain only JSON values, without functions, cycles, dates, or non-finite numbers');
    seen.add(item);
    for (const child of Array.isArray(item) ? item : Object.values(item)) check(child);
    seen.delete(item);
  };
  check(value);
  return JSON.parse(JSON.stringify(value));
}

export function lowerComponent(node: any, registry: ComponentRegistry, location: string) {
  const { definition } = registry.get(node.name)!;
  const attributes: Record<string, string | boolean | number> = Object.create(null);
  for (const [key, schema] of Object.entries(definition.attributes ?? {})) if (schema.default !== undefined) attributes[key] = schema.default;
  const seen = new Set<string>();
  for (const attr of node.attributes ?? []) {
    const schema = definition.attributes?.[attr.name];
    if (!schema || !Object.hasOwn(definition.attributes!, attr.name) || attr.type !== 'mdxJsxAttribute' || seen.has(attr.name) || attr.value !== null && typeof attr.value !== 'string') throw new Error(`${location}: unknown, duplicate, or nonliteral attribute ${attr.name}`);
    seen.add(attr.name);
    if (schema.type === 'boolean') {
      if (attr.value !== null && attr.value !== 'true' && attr.value !== 'false') throw new Error(`${location}: ${attr.name} must be bare, "true", or "false"`);
      attributes[attr.name] = attr.value !== 'false';
    } else if (typeof attr.value !== 'string') throw new Error(`${location}: ${attr.name} needs a literal ${schema.type}`);
    else if (schema.type === 'string') attributes[attr.name] = attr.value;
    else {
      const number = Number(attr.value);
      if (!attr.value.trim() || !Number.isFinite(number) || schema.integer && !Number.isInteger(number) || schema.min !== undefined && number < schema.min || schema.max !== undefined && number > schema.max) throw new Error(`${location}: ${attr.name} violates its numeric constraints`);
      attributes[attr.name] = number;
    }
  }
  for (const [key, schema] of Object.entries(definition.attributes ?? {})) {
    if (schema.required && attributes[key] === undefined) throw new Error(`${location}: missing required attribute ${key}`);
    if (schema.type === 'string' && schema.values && attributes[key] !== undefined && !schema.values.includes(String(attributes[key]))) throw new Error(`${location}: ${key} must be one of ${schema.values.join(', ')}`);
  }
  const children = node.children ?? [];
  const policy = definition.children ?? 'none';
  if (policy === 'none' && children.length || policy === 'required' && !children.length) throw new Error(`${location}: children must be ${policy}`);
  try {
    const output = definition.content({ attributes: Object.freeze(attributes), children: componentContent.wrap(structuredClone(children)) });
    if (object(output) && typeof (output as any).then === 'function') throw new Error('content() must be synchronous; use statically imported local data');
    const record: Record<string, any> | undefined = object(output) ? output as Record<string, any> : undefined;
    const result = record && Object.hasOwn(record, 'content') ? record.content : output;
    const nodes = componentContent.nodes(result);
    if (!nodes.length) throw new Error('content() must return nonempty shared documentation for HTML and Markdown');
    const data = record && Object.hasOwn(record, 'content') ? jsonData(record.data ?? null) : null;
    return { nodes, data };
  } catch (error) { throw new Error(`${location}: content() failed: ${(error as Error).message}`); }
}
