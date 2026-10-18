import { loadMcpRuntime, createMcpHttpHandler } from './mcp-http.js';
import { bridgeMcp } from './mcp-node.js';
import { notFoundPage, addNotFoundTwin } from './not-found.js';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { homeUrl, negotiatedDocument, type PublishedRoute } from './negotiation.js';

type Manifest = { buildId?: string; basePath?: string; documents: Array<PublishedRoute & { id?: string }> };
type Redirect = { from: string; to: string; markdownFrom?: string; markdownTo?: string; status: number };
type ResourceHeaders = Record<string, Record<string, string>>;

const types: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.json': 'application/json', '.yaml': 'application/yaml', '.yml': 'application/yaml', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf' };

// An optional local question-answering endpoint and its chat panel, for previewing `shoalrun ask` in a browser. `ask` is a
// Web-standard handler and `widget` is the browser script that talks to it.
export type SiteExtras = { ask?: (request: Request) => Promise<Response>; search?: (request: Request) => Promise<Response>; widget?: string; publicSettings?: Record<string, unknown>; panel?: Record<string, string> };

const bridgeLimit = 20_000;

// Read a Node request into a Web `Request`, refusing bodies over the limit before a handler sees them.
async function bridge(request: IncomingMessage, response: ServerResponse, handler: (request: Request) => Promise<Response>): Promise<void> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    size += (chunk as Buffer).length;
    if (size > bridgeLimit) { response.writeHead(413, { 'Content-Type': 'application/json' }); response.end('{"error":"The request is too large."}'); return; }
    chunks.push(chunk as Buffer);
  }
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(', ') : value);
  const method = request.method ?? 'GET';
  const result = await handler(new Request(`http://${request.headers.host ?? 'localhost'}${request.url ?? '/'}`, { method, headers, ...(method === 'GET' || method === 'HEAD' ? {} : { body: Buffer.concat(chunks) }) }));
  // Headers.entries() joins repeated Set-Cookie values into one, which a browser reads as a single cookie. They are copied one by one.
  for (const [name, value] of result.headers) if (name !== 'set-cookie') response.setHeader(name, value);
  const cookies = result.headers.getSetCookie();
  if (cookies.length) response.setHeader('set-cookie', cookies);
  response.writeHead(result.status);
  response.end(Buffer.from(await result.arrayBuffer()));
}

export async function createSiteServer(directory: string, liveClients?: Set<ServerResponse>, extras: SiteExtras = {}): Promise<Server> {
  const root = path.resolve(directory);
  const realRoot = await realpath(root);
  const loadState = async () => {
    const headers = JSON.parse(await readFile(path.join(root, 'resource-headers.json'), 'utf8')) as ResourceHeaders;
    const manifest = JSON.parse(await readFile(path.join(root, 'documents.json'), 'utf8')) as Manifest;
    const redirects = JSON.parse(await readFile(path.join(root, 'redirects.json'), 'utf8').catch(() => '[]')) as Redirect[];
    const search = await siteFile(`${manifest.basePath ?? ''}/search-index.json`).then(file => stat(file)).then(info => info.isFile()).catch(() => false);
    const errorHtml = await siteFile(`${manifest.basePath ?? ''}/404.html`).then(file => readFile(file, 'utf8')).catch(() => undefined);
    return { headers, manifest, redirects, search, errorHtml, home: manifest.documents.find(item => item.url === manifest.basePath)?.url ?? homeUrl(manifest.documents), routes: new Set(manifest.documents.map(item => item.url)) };
  };
  const initialState = await loadState();
  let mcp = await loadMcpRuntime(root);
  let mcpHandler = mcp ? createMcpHttpHandler(mcp) : undefined;
  let mcpBuild = mcp?.runtime.buildId;


  async function siteFile(route: string): Promise<string> {
    const file = path.resolve(root, `.${route}`);
    if (file !== root && !file.startsWith(`${root}${path.sep}`)) throw new Error('Invalid path');
    const realFile = await realpath(file);
    if (realFile !== realRoot && !realFile.startsWith(`${realRoot}${path.sep}`)) throw new Error('Invalid path');
    return file;
  }

  return createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cache-Control', 'no-cache');
    let pathname = '';
    let recoveryState = initialState;
    try {
      pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
      if (pathname.includes('\0') || pathname.split('/').includes('..')) throw new Error('Invalid path');
      const { headers, manifest, redirects, search, errorHtml, home, routes } = liveClients ? await loadState() : initialState;
      recoveryState = { headers, manifest, redirects, search, errorHtml, home, routes };
      const basePath = manifest.basePath ?? '';
      if (liveClients && manifest.buildId !== mcpBuild) {
        const next = await loadMcpRuntime(root);
        mcp = next;
        mcpHandler = next ? createMcpHttpHandler(next) : undefined;
        mcpBuild = manifest.buildId;
      }
      const internalPath = pathname.toLowerCase().replace(/\/+$/, '');
      if (internalPath === '/mcp-runtime.json' || internalPath === '/__shoalrun/mcp-data' || internalPath.startsWith('/__shoalrun/mcp-data/')) { response.writeHead(404); response.end(); return; }
      if (mcp && mcpHandler && pathname === mcp.runtime.path) { await bridgeMcp(request, response, mcpHandler); return; }

      if (liveClients && pathname === `${basePath}/__shoalrun/reload`) {
        response.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
        response.write(': connected\n\n');
        liveClients.add(response);
        response.on('close', () => liveClients.delete(response));
        return;
      }
      if (extras.ask && pathname === `${basePath}/__shoalrun/ask`) {
        try { await bridge(request, response, extras.ask); } catch { if (!response.headersSent) { response.writeHead(400, { 'Content-Type': 'application/json' }); response.end('{"error":"The request could not be read."}'); } }
        return;
      }
      if (extras.search && pathname === `${basePath}/__shoalrun/search`) {
        try { await bridge(request, response, extras.search); } catch { if (!response.headersSent) { response.writeHead(400, { 'Content-Type': 'application/json' }); response.end('{"error":"The request could not be read."}'); } }
        return;
      }
      // The public settings a hosted chat publishes. Serving them makes the panel run as the public chat instead of the local preview.
      if (extras.ask && extras.publicSettings && pathname === `${basePath}/__shoalrun/chat.json`) {
        response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        response.end(request.method === 'HEAD' ? undefined : JSON.stringify(extras.publicSettings));
        return;
      }
      if (extras.ask && extras.widget && pathname === `${basePath}/__shoalrun/ask.js`) {
        response.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' });
        // A local preview has no chat.json, so the panel wording from chat.panel is handed to the script directly.
        response.end(request.method === 'HEAD' ? undefined : `${extras.panel ? `window.__shoalrunPanel=${JSON.stringify(extras.panel)};\n` : ''}${extras.widget}`);
        return;
      }
      if ((pathname === '/' && !routes.has('/')) || (basePath && (pathname === basePath || pathname === `${basePath}/`) && !routes.has(basePath))) if (home) {
        response.writeHead(302, { Location: `${home}/` });
        response.end();
        return;
      }
      const redirectPath = pathname.replace(/(.)\/+$/, '$1');
      const redirect = redirects.find(item => item.from === redirectPath);
      const markdownRedirect = redirects.find(item => item.markdownTo && item.markdownFrom === pathname);
      const location = redirect?.to ?? markdownRedirect?.markdownTo;
      if (location) {
        response.writeHead((redirect ?? markdownRedirect)!.status, { Location: location });
        response.end();
        return;
      }
      const sendRepresentation = (body: Buffer, resourceHeaders: Record<string, string>) => {
        const match = request.headers['if-none-match'];
        const etag = resourceHeaders.ETag;
        const notModified = (request.method === 'GET' || request.method === 'HEAD') && etag && match?.split(',').some(value => value.trim() === '*' || value.trim().replace(/^W\//, '') === etag);
        response.writeHead(notModified ? 304 : 200, resourceHeaders);
        response.end(notModified || request.method === 'HEAD' ? undefined : body);
      };
      const negotiated = negotiatedDocument(pathname, request.headers.accept, manifest.documents);
      if (negotiated) {
        const body = await readFile(await siteFile(negotiated.markdownUrl));
        sendRepresentation(body, { ...headers[negotiated.markdownUrl], Vary: 'Accept', 'Content-Location': negotiated.markdownUrl, Link: [`<${negotiated.markdownUrl}>; rel="alternate"; type="text/markdown"`, headers[negotiated.markdownUrl]?.Link].filter(Boolean).join(', ') });
        return;
      }
      let file = await siteFile(pathname);
      const info = await stat(file);
      if (info.isDirectory()) {
        if (!pathname.endsWith('/')) {
          response.writeHead(301, { Location: `${pathname}/${new URL(request.url ?? '/', 'http://localhost').search}`, ...(routes.has(pathname) ? { Vary: 'Accept' } : {}) });
          response.end();
          return;
        }
        file = await siteFile(path.posix.join(pathname, 'index.html'));
      }
      let body = await readFile(file);
      const documentRoute = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');
      const document = manifest.documents.find(item => item.url === documentRoute);
      const injected = `${liveClients ? `<script>const updates=new EventSource("${basePath}/__shoalrun/reload");updates.addEventListener("built",()=>location.reload());updates.addEventListener("failed",event=>{let status=document.getElementById("shoalrun-build-status");if(!status){status=document.createElement("aside");status.id="shoalrun-build-status";status.setAttribute("role","alert");document.body.append(status)}status.textContent="Build failed: "+JSON.parse(event.data).message})</script>` : ''}${extras.ask && extras.widget ? `<script src="${basePath}/__shoalrun/ask.js" defer></script>` : ''}`;
      if (injected && file.endsWith('.html') && request.method !== 'HEAD') body = Buffer.from(body.toString('utf8').replace('</body>', `${injected}</body>`));
      sendRepresentation(body, { ...(headers[pathname] ?? { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream' }), ...(file.toLowerCase().endsWith('.svg') ? { 'Content-Security-Policy': 'sandbox' } : {}), ...(document ? { Vary: 'Accept', Link: `<${document.markdownUrl}>; rel="alternate"; type="text/markdown"` } : {}) });
    } catch (error) {
      const missing = ['ENOENT', 'ENOTDIR'].includes((error as NodeJS.ErrnoException).code ?? '') || error instanceof URIError || (error instanceof Error && error.message === 'Invalid path');
      if (!missing) {
        response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end(request.method === 'HEAD' ? undefined : 'Internal server error\n');
        return;
      }
      const { manifest, search, errorHtml, home } = recoveryState;
      const basePath = manifest.basePath ?? '';
      if (liveClients && manifest.buildId !== mcpBuild) {
        const next = await loadMcpRuntime(root);
        mcp = next;
        mcpHandler = next ? createMcpHttpHandler(next) : undefined;
        mcpBuild = manifest.buildId;
      }
      const internalPath = pathname.toLowerCase().replace(/\/+$/, '');
      if (internalPath === '/mcp-runtime.json' || internalPath === '/__shoalrun/mcp-data' || internalPath.startsWith('/__shoalrun/mcp-data/')) { response.writeHead(404); response.end(); return; }
      if (mcp && mcpHandler && pathname === mcp.runtime.path) { await bridgeMcp(request, response, mcpHandler); return; }

      const markdown = pathname.endsWith('.md') || !!negotiatedDocument('/', request.headers.accept, [{ url: '/', markdownUrl: '/index.md' }]);
      const document = manifest.documents.find(item => item.markdownUrl === pathname || (markdown && item.url === (pathname.replace(/\/+$/, '') || '/')));
      const twin = document && await siteFile(document.url === '/' ? '/index.html' : `${document.url}/index.html`).then(file => stat(file)).then(info => info.isFile()).catch(() => false) ? document.url : undefined;
      response.writeHead(404, { 'Content-Type': markdown ? 'text/markdown; charset=utf-8' : 'text/html; charset=utf-8', Vary: 'Accept', 'X-Robots-Tag': 'noindex', ...(twin ? { Link: `<${twin}>; rel="alternate"; type="text/html"` } : {}) });
      const body = !markdown && errorHtml ? (twin ? addNotFoundTwin(errorHtml, twin) : errorHtml) : notFoundPage(basePath, home ?? `${basePath}/`, markdown, twin, search);
      response.end(request.method === 'HEAD' ? undefined : body);
    }
  });
}

export async function serveSite(directory: string, host: string, port: number, liveClients?: Set<ServerResponse>, extras?: SiteExtras): Promise<Server> {
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Server port must be an integer from 0 to 65535');
  const server = await createSiteServer(directory, liveClients, extras);
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => { server.off('error', reject); resolve(); });
  });
  return server;
}
