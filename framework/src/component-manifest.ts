import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundleComponent } from './component-bundle.js';
import { explainSegments, type loadConfig } from './config.js';

export type ComponentEntry = { name: string; module: string; browser?: string; styles: string[]; manifest: string };
import { builtinComponentNames as builtins } from './component-names.js';
const mapping = (value: unknown): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value);
/** Static manifest discovery; compiling imports never executes the configured code. */
export async function discoverComponents(loaded: Awaited<ReturnType<typeof loadConfig>>) {
  const settings = loaded.value.components;
  if (settings === undefined) return { entries: [] as ComponentEntry[], dependencies: [] as string[] };
  if (!Array.isArray(settings) || settings.some(value => typeof value !== 'string' || !value.trim())) throw new Error('components must be a list of local component manifests or installed package names');
  const entries: ComponentEntry[] = [];
  const dependencies = new Set<string>();
  const names = new Set<string>();
  for (const [index, reference] of settings.entries()) {
    const owner = explainSegments(loaded, ['components', String(index)]).source.file;
    if (path.isAbsolute(reference) || /^[a-z][a-z0-9+.-]*:/i.test(reference)) throw new Error(`${owner}: components require relative manifest paths or installed package names; remote and absolute registrations are unsupported`);
    const manifest = reference.startsWith('.') ? path.resolve(path.dirname(owner), reference) : createRequire(owner).resolve(reference);
    if (!manifest.endsWith('.json')) throw new Error(`${owner}: ${reference} must resolve to a component manifest (.json)`);
    dependencies.add(manifest);
    let value: any;
    try { value = JSON.parse(await readFile(manifest, 'utf8')); }
    catch (error) { throw new Error(`${manifest}: cannot read component manifest: ${(error as Error).message}`); }
    if (!mapping(value) || value.apiVersion !== 1 || !mapping(value.components) || !Object.keys(value.components).length || Object.keys(value).some(key => !['apiVersion', 'components'].includes(key))) throw new Error(`${manifest}: expected apiVersion: 1 and a nonempty components mapping`);
    const resolve = (file: unknown, label: string) => {
      if (typeof file !== 'string' || !file.startsWith('./') || path.isAbsolute(file)) throw new Error(`${manifest}: ${label} must be a relative local path starting with ./`);
      return path.resolve(path.dirname(manifest), file);
    };
    for (const [name, entry] of Object.entries(value.components)) {
      if (!/^[A-Z][A-Za-z0-9]*$/.test(name) || builtins.has(name) || names.has(name)) throw new Error(`${manifest}: <${name}> has an invalid, duplicate, or built-in name`);
      names.add(name);
      if (!mapping(entry) || Object.keys(entry).some(key => !['module', 'browser', 'styles'].includes(key))) throw new Error(`${manifest}: <${name}> accepts module, optional browser, and optional styles`);
      const module = resolve(entry.module, `${name}.module`);
      if (!/\.(?:m?js|ts)$/.test(module)) throw new Error(`${manifest}: ${name}.module must be JavaScript or TypeScript`);
      const browser = entry.browser === undefined ? undefined : resolve(entry.browser, `${name}.browser`);
      if (browser && !/\.(?:m?js|[jt]sx?|tsx)$/.test(browser)) throw new Error(`${manifest}: ${name}.browser must be JavaScript, TypeScript, or JSX`);
      if (entry.styles !== undefined && (!Array.isArray(entry.styles) || entry.styles.some((file: unknown) => typeof file !== 'string' || !file.endsWith('.css')))) throw new Error(`${manifest}: ${name}.styles must be a list of CSS files`);
      if (!browser && entry.styles?.length) throw new Error(`${manifest}: ${name}.styles needs a browser enhancement`);
      entries.push({ name, module, browser, styles: (entry.styles ?? []).map((file: string) => resolve(file, `${name}.styles`)), manifest });
    }
    // Preserve installed package resolution metadata in isolated snapshots.
    if (!reference.startsWith('.')) {
      let directory = path.dirname(manifest);
      while (directory !== path.dirname(directory)) {
        const file = path.join(directory, 'package.json');
        if (await readFile(file).then(() => true, () => false)) { dependencies.add(file); break; }
        directory = path.dirname(directory);
      }
    }
  }
  return { entries, dependencies: [...dependencies] };
}

/** Capture imported JS/TS/JSON and browser dependencies, without running plugins. */
export async function componentPluginFiles(loaded: Awaited<ReturnType<typeof loadConfig>>) {
  const { entries, dependencies } = await discoverComponents(loaded);
  for (const entry of entries) {
    dependencies.push(...(await bundleComponent(entry.module, 'node')).dependencies, ...entry.styles);
    if (entry.browser) dependencies.push(...(await bundleComponent(entry.browser, 'browser')).dependencies);
  }
  const framework = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  return [...new Set(dependencies)].filter(file => !file.startsWith(path.join(framework, 'dist') + path.sep) && !file.startsWith(path.join(framework, 'node_modules') + path.sep)).sort();
}
