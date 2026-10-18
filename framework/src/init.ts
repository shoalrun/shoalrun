import { constants } from 'node:fs';
import { copyFile, lstat, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type Starter = 'minimal' | 'api-docs';

type StarterEntry = { relative: string; kind: 'directory' | 'file' };

async function existingKind(file: string): Promise<'directory' | 'other' | 'missing'> {
  try {
    const entry = await lstat(file);
    return entry.isDirectory() ? 'directory' : 'other';
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return 'missing';
    throw error;
  }
}

async function entriesUnder(root: string, relative = ''): Promise<StarterEntry[]> {
  const entries: StarterEntry[] = [];
  for (const item of (await readdir(path.join(root, relative), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    if ((!relative && ['.shoalrun', 'dist', 'site-dist'].includes(item.name)) || item.name === '.DS_Store') continue;
    const child = path.join(relative, item.name);
    if (item.isDirectory()) {
      entries.push({ relative: child, kind: 'directory' }, ...await entriesUnder(root, child));
    } else if (item.isFile()) {
      entries.push({ relative: child, kind: 'file' });
    } else {
      throw new Error(`Starter contains an unsupported entry: ${child}`);
    }
  }
  return entries;
}

export async function initProject(targetDirectory: string, starter: Starter = 'minimal') {
  if (starter !== 'minimal' && starter !== 'api-docs') throw new Error(`Unknown starter ${starter}; choose minimal or api-docs`);
  const directory = path.resolve(targetDirectory);
  const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../example-configs', starter);
  const entries = await entriesUnder(source);
  const targetKind = await existingKind(directory);
  if (targetKind === 'other') throw new Error(`Init target is not a directory: ${directory}`);
  for (const entry of entries) {
    const destination = path.join(directory, entry.relative);
    const kind = await existingKind(destination);
    if (entry.kind === 'file' && kind !== 'missing') throw new Error(`Init would overwrite ${destination}`);
    if (entry.kind === 'directory' && kind === 'other') throw new Error(`Init needs a directory at ${destination}`);
  }
  await mkdir(directory, { recursive: true });
  for (const entry of entries) {
    const destination = path.join(directory, entry.relative);
    if (entry.kind === 'directory') await mkdir(destination, { recursive: true });
    else await copyFile(path.join(source, entry.relative), destination, constants.COPYFILE_EXCL);
  }
  return {
    status: 'ok',
    starter,
    directory,
    files: entries.filter(entry => entry.kind === 'file').map(entry => entry.relative.split(path.sep).join('/')),
    next: ['shoalrun config validate docs.config.yaml', 'shoalrun build docs.config.yaml site-dist']
  };
}
