import { randomUUID } from 'node:crypto';
import { lstat, mkdir, open, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { canonical } from './output-location.js';

const running = (pid: number) => { try { process.kill(pid, 0); return true; } catch (error) { return (error as NodeJS.ErrnoException).code === 'EPERM'; } };

async function lockOutput(target: string): Promise<() => Promise<void>> {
  const file = `${target}.shoalrun.lock`;
  await mkdir(path.dirname(target), { recursive: true });
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const handle = await open(file, 'wx');
      try { await handle.writeFile(String(process.pid)); }
      catch (error) { await handle.close(); await rm(file, { force: true }); throw error; }
      return async () => { await handle.close(); await rm(file, { force: true }); };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      const pid = Number(await readFile(file, 'utf8').catch(() => '0'));
      if (!pid || running(pid)) throw new Error(`Output directory ${target} is already being built`);
      await rm(file, { force: true });
    }
  }
  throw new Error(`Output directory ${target} is already being built`);
}

async function recoverOutput(target: string): Promise<void> {
  const directory = path.dirname(target);
  const prefix = `${path.basename(target)}.staging-`;
  const entries = await readdir(directory).catch(() => [] as string[]);
  const abandoned: string[] = [];
  for (const name of entries) {
    const match = name.startsWith(prefix) ? /^(\d+)(?:-[a-f0-9-]+)?(?:-previous)?$/.exec(name.slice(prefix.length)) : null;
    if (!match || Number(match[1]) === process.pid || running(Number(match[1]))) continue;
    abandoned.push(path.join(directory, name));
  }
  const previous = abandoned.filter(file => file.endsWith('-previous'));
  const exists = await stat(target).then(() => true, (error: NodeJS.ErrnoException) => { if (error.code === 'ENOENT') return false; throw error; });
  if (!exists && previous.length) {
    const byAge = await Promise.all(previous.map(async file => ({ file, time: (await stat(file)).mtimeMs })));
    const latest = byAge.sort((a, b) => b.time - a.time)[0].file;
    await rename(latest, target);
  }
  for (const file of abandoned) await rm(file, { recursive: true, force: true });
}

async function checkReplaceable(target: string, kind: 'site' | 'export'): Promise<void> {
  const entries = await readdir(target).catch((error: NodeJS.ErrnoException) => { if (error.code === 'ENOENT') return [] as string[]; throw error; });
  if (!entries.length) return;
  if (kind === 'site' && entries.includes('documents.json') && entries.includes('resource-headers.json')) return;
  if (kind === 'export' && entries.includes('manifest.json')) {
    const manifest = JSON.parse(await readFile(path.join(target, 'manifest.json'), 'utf8'));
    if (manifest.kind === 'shoalrun-content-export' && manifest.schemaVersion === 1) return;
  }
  throw new Error(`Output directory ${target} already exists and is not an earlier Shoalrun ${kind === 'site' ? 'build (it has no documents.json and resource-headers.json)' : 'content export'}. The build replaces its output directory, so it stopped instead of deleting it. Choose a new or empty directory`);
}

export async function commitArtifacts(target: string, artifacts: Map<string, string | Buffer>, prepare?: () => Promise<void>, kind: 'site' | 'export' = 'site'): Promise<void> {
  // A leading slash denotes a public route, never an absolute filesystem path.
  // Check every entry before acquiring a lock or running preparation callbacks.
  const names = new Set<string>();
  for (const route of artifacts.keys()) {
    const relative = route.replace(/^\//, '');
    if (!relative || /[\\\0:]/.test(relative) || relative.split('/').some(part => !part || part === '.' || part === '..')) {
      throw new Error(`Unsafe output artifact path: ${route}`);
    }
    if (names.has(relative)) throw new Error(`Duplicate output artifact path: ${route}`);
    names.add(relative);
  }
  // Aliases of the parent directory must share the same output lock. Refuse a
  // symlink at the destination itself instead of following or replacing it.
  target = path.join(canonical(path.dirname(path.resolve(target))), path.basename(target));
  const checkDestination = async () => {
    const info = await lstat(target).catch((error: NodeJS.ErrnoException) => { if (error.code === 'ENOENT') return undefined; throw error; });
    if (info?.isSymbolicLink()) throw new Error(`Output directory must not be a symbolic link: ${target}`);
  };
  await checkDestination();
  const unlock = await lockOutput(target);
  const staging = `${target}.staging-${process.pid}-${randomUUID()}`;
  const previous = `${staging}-previous`;
  try {
    await recoverOutput(target);
    await checkDestination();
    await checkReplaceable(target, kind);
    await prepare?.();
    await mkdir(staging, { recursive: false });
    for (const [route, data] of artifacts) {
      const file = path.join(staging, route.replace(/^\//, ''));
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, data);
    }
    await checkDestination();
    const hadPrevious = await rename(target, previous).then(() => true, (error: NodeJS.ErrnoException) => { if (error.code === 'ENOENT') return false; throw error; });
    try { await rename(staging, target); }
    catch (error) { if (hadPrevious) await rename(previous, target); throw error; }
    await rm(previous, { recursive: true, force: true });
  } finally {
    try { await rm(staging, { recursive: true, force: true }); }
    finally { await unlock(); }
  }
}
