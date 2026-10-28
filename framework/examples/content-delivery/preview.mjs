import { createServer } from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { openManifestContentSource } from '@shoalrun/cli/content';
import { createContentRestHandler } from '@shoalrun/cli/content/server';

const root = path.dirname(fileURLToPath(import.meta.url));
let port = 8775;
let directory = path.join(root, 'public/help/releases/demo');
const args = process.argv.slice(2);
for (let index = 0; index < args.length; index++) {
  if (args[index] === '--help') { console.log('Usage: node preview.mjs [--port PORT] [--help-directory DIRECTORY]'); process.exit(0); }
  if (args[index] === '--port') port = Number(args[++index]);
  else if (args[index] === '--help-directory' && args[index + 1]) directory = path.resolve(args[++index]);
  else throw new Error('Unknown preview option');
}
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid port');
const help = await realpath(directory);
const clientEntry = fileURLToPath(import.meta.resolve('@shoalrun/cli/content'));
const clientDirectory = path.dirname(clientEntry);
// Serve only the public browser entry and its browser-safe dependencies.
// This is deliberately not a generic node_modules or repository file server.
const clientFiles = new Map([
  ['/shoalrun/content-delivery.js', clientEntry],
  ['/shoalrun/content-delivery-contract.js', path.join(clientDirectory, 'content-delivery-contract.js')],
  ...['content-mount', 'content-delivery-validation', 'content-delivery-transport', 'content-rest-client', 'content-rest-contract'].map(name => [`/shoalrun/${name}.js`, path.join(clientDirectory, `${name}.js`)]),
]);
const mount = '/help/releases/demo/';
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.md': 'text/markdown; charset=utf-8', '.png': 'image/png' };
// Pin one approved bundle at startup. The injected transport reads only this
// bundle; realpath containment applies even to symlinks. It does not fetch URLs.
const source = await openManifestContentSource({
  manifestUrl: `http://content.local${mount}manifest.json`,
  fetch: async (input, options) => {
    options?.signal?.throwIfAborted();
    const url = new URL(String(input));
    if (url.origin !== 'http://content.local' || !url.pathname.startsWith(mount)) throw new Error('Outside bundle');
    try {
      const file = await realpath(path.join(help, url.pathname.slice(mount.length)));
      if (!file.startsWith(help + path.sep)) throw new Error('Outside bundle');
      const body = await readFile(file, { signal: options?.signal ?? undefined });
      return new Response(body, { headers: { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream' } });
    } catch (error) {
      options?.signal?.throwIfAborted();
      return new Response(null, { status: 404 });
    }
  },
});
const rest = createContentRestHandler({ sources: [source] });
const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1');
  if (url.pathname === '/content/v1' || url.pathname.startsWith('/content/v1/')) {
    const controller = new AbortController();
    request.once('aborted', () => controller.abort());
    response.once('close', () => { if (!response.writableEnded) controller.abort(); });
    try {
      const headers = new Headers();
      for (const [name, value] of Object.entries(request.headers)) if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(', ') : value);
      const result = await rest(new Request(url, { method: request.method, headers, signal: controller.signal }));
      response.writeHead(result.status, Object.fromEntries(result.headers));
      response.end(Buffer.from(await result.arrayBuffer()));
    } catch {
      if (!response.destroyed) { response.writeHead(500, { 'Cache-Control': 'no-store' }); response.end(); }
    }
    return;
  }
  if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405, { Allow: 'GET, HEAD' }); response.end(); return; }
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    let file = clientFiles.get(pathname);
    if (!file && pathname.startsWith(mount)) {
      file = await realpath(path.join(help, pathname.slice(mount.length)));
      if (!file.startsWith(help + path.sep)) throw new Error('Invalid path');
    }
    if (!file && pathname === '/app.js') file = path.join(root, 'app.js');
    if (!file && (pathname === '/' || pathname === '/settings/billing')) file = path.join(root, 'index.html');
    if (!file) throw new Error('Not found');
    const body = await readFile(file);
    response.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch { response.writeHead(404); response.end('Not found'); }
});
server.listen(port, '127.0.0.1', () => console.log(`Content delivery demo: http://127.0.0.1:${server.address().port}/settings/billing`));
process.on('SIGINT', () => server.close(() => { source.dispose(); process.exit(0); }));
process.on('SIGTERM', () => server.close(() => { source.dispose(); process.exit(0); }));
