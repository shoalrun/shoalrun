import { randomUUID } from 'node:crypto';
import { mkdir, open, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

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

async function checkReplaceable(target: string): Promise<void> {
  const entries = await readdir(target).catch((error: NodeJS.ErrnoException) => { if (error.code === 'ENOENT') return [] as string[]; throw error; });
  if (!entries.length || (entries.includes('documents.json') && entries.includes('resource-headers.json'))) return;
  throw new Error(`Output directory ${target} already exists and is not an earlier Shoalrun build (it has no documents.json and resource-headers.json). The build replaces its output directory, so it stopped instead of deleting it. Choose a new or empty directory`);
}

export async function commitArtifacts(target: string, artifacts: Map<string, string | Buffer>, prepare?: () => Promise<void>): Promise<void> {
  const unlock = await lockOutput(target);
  const staging = `${target}.staging-${process.pid}-${randomUUID()}`;
  const previous = `${staging}-previous`;
  try {
    await recoverOutput(target);
    await checkReplaceable(target);
    await prepare?.();
    await mkdir(staging, { recursive: false });
    for (const [route, data] of artifacts) {
      const file = path.join(staging, route.replace(/^\//, ''));
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, data);
    }
    const hadPrevious = await rename(target, previous).then(() => true, (error: NodeJS.ErrnoException) => { if (error.code === 'ENOENT') return false; throw error; });
    try { await rename(staging, target); }
    catch (error) { if (hadPrevious) await rename(previous, target); throw error; }
    await rm(previous, { recursive: true, force: true });
  } finally {
    try { await rm(staging, { recursive: true, force: true }); }
    finally { await unlock(); }
  }
}
