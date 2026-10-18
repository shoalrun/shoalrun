import { watch, type FSWatcher } from 'node:fs';
import type { Server, ServerResponse } from 'node:http';
import path from 'node:path';
import { compile } from './compiler.js';
import { serveSite } from './server.js';

export async function startDev(configFile: string, outputDirectory: string, host = '127.0.0.1', port = 8765): Promise<Server> {
  const config = path.resolve(configFile);
  const root = path.dirname(config);
  const output = path.resolve(outputDirectory);
  const outputPrefix = `${output}${path.sep}`;
  const stagingPrefix = `${output}.staging-`;
  const ignored = new Set(['.git', '.shoalrun', 'node_modules']);
  const clients = new Set<ServerResponse>();
  const initial = await compile(config, output);
  const server = await serveSite(output, host, port, clients);
  process.stdout.write(`Preview: http://${host}:${(server.address() as { port: number }).port}/\n`);

  let timer: NodeJS.Timeout | undefined;
  let dirty = false;
  let running = false;
  const external = new Map<string, { watcher: FSWatcher; names: Set<string> }>();
  const changed = () => {
    dirty = true;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { void rebuild(); }, 180);
  };
  const refreshExternal = (dependencies: string[]) => {
    const needed = new Map<string, Set<string>>();
    for (const dependency of dependencies) {
      const file = path.resolve(dependency);
      if (file === root || (file.startsWith(`${root}${path.sep}`) && !path.relative(root, file).split(path.sep).some(part => ignored.has(part)))) continue;
      const parent = path.dirname(file);
      if (!needed.has(parent)) needed.set(parent, new Set());
      needed.get(parent)!.add(path.basename(file));
    }
    for (const [directory, value] of external) if (!needed.has(directory)) { value.watcher.close(); external.delete(directory); }
    for (const [directory, names] of needed) {
      const current = external.get(directory);
      if (current) { current.names = names; continue; }
      const entry = { names, watcher: undefined as unknown as FSWatcher };
      entry.watcher = watch(directory, (_event, filename) => { if (!filename || entry.names.has(filename.toString())) changed(); });
      entry.watcher.on('error', error => process.stderr.write(`Watch failed: ${error.message}\n`));
      external.set(directory, entry);
    }
  };
  const rebuild = async () => {
    if (running) return;
    running = true;
    while (dirty) {
      dirty = false;
      try {
        const manifest = await compile(config, output);
        refreshExternal(manifest.dependencies);
        process.stdout.write(`Built ${manifest.documents.length} documents\n`);
        for (const client of clients) client.write('event: built\ndata: {}\n\n');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        process.stderr.write(`Build failed: ${message}\n`);
        for (const client of clients) client.write(`event: failed\ndata: ${JSON.stringify({ message })}\n\n`);
      }
    }
    running = false;
  };
  let watcher: ReturnType<typeof watch>;
  try {
    watcher = watch(root, { recursive: true }, (_event, filename) => {
      if (filename) {
        const relative = filename.toString().split(path.sep);
        if (relative.some(part => ignored.has(part))) return;
        const file = path.resolve(root, filename.toString());
        if (file === output || file === `${output}.shoalrun.lock` || file.startsWith(outputPrefix) || file.startsWith(stagingPrefix)) return;
      }
      changed();
    });
    refreshExternal(initial.dependencies);
  } catch (error) {
    for (const entry of external.values()) entry.watcher.close();
    await new Promise<void>(resolve => server.close(() => resolve()));
    throw error;
  }
  watcher.on('error', error => process.stderr.write(`Watch failed: ${error.message}\n`));
  const close = server.close.bind(server);
  server.close = ((callback?: (error?: Error) => void) => {
    for (const client of clients) client.end();
    return close(callback);
  }) as Server['close'];
  server.on('close', () => {
    watcher.close();
    for (const entry of external.values()) entry.watcher.close();
    if (timer) clearTimeout(timer);
  });
  return server;
}
