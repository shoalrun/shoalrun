import { addMcpFunction, removeStaleMcpFunctions, type McpFunctionResult } from './mcp-vercel.js';
import { mcpDataPath, mcpRuntimePath } from './mcp-integrity.js';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { compile } from './compiler.js';
import type { BuildProvenance } from './build-info.js';
import { homeUrl } from './negotiation.js';
import { addAskFunction, type AskFunctionResult } from './vercel-function.js';

type HeaderMatch = { type: 'header'; key: string; value: { re: string } };
type Route = { src: string; dest?: string; headers?: Record<string, string>; has?: HeaderMatch[]; missing?: HeaderMatch[]; status?: number; continue?: boolean };

function exact(route: string): string {
  return route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function removeStaleFunctions(directory: string, keep = new Set<string>()): Promise<void> {
  const visit = async (folder: string): Promise<void> => {
    for (const entry of await readdir(folder, { withFileTypes: true }).catch(() => [])) {
      if (!entry.isDirectory() || entry.name.endsWith('.func')) continue;
      const child = path.join(folder, entry.name);
      if (entry.name === '__shoalrun') {
        for (const name of ['ask.func', 'search.func']) {
          const generated = path.join(child, name);
          if (!keep.has(generated)) await rm(generated, { recursive: true, force: true });
        }
      } else await visit(child);
    }
  };
  await visit(directory);
}

export async function buildVercel(configFile: string, outputDirectory: string, provenance: BuildProvenance = {}, options: { chat?: boolean } = {}): Promise<{ documents: number; output: string; chat?: AskFunctionResult; mcp?: McpFunctionResult }> {
  const output = path.resolve(outputDirectory);
  const staticDirectory = path.join(output, 'static');
  const manifest = await compile(configFile, staticDirectory, provenance);
  const basePath = manifest.basePath;
  const functionsDirectory = path.join(output, 'functions');
  const mcp = await addMcpFunction({ staticDirectory, functionsDirectory });
  if (mcp.added) {
    // Runtime data belongs to the function, never the public static filesystem.
    await rm(path.join(staticDirectory, mcpRuntimePath), { force: true });
    await rm(path.join(staticDirectory, mcpDataPath), { recursive: true, force: true });
  }

  const resourceHeaders = JSON.parse(await readFile(path.join(staticDirectory, 'resource-headers.json'), 'utf8')) as Record<string, Record<string, string>>;
  const routes: Route[] = [
    { src: '^/.*$', headers: { 'X-Content-Type-Options': 'nosniff' }, continue: true },
    { src: '^/.*\\.svg$', headers: { 'Content-Security-Policy': 'sandbox' }, continue: true }
  ];
  if (mcp.added) {
    routes.push({ src: '^/(?:mcp-runtime\\.json|__shoalrun/mcp-data(?:/.*)?)$', status: 404 });
    routes.push({ src: `^${exact(mcp.path)}$`, dest: mcp.path });
  }
  const markdownRequest = { type: 'header' as const, key: 'Accept', value: { re: '(?i)(?:^|,)\\s*text/markdown(?![^,]*;\\s*q=0(?:\\.0+)?(?:,|$))' } };
  // The Node server serves Markdown only when its weight is at least HTML's (negotiation.ts). A header rule cannot
  // compare two numbers, so this rule keeps HTML in the common case where HTML clearly wins: Markdown with a
  // fractional weight beside text/html at full weight or, when text/html is absent, beside a full-weight wildcard.
  const fullWeight = String.raw`\s*(?:,|$|;(?![^,]*\bq=)|;[^,]*\bq=1(?:\.0{0,3})?\s*(?:[,;]|$))`;
  const markdownOutranked = { type: 'header' as const, key: 'Accept', value: { re: String.raw`(?i)^(?=(?:.*,)?\s*text/markdown\s*;[^,]*\bq=0\.)(?:(?=(?:.*,)?\s*text/html${fullWeight})|(?!(?:.*,)?\s*text/html\s*(?:[,;]|$))(?=(?:.*,)?\s*(?:text|\*)/\*${fullWeight}))` } };

  for (const document of manifest.documents) {
    const src = document.url === '/' ? '^/$' : `^${exact(document.url)}/?$`;
    const alternate = `<${document.markdownUrl}>; rel="alternate"; type="text/markdown"`;
    routes.push({ src, dest: document.markdownUrl, has: [markdownRequest], missing: [markdownOutranked], headers: { 'Content-Type': 'text/markdown; charset=utf-8', Vary: 'Accept', 'Content-Location': document.markdownUrl, Link: `${alternate}, ${resourceHeaders[document.markdownUrl].Link}` } });
    routes.push({ src, dest: document.url === '/' ? '/index.html' : `${document.url}/index.html`, headers: { 'Content-Type': 'text/html; charset=utf-8', Vary: 'Accept', Link: alternate } });
  }

  const home = manifest.documents.find(item => item.url === basePath)?.url ?? homeUrl(manifest.documents);
  if (!manifest.documents.some(item => item.url === '/') && home) routes.push({ src: '^/$', status: 302, headers: { Location: `${home}/` } });
  if (basePath && !manifest.documents.some(item => item.url === basePath) && home) routes.push({ src: `^${exact(basePath)}/?$`, status: 302, headers: { Location: `${home}/` } });
  for (const redirect of manifest.redirects) {
    routes.push({ src: `^${exact(redirect.from)}/?$`, status: redirect.status, headers: { Location: redirect.to } });
    routes.push({ src: `^${exact(redirect.markdownFrom)}$`, status: redirect.status, headers: { Location: redirect.markdownTo } });
  }

  for (const document of manifest.documents) {
    routes.push({ src: `^${exact(document.markdownUrl)}$`, headers: resourceHeaders[document.markdownUrl], continue: true });
  }

  for (const [url, headers] of Object.entries(resourceHeaders)) {
    if (headers['Cache-Control'] && !manifest.documents.some(document => document.markdownUrl === url)) routes.push({ src: `^${exact(url)}$`, headers, continue: true });
  }

  for (const extension of ['html', 'md']) {
    const route = `${basePath}/404.${extension}`;
    routes.push({ src: `^${exact(route)}$`, headers: resourceHeaders[route], continue: true });
  }

  const overrides = Object.fromEntries(Object.entries(resourceHeaders).filter(([route, value]) => value['Content-Type'] && !manifest.documents.some(document => document.url === route)).map(([route, value]) => [route.slice(1), { contentType: value['Content-Type'] }]));
  await mkdir(output, { recursive: true });
  const recoveryHeaders = { 'X-Robots-Tag': 'noindex' };
  const fallbacks: Route[] = [
    ...manifest.documents.map(document => ({
      src: `^${exact(document.markdownUrl)}$`, dest: `${basePath}/404.md`, status: 404,
      headers: { ...recoveryHeaders, 'Content-Type': 'text/markdown; charset=utf-8', Link: `<${document.url}>; rel="alternate"; type="text/html"` }
    })),
    { src: '^/.*\\.md$', dest: `${basePath}/404.md`, status: 404, headers: { ...recoveryHeaders, 'Content-Type': 'text/markdown; charset=utf-8' } },
    { src: '^/.*$', dest: `${basePath}/404.md`, status: 404, has: [markdownRequest], missing: [markdownOutranked], headers: { ...recoveryHeaders, 'Content-Type': 'text/markdown; charset=utf-8', Vary: 'Accept' } },
    { src: '^/.*$', dest: `${basePath}/404.html`, status: 404, headers: { ...recoveryHeaders, 'Content-Type': 'text/html; charset=utf-8', Vary: 'Accept' } }
  ];
  await writeFile(path.join(output, 'config.json'), JSON.stringify({ version: 3, routes: [...routes, { handle: 'filesystem' }, ...fallbacks], overrides }, null, 2) + '\n');
  // The optional answer function. It goes in only when asked for, and a site that cannot support it still builds.
  const chat = options.chat ? await addAskFunction({ configFile, staticDirectory, functionsDirectory, basePath }) : undefined;
  const currentFunctions = path.join(functionsDirectory, basePath.slice(1), '__shoalrun');
  const keep = chat?.added ? new Set(['ask.func', 'search.func'].map(name => path.join(currentFunctions, name))) : undefined;
  await removeStaleFunctions(functionsDirectory, keep);
  await removeStaleMcpFunctions(functionsDirectory, mcp.added ? mcp.directory : undefined);
  return { documents: manifest.documents.length, output, ...(chat ? { chat } : {}), ...(mcp.added ? { mcp } : {}) };
}
