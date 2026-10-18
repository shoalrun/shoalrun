import type { IncomingMessage, ServerResponse } from 'node:http';
import { loadMcpRuntime, createMcpHttpHandler } from './mcp-http.js';
import { bridgeMcp } from './mcp-node.js';

export async function createVercelMcpHandler(directory: string, env: NodeJS.ProcessEnv = process.env) {
  const loaded = await loadMcpRuntime(directory);
  if (!loaded) throw new Error('Missing MCP function corpus');
  const hosts = [env.VERCEL_URL, env.VERCEL_BRANCH_URL, env.VERCEL_PROJECT_PRODUCTION_URL].filter((value): value is string => !!value);
  for (const value of hosts) {
    // Trust only reserved deployment metadata, never request/forwarded headers or wildcard domains.
    const url = new URL(`https://${value}`);
    if (url.host !== value.toLowerCase() || url.pathname !== '/' || url.search || url.hash || url.username || url.password) throw new Error('Invalid Vercel MCP deployment hostname');
    loaded.runtime.allowedHosts.push(url.hostname);
    loaded.runtime.allowedOrigins.push(url.origin);
  }
  const handler = createMcpHttpHandler(loaded);
  // A function's loopback socket may be its platform proxy, not a local developer.
  return (request: Request) => handler(request);
}

export function vercelMcpNodeAdapter(directory: string) {
  let pending: ReturnType<typeof createVercelMcpHandler> | undefined;
  return async (request: IncomingMessage, response: ServerResponse) => {
    try {
      pending ??= createVercelMcpHandler(directory).catch(error => { pending = undefined; throw error; });
      await bridgeMcp(request, response, await pending);
    } catch {
      if (!response.headersSent) { response.writeHead(503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); response.end('{"error":"MCP documentation is unavailable"}'); }
      else response.destroy();
    }
  };
}
