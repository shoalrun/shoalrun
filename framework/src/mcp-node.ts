import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
import { once } from 'node:events';
import { mcpRequestLimit } from './mcp-http.js';

export async function bridgeMcp(request: IncomingMessage, response: ServerResponse, handler: (request: Request, options: { local: boolean }) => Promise<Response>) {
  if (Number(request.headers['content-length']) > mcpRequestLimit) {
    response.writeHead(413, { 'Content-Type': 'application/json' }); response.end('{"error":"MCP request too large"}'); request.resume(); return;
  }
  const controller = new AbortController();
  const abort = () => { if (!response.writableEnded) controller.abort(); };
  response.setTimeout(15_000, () => { controller.abort(); response.destroy(); });
  request.on('aborted', abort);
  response.on('close', abort);
  try {
    const headers = new Headers();
    for (const [name, value] of Object.entries(request.headers)) if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(', ') : value);
    let size = 0;
    const body = request.method === 'POST' ? new ReadableStream<Uint8Array>({
      async start(stream) {
        try { for await (const chunk of request) { size += chunk.length; if (size > mcpRequestLimit) { stream.error(new Error('MCP request too large')); return; } stream.enqueue(chunk); } stream.close(); }
        catch (error) { stream.error(error); }
      },
    }) : undefined;
    const web = new Request(`http://${request.headers.host ?? 'localhost'}${request.url ?? '/'}`, { method: request.method, headers, signal: controller.signal, ...(body ? { body, duplex: 'half' } as RequestInit : {}) });
    const local = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(request.socket.localAddress ?? '');
    const result = await handler(web, { local });
    response.writeHead(result.status, Object.fromEntries(result.headers));
    if (!result.body) { response.end(); return; }
    for await (const chunk of Readable.fromWeb(result.body as any)) { if (!response.write(chunk)) await once(response, 'drain', { signal: controller.signal }); }
    response.end();
  } catch {
    if (!response.headersSent && !response.destroyed) { response.writeHead(sizeStatus(request), { 'Content-Type': 'application/json' }); response.end('{"error":"MCP request could not be processed"}'); }
    else response.destroy();
  } finally { request.off('aborted', abort); response.off('close', abort); }
}
function sizeStatus(request: IncomingMessage) { return Number(request.headers['content-length']) > mcpRequestLimit ? 413 : 400; }
