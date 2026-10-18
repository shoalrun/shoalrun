import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { copyFunctionRuntime } from './function-package.js';
import { fingerprint, mcpRuntimePath, mcpDataPath } from './mcp-integrity.js';
import { searchIndex } from './content.js';
import { resolveMcp } from './mcp-config.js';
import type { ArtifactPage } from './artifact-bundle.js';

export async function addMcpArtifacts(artifacts: Map<string, string | Buffer>, config: any, manifest: any, rendered: ArtifactPage[], headers: Record<string, unknown>, analyticsModule?: string) {
  const mcp = resolveMcp(config.mcp);
  if (!mcp) return;
  const endpoint = `${manifest.basePath}${mcp.path}`;
  const variant = ['channel', 'version', 'language'].map(key => mcp.publication[key as keyof typeof mcp.publication]).join('|');
  const selected = rendered.filter(page => ['channel', 'version', 'language'].every(key => page.doc.variant[key as keyof typeof page.doc.variant] === mcp.publication[key as keyof typeof mcp.publication]));
  if (!selected.length || selected.some(page => page.doc.frontmatter.access?.policy !== 'public')) throw new Error('mcp.publication must select nonempty, normally published public documentation');
  for (const artifact of artifacts.keys()) {
    const route = artifact.toLowerCase();
    if ([endpoint, mcpRuntimePath, mcpDataPath].some(reserved => {
      const value = reserved.toLowerCase();
      return route === value || route.startsWith(`${value}/`) || value.startsWith(`${route}/`);
    })) throw new Error(`MCP output route collision: ${artifact}`);
  }
  if (manifest.redirects.some((r: any) => r.from === endpoint || r.markdownFrom === endpoint)) throw new Error('MCP endpoint conflicts with a redirect');
  const docs = manifest.documents.filter((doc: any) => ['channel', 'version', 'language'].every(key => doc.variant[key] === mcp.publication[key as keyof typeof mcp.publication]));
  const inventory: Record<string, string> = {};
  const put = (file: string, value: string | Buffer) => {
    artifacts.set(`${mcpDataPath}/${file}`, value);
    inventory[file] = fingerprint(value);
  };
  const records = new Map(docs.map((doc: any) => [doc.markdownUrl, doc]));
  const index = searchIndex(selected, config);
  const search = { ...index, documents: index.documents.map(doc => {
    const record: any = records.get(doc.markdownUrl);
    return { ...doc, markdownBytes: record.markdownBytes, markdownTokens: record.markdownTokens, markdownTokenEncoding: record.markdownTokenEncoding, sections: record.sections };
  }) };
  if (search.documents.some(doc => doc.variant !== variant)) throw new Error('MCP search publication mismatch');
  put('documents.json', JSON.stringify({ schemaVersion: 1, documents: docs }));
  put('search-index.json', JSON.stringify(search));
  for (const doc of docs) for (const resource of [doc, ...doc.sections]) {
    const content = artifacts.get(resource.markdownUrl);
    if (content === undefined || fingerprint(content) !== resource.digest) throw new Error(`Missing or inconsistent MCP resource: ${resource.markdownUrl}`);
    put(resource.markdownUrl.slice(1), content);
  }
  if (mcp.analytics) {
    if (!analyticsModule) throw new Error('Missing MCP analytics module');
    const temporary = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-mcp-adapter-'));
    try {
      await copyFunctionRuntime(path.dirname(analyticsModule), path.basename(analyticsModule), temporary);
      await writeFile(path.join(temporary, 'package.json'), JSON.stringify({ type: 'module' }));
      const collect = async (folder: string): Promise<void> => {
        for (const entry of await readdir(folder, { withFileTypes: true })) {
          const file = path.join(folder, entry.name);
          if (entry.isDirectory()) await collect(file);
          else put(`analytics/${path.relative(temporary, file).split(path.sep).join('/')}`, await readFile(file));
        }
      };
      await collect(temporary);
      mcp.analytics = { ...mcp.analytics, module: `analytics/lib/${path.basename(analyticsModule)}` };
    } finally { await rm(temporary, { recursive: true, force: true }); }
  }
  const origin = config.site.origin ? new URL(config.site.origin).origin : undefined;
  const runtime = { schemaVersion: 1, ...mcp, path: endpoint, dataDirectory: mcpDataPath.slice(1), allowedHosts: [...new Set([...mcp.allowedHosts, ...(origin ? [new URL(origin).hostname] : [])])], allowedOrigins: [...new Set([...mcp.allowedOrigins, ...(origin ? [origin] : [])])], inventory, corpusDigest: fingerprint(JSON.stringify(inventory)), buildId: '' };
  artifacts.set(mcpRuntimePath, JSON.stringify(runtime));
  // These are internal runtime files, not browser discovery artifacts.
  headers[mcpRuntimePath] = { 'X-Robots-Tag': 'noindex' };
}
