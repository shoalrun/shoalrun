import { cp, mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { loadMcpRuntime } from './mcp-http.js';
import { mcpRuntimePath } from './mcp-integrity.js';
import { copyFunctionRuntime } from './function-package.js';

const marker = 'shoalrun-function.json';
async function owned(directory: string) {
  try { const record = JSON.parse(await readFile(path.join(directory, marker), 'utf8')); return record.schemaVersion === 1 && record.owner === 'shoalrun-mcp'; }
  catch { return false; }
}
export async function removeStaleMcpFunctions(directory: string, keep?: string) {
  for (const entry of await readdir(directory, { withFileTypes: true }).catch(() => [])) {
    if (!entry.isDirectory()) continue;
    const child = path.join(directory, entry.name);
    if (entry.name.endsWith('.func')) {
      if (child !== keep && await owned(child)) await rm(child, { recursive: true, force: true });
    } else await removeStaleMcpFunctions(child, keep);
  }
}

export type McpFunctionResult = { added: false } | { added: true; directory: string; path: string; buildId: string; corpusDigest: string };
export async function addMcpFunction(input: { staticDirectory: string; functionsDirectory: string; distDirectory?: string }): Promise<McpFunctionResult> {
  const loaded = await loadMcpRuntime(input.staticDirectory);
  if (!loaded) return { added: false };
  const target = path.join(input.functionsDirectory, `${loaded.runtime.path.slice(1)}.func`);
  if (await stat(target).then(() => true, () => false) && !await owned(target)) throw new Error(`MCP function would replace an unrelated function: ${loaded.runtime.path}`);
  const staging = `${target}.staging-${randomUUID()}`;
  await mkdir(staging, { recursive: true });
  try {
    const site = path.join(staging, 'site');
    await mkdir(site);
    // Copy only the generated runtime, parent identity, and verified scoped inventory.
    for (const name of [mcpRuntimePath.slice(1), 'build-info.json']) await cp(path.join(input.staticDirectory, name), path.join(site, name));
    for (const name of Object.keys(loaded.runtime.inventory)) {
      const destination = path.join(site, loaded.runtime.dataDirectory, name);
      await mkdir(path.dirname(destination), { recursive: true });
      await cp(path.join(loaded.directory, name), destination);
    }
    await loadMcpRuntime(site); // verify copied bytes, not merely the source inventory
    const dist = input.distDirectory ?? path.dirname(fileURLToPath(import.meta.url));
    await copyFunctionRuntime(dist, 'mcp-vercel-runtime.js', staging);
    await writeFile(path.join(staging, 'package.json'), JSON.stringify({ type: 'module' }) + '\n');
    await writeFile(path.join(staging, marker), JSON.stringify({ schemaVersion: 1, owner: 'shoalrun-mcp' }) + '\n');
    await writeFile(path.join(staging, 'index.js'), `import { fileURLToPath } from 'node:url';\nimport { vercelMcpNodeAdapter } from './lib/mcp-vercel-runtime.js';\nexport default vercelMcpNodeAdapter(fileURLToPath(new URL('./site/', import.meta.url)));\n`);
    await writeFile(path.join(staging, '.vc-config.json'), JSON.stringify({ runtime: 'nodejs22.x', handler: 'index.js', launcherType: 'Nodejs', shouldAddHelpers: false, maxDuration: 30, memory: 1024 }, null, 2) + '\n');
    await rm(target, { recursive: true, force: true });
    await rename(staging, target);
  } finally { await rm(staging, { recursive: true, force: true }); }
  return { added: true, directory: target, path: loaded.runtime.path, buildId: loaded.runtime.buildId, corpusDigest: loaded.runtime.corpusDigest };
}
