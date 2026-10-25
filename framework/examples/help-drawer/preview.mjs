import { createServer } from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
let port = 8774;
let directory = path.join(root, 'public/help');
for (let index = 0; index < args.length; index++) {
  if (args[index] === '--help') { console.log('Usage: node preview.mjs [--port PORT] [--help-directory DIRECTORY]'); process.exit(0); }
  if (args[index] === '--port') port = Number(args[++index]);
  else if (args[index] === '--help-directory') directory = path.resolve(args[++index]);
  else throw new Error('Unknown preview option');
}
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid port');
const help = await realpath(directory);
const server = createServer(async (request, response) => {
  if (request.method !== 'GET') { response.writeHead(405); response.end(); return; }
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    let file;
    if (pathname.startsWith('/help/')) {
      file = await realpath(path.join(help, pathname.slice(6)));
      if (!file.startsWith(help + path.sep)) throw new Error('Invalid path');
    } else file = path.join(root, pathname === '/app.js' ? 'app.js' : 'index.html');
    const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.md': 'text/markdown; charset=utf-8', '.png': 'image/png' };
    response.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream' });
    response.end(await readFile(file));
  } catch { response.writeHead(404); response.end('Not found'); }
});
server.listen(port, '127.0.0.1', () => console.log(`Help drawer demo: http://127.0.0.1:${server.address().port}/settings/account`));
process.on('SIGINT', () => server.close(() => process.exit(0)));
process.on('SIGTERM', () => server.close(() => process.exit(0)));
