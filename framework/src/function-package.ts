import { cp, mkdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const importPattern = /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|^import\s*['"]([^'"]+)['"]/gm;

// The compiled files a module needs, followed through its relative imports, and the packages it names.
async function closure(dist: string, entry: string): Promise<{ files: string[]; packages: string[] }> {
  const files = new Set<string>();
  const packages = new Set<string>();
  const visit = async (file: string): Promise<void> => {
    if (path.isAbsolute(file) || file.split(path.sep).includes('..')) throw new Error('Server adapter relative imports must stay inside its module directory');
    if (files.has(file)) return;
    files.add(file);
    const source = await readFile(path.join(dist, file), 'utf8');
    for (const match of source.matchAll(importPattern)) {
      const specifier = match[1] ?? match[2] ?? match[3];
      if (!specifier || specifier.startsWith('node:')) continue;
      if (specifier.startsWith('.')) await visit(path.normalize(path.join(path.dirname(file), specifier)));
      else packages.add(specifier.startsWith('@') ? specifier.split('/').slice(0, 2).join('/') : specifier.split('/')[0]);
    }
  };
  await visit(entry);
  return { files: [...files], packages: [...packages] };
}

// A package and the packages it depends on, copied whole.
async function copyPackage(name: string, from: string, target: string, done: Set<string>): Promise<void> {
  if (done.has(name)) return;
  done.add(name);
  let directory: string | undefined;
  for (let at = from; !directory; at = path.dirname(at)) {
    const candidate = path.join(at, 'node_modules', name);
    if (await stat(path.join(candidate, 'package.json')).then(() => true, () => false)) directory = candidate;
    else if (path.dirname(at) === at) break;
  }
  if (!directory) throw new Error(`The server function needs the package ${name}, and it is not installed`);
  await cp(directory, path.join(target, 'node_modules', name), { recursive: true, dereference: true });
  const manifest = JSON.parse(await readFile(path.join(directory, 'package.json'), 'utf8')) as { dependencies?: Record<string, string>; peerDependencies?: Record<string, string>; peerDependenciesMeta?: Record<string, { optional?: boolean }> };
  const requiredPeers = Object.keys(manifest.peerDependencies ?? {}).filter(name => !manifest.peerDependenciesMeta?.[name]?.optional);
  for (const dependency of new Set([...Object.keys(manifest.dependencies ?? {}), ...requiredPeers])) await copyPackage(dependency, path.dirname(directory), target, done);
}

export async function copyFunctionRuntime(dist: string, entry: string, target: string): Promise<void> {
  const { files, packages } = await closure(dist, entry);
  for (const file of files) {
    await mkdir(path.dirname(path.join(target, 'lib', file)), { recursive: true });
    await cp(path.join(dist, file), path.join(target, 'lib', file));
  }
  const done = new Set<string>();
  for (const name of packages) await copyPackage(name, dist, target, done);
}
