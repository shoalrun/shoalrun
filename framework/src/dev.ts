import { statSync, watch, type FSWatcher } from 'node:fs';
import type { Server, ServerResponse } from 'node:http';
import path from 'node:path';
import { compile } from './compiler.js';
import { serveSite } from './server.js';
import type { PreviewStatus } from './server.js';
import { homeUrl } from './negotiation.js';

function dependencyStamp(file: string): string {
  try {
    const info = statSync(file, { bigint: true });
    return `${info.dev}:${info.ino}:${info.size}:${info.mtimeNs}:${info.ctimeNs}:${info.mode}`;
  } catch (error) { return `missing:${(error as NodeJS.ErrnoException).code ?? 'unknown'}`; }
}

export async function startDev(configFile: string, outputDirectory: string, host = '127.0.0.1', port = 8765, options: { profile?: string } = {}): Promise<Server> {
  const config = path.resolve(configFile);
  const root = path.dirname(config);
  const output = path.resolve(outputDirectory);
  const outputPrefix = `${output}${path.sep}`;
  const stagingPrefix = `${output}.staging-`;
  const ignored = new Set(['.git', '.shoalrun', 'node_modules']);
  const clients = new Set<ServerResponse>();
  const profile = options.profile ? path.resolve(options.profile) : undefined;
  const initialStamps = new Map<string, string>();
  const initial = await compile(config, output, {}, { profile, onDependency: file => {
    const resolved = path.resolve(file);
    if (!initialStamps.has(resolved)) initialStamps.set(resolved, dependencyStamp(resolved));
  } });
  let successfulDependencies = initial.dependencies;
  const preview: PreviewStatus = { ...(profile ? { profile: path.basename(profile) } : {}), buildId: initial.buildId, profileDigest: initial.profileSelection?.profileDigest };
  const server = await serveSite(output, host, port, clients, { preview });
  process.stdout.write(`Preview: http://${host}:${(server.address() as { port: number }).port}/\n`);

  let timer: NodeJS.Timeout | undefined;
  let dirty = false;
  let running = false;
  let closed = false;
  const external = new Map<string, { watcher: FSWatcher; names: Set<string> }>();
  const dependencyStamps = new Map<string, string>();
  const changed = () => {
    if (closed) return;
    dirty = true;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { void rebuild(); }, 180);
  };
  const refreshExternal = (dependencies: string[]) => {
    if (closed) return;
    const needed = new Map<string, Set<string>>();
    const files = new Set<string>();
    for (const dependency of [...dependencies, ...(profile ? [profile] : [])]) {
      const file = path.resolve(dependency);
      files.add(file);
      if (!dependencyStamps.has(file)) dependencyStamps.set(file, initialStamps.get(file) ?? dependencyStamp(file));
      if (file === root || (file.startsWith(`${root}${path.sep}`) && !path.relative(root, file).split(path.sep).some(part => ignored.has(part)))) continue;
      let parent = path.dirname(file);
      // A missing asset may also have missing parent directories. Watch its
      // nearest existing directory, filtered to the next declared component.
      while (true) {
        try { if (statSync(parent).isDirectory()) break; }
        catch (error) { if (!['ENOENT', 'ENOTDIR'].includes((error as NodeJS.ErrnoException).code ?? '')) throw error; }
        const next = path.dirname(parent);
        if (next === parent) throw new Error(`No watchable parent for ${file}`);
        parent = next;
      }
      if (!needed.has(parent)) needed.set(parent, new Set());
      needed.get(parent)!.add(path.relative(parent, file).split(path.sep)[0]);
    }
    for (const [directory, value] of external) if (!needed.has(directory)) { value.watcher.close(); external.delete(directory); }
    for (const [directory, names] of needed) {
      const current = external.get(directory);
      if (current) { current.names = names; continue; }
      const entry = { names, watcher: undefined as unknown as FSWatcher };
      entry.watcher = watch(directory, (_event, filename) => {
        if (!filename || entry.names.has(filename.toString())) {
          const file = filename ? path.resolve(directory, filename.toString()) : undefined;
          if (file && dependencyStamps.has(file)) dependencyStamps.set(file, dependencyStamp(file));
          changed();
        }
      });
      entry.watcher.on('error', error => process.stderr.write(`Watch failed: ${error.message}\n`));
      external.set(directory, entry);
    }
    for (const file of dependencyStamps.keys()) if (!files.has(file)) dependencyStamps.delete(file);
    initialStamps.clear();
  };
  const rebuild = async () => {
    if (running) return;
    running = true;
    while (dirty && !closed) {
      dirty = false;
      const discovered = new Set<string>();
      try {
        const manifest = await compile(config, output, {}, { profile, onDependency: file => discovered.add(file) });
        preview.buildId = manifest.buildId;
        preview.profileDigest = manifest.profileSelection?.profileDigest;
        delete preview.error;
        successfulDependencies = manifest.dependencies;
        refreshExternal(manifest.dependencies);
        process.stdout.write(`Built ${manifest.documents.length} documents\n`);
        const update = { routes: manifest.documents.map(document => document.url), home: homeUrl(manifest.documents) };
        for (const client of clients) client.write(`event: built\ndata: ${JSON.stringify(update)}\n\n`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        preview.error = message;
        try { refreshExternal([...successfulDependencies, ...discovered]); }
        catch (watchError) { process.stderr.write(`Watch failed: ${watchError instanceof Error ? watchError.message : String(watchError)}\n`); }
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
        if (dependencyStamps.has(file)) dependencyStamps.set(file, dependencyStamp(file));
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
  // Native directory notifications can be coalesced or lost, especially just
  // after registration. Poll only the exact declared build dependencies as
  // a fallback; seed their stamps synchronously so the first edit is observed.
  const polling = setInterval(() => {
    if (closed) return;
    for (const [file, previous] of dependencyStamps) {
      const current = dependencyStamp(file);
      if (current !== previous) { dependencyStamps.set(file, current); changed(); }
    }
  }, 500);
  polling.unref();
  const close = server.close.bind(server);
  server.close = ((callback?: (error?: Error) => void) => {
    closed = true;
    for (const client of clients) client.end();
    return close(callback);
  }) as Server['close'];
  server.on('close', () => {
    watcher.close();
    for (const entry of external.values()) entry.watcher.close();
    dependencyStamps.clear();
    clearInterval(polling);
    if (timer) clearTimeout(timer);
  });
  return server;
}
