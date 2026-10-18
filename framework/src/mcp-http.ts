import { mcpClientMetadata, safeMcpModelName, normalizeMcpClient } from './mcp-client-metadata.js';
import { attemptAnalytics, mcpAnalyticsLoader, type McpAnalyticsAdapter } from './mcp-analytics.js';
import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fingerprint, mcpDataPath, mcpRuntimePath } from './mcp-integrity.js';
import { resolveMcp, type McpConfig } from './mcp-config.js';

export const mcpRequestLimit = 65_536;
export type McpRuntime = McpConfig & { schemaVersion: 1; dataDirectory: string; inventory: Record<string, string>; corpusDigest: string; buildId: string };
const hex = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const fail = (status: number, message: string) => new Response(JSON.stringify({ error: message }), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...(status === 429 ? { 'Retry-After': '1' } : {}) } });

export async function loadMcpRuntime(directory: string): Promise<{ runtime: McpRuntime; directory: string } | undefined> {
  let raw: string;
  try { raw = await readFile(path.join(directory, mcpRuntimePath), 'utf8'); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return; throw error; }
  const runtime = JSON.parse(raw) as McpRuntime;
  if (runtime.schemaVersion !== 1 || runtime.access !== 'public' || runtime.enabled !== true || runtime.dataDirectory !== mcpDataPath.slice(1) || !hex(runtime.buildId) || !hex(runtime.corpusDigest) || !runtime.inventory || Array.isArray(runtime.inventory) || fingerprint(JSON.stringify(runtime.inventory)) !== runtime.corpusDigest || !runtime.publication || ['channel', 'version', 'language'].some(key => typeof runtime.publication[key as keyof typeof runtime.publication] !== 'string') || !Array.isArray(runtime.allowedHosts) || !Array.isArray(runtime.allowedOrigins) || typeof runtime.path !== 'string' || !/^\/[a-zA-Z0-9_/-]+$/.test(runtime.path)) throw new Error('Invalid MCP runtime metadata; rebuild the public site');
  if (runtime.analytics?.consent) resolveMcp({ enabled: true, access: 'public', publication: runtime.publication, analytics: { ...runtime.analytics, module: './adapter.mjs' } });
  const build = JSON.parse(await readFile(path.join(directory, 'build-info.json'), 'utf8'));
  if (build.buildId !== runtime.buildId) throw new Error('MCP corpus and public site build identities differ');
  const siteRoot = await realpath(directory);
  const root = await realpath(path.join(directory, runtime.dataDirectory));
  if (!root.startsWith(`${siteRoot}${path.sep}`)) throw new Error('MCP corpus escapes the built site');
  for (const [file, digest] of Object.entries(runtime.inventory)) {
    if (!file || file.startsWith('/') || file.includes('\\') || file.split('/').some(part => !part || part === '.' || part === '..') || !hex(digest)) throw new Error('Invalid MCP inventory path');
    const resolved = await realpath(path.join(root, file));
    if (!resolved.startsWith(`${root}${path.sep}`) || fingerprint(await readFile(resolved)) !== digest) throw new Error(`MCP corpus resource mismatch: ${file}`);
  }
  if (runtime.analytics && (typeof runtime.analytics.module !== 'string' || !runtime.analytics.module.startsWith('analytics/lib/') || !runtime.inventory[runtime.analytics.module] || runtime.analytics.clientMetadata !== undefined && typeof runtime.analytics.clientMetadata !== 'boolean' || ['intent', 'conversationIds'].some(key => (runtime.analytics as any)[key] !== undefined && typeof (runtime.analytics as any)[key] !== 'boolean'))) throw new Error('Invalid MCP analytics module inventory');
  if (!runtime.inventory['documents.json'] || !runtime.inventory['search-index.json']) throw new Error('MCP corpus is missing its indexes');
  return { runtime, directory: root };
}

export function createMcpHttpHandler(input: { runtime: McpRuntime; directory: string }) {
  let active = 0;
  let publicDocuments: Promise<Array<{ id: string; sections?: Array<{ id: string }> }>> | undefined;
  const resource = async (id: unknown, section: unknown) => {
    if (typeof id !== 'string') return {};
    publicDocuments ??= readFile(path.join(input.directory, 'documents.json'), 'utf8').then(text => JSON.parse(text).documents);
    const page = (await publicDocuments!).find(page => page.id === id);
    return page ? { pageId: page.id, ...(typeof section === 'string' && page.sections?.some(item => item.id === section) ? { sectionId: section } : {}) } : {};
  };
  const loadAnalytics = mcpAnalyticsLoader(input.directory, input.runtime.analytics?.module);
  return async (request: Request, options: { local?: boolean } = {}): Promise<Response> => {
    const { runtime } = input;
    const url = new URL(request.url);
    const host = url.hostname.toLowerCase();
    const loopback = options.local === true && ['localhost', '127.0.0.1', '[::1]'].includes(host);
    if (!loopback && !runtime.allowedHosts.includes(host)) return fail(403, 'MCP Host is not allowed');
    const origin = request.headers.get('origin');
    if (origin && !(runtime.allowedOrigins.includes(origin) || loopback && origin === url.origin)) return fail(403, 'MCP Origin is not allowed');
    const cors: Record<string, string> = origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin', 'Access-Control-Expose-Headers': 'MCP-Protocol-Version, Mcp-Session-Id' } : {};
    if (url.pathname !== runtime.path) return fail(404, 'Unknown MCP endpoint');
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...cors, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': ['Content-Type', 'Accept', 'MCP-Protocol-Version', 'MCP-Session-Id', ...(runtime.analytics?.consent ? [runtime.analytics.consent.header] : [])].join(', ') } });
    if (request.method !== 'POST') return new Response(null, { status: 405, headers: { ...cors, Allow: 'POST, OPTIONS' } });
    if (active >= 8) return fail(429, 'MCP request capacity exceeded');
    active++;
    let analytics: McpAnalyticsAdapter | undefined;
    let nativeCapture = false;
    let server: Awaited<ReturnType<typeof import('./docs-mcp.js')['createDocsMcpServer']>> | undefined;
    const controller = new AbortController();
    const abort = () => controller.abort(request.signal.reason);
    request.signal.addEventListener('abort', abort, { once: true });
    if (request.signal.aborted) abort();
    const timeout = setTimeout(() => controller.abort(new Error('MCP request deadline exceeded')), 15_000);
    let cleaned = false;
    const cleanup = async () => {
      if (cleaned) return;
      cleaned = true;
      clearTimeout(timeout);
      request.signal.removeEventListener('abort', abort);
      active--;
      await server?.close().catch(() => {});
      if (analytics?.flush) await attemptAnalytics(() => analytics!.flush!());
    };
    controller.signal.addEventListener('abort', () => { void cleanup(); }, { once: true });
    try {
      const [{ WebStandardStreamableHTTPServerTransport }, { createDocsMcpServer }] = await Promise.all([import('@modelcontextprotocol/server'), import('./docs-mcp.js')]);
      const consent = runtime.analytics?.consent;
      const permitted = !consent || request.headers.get(consent.header) === consent.value;
      if (permitted) await attemptAnalytics(async () => { analytics = await loadAnalytics(); });
      server = createDocsMcpServer(input.directory, runtime.publication, analytics ? { clientMetadata: runtime.analytics?.clientMetadata === true, buildId: runtime.buildId, capture: event => nativeCapture ? undefined : analytics!.capture(event) } : undefined, !!consent && !permitted);
      if (analytics?.instrument) await attemptAnalytics(async () => {
        nativeCapture = await analytics!.instrument!(server!, {
          buildId: runtime.buildId, publication: runtime.publication,
          clientMetadata: runtime.analytics?.clientMetadata === true,
          intent: runtime.analytics?.intent === true, conversationIds: runtime.analytics?.conversationIds === true,
          client: normalizeMcpClient, resource, modelName: safeMcpModelName,
          metadata: context => runtime.analytics?.clientMetadata ? mcpClientMetadata(context, server!.server.getClientVersion()) : {},
        }) === true;
      });
      const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true, maxRequestBodySize: mcpRequestLimit });
      await server.connect(transport);
      const work = transport.handleRequest(new Request(request, { signal: controller.signal }));
      const aborted = new Promise<never>((_, reject) => {
        if (controller.signal.aborted) reject(controller.signal.reason);
        else controller.signal.addEventListener('abort', () => reject(controller.signal.reason), { once: true });
      });
      const response = await Promise.race([work, aborted]);
      const headers = new Headers(response.headers);
      headers.set('Cache-Control', 'no-store');
      for (const [name, value] of Object.entries(cors)) headers.set(name, value);
      // JSON responses are finite; close the protocol only after the body has been consumed.
      if (!response.body) { await cleanup(); return new Response(null, { status: response.status, headers }); }
      const reader = response.body.getReader();
      return new Response(new ReadableStream({
        async pull(stream) { try { const next = await reader.read(); if (next.done) { await cleanup(); stream.close(); } else stream.enqueue(next.value); } catch (error) { stream.error(error); await cleanup(); } },
        async cancel(reason) { controller.abort(reason); await reader.cancel(reason).catch(() => {}); await cleanup(); },
      }), { status: response.status, headers });
    } catch {
      await cleanup();
      return fail(controller.signal.aborted ? 503 : 400, controller.signal.aborted ? 'MCP request cancelled or timed out' : 'Invalid MCP request');
    }
  };
}
