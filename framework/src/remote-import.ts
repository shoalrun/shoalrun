import { createHash } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { lstat, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { request } from 'node:https';
import { BlockList, isIP } from 'node:net';
import path from 'node:path';
import YAML from 'yaml';
import { ApiReader } from './api.js';

const maxFileBytes = 4 * 1024 * 1024;
const maxTotalBytes = 16 * 1024 * 1024;
const maxFiles = 128;
const hash = (value: Buffer | string) => createHash('sha256').update(value).digest('hex');
type Download = (url: URL) => Promise<Buffer>;
type Lock = { version: 1; entry: string; files: Array<{ url: string; path: string; digest: string; snapshotDigest: string }> };
type Options = { download?: Download; output?: string };

const blocked = new BlockList();
for (const [address, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
  ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24],
  ['203.0.113.0', 24], ['192.88.99.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4]
] as const) blocked.addSubnet(address, prefix, 'ipv4');
for (const [address, prefix] of [
  ['::', 128], ['::1', 128], ['64:ff9b::', 96],
  ['2001::', 32], ['2001:db8::', 32], ['2002::', 16], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8]
] as const) blocked.addSubnet(address, prefix, 'ipv6');

function checkedUrl(value: string, origin?: string): URL {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error(`OpenAPI source needs an absolute HTTPS URL: ${value}`); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash || isIP(url.hostname.replace(/^\[|\]$/g, ''))) {
    throw new Error(`OpenAPI source needs a public HTTPS URL without credentials, port, query, or fragment: ${value}`);
  }
  if (origin && url.origin !== origin) throw new Error(`Remote $ref leaves the OpenAPI source origin: ${value}`);
  return url;
}

async function publicAddress(hostname: string): Promise<{ address: string; family: number }> {
  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address, family }) => !isPublicImportAddress(address, family))) {
    throw new Error(`OpenAPI source host does not resolve only to public addresses: ${hostname}`);
  }
  return addresses[0];
}

export function isPublicImportAddress(address: string, family: number): boolean {
  return !blocked.check(address, family === 4 ? 'ipv4' : 'ipv6');
}

async function downloadPublic(url: URL): Promise<Buffer> {
  const address = await publicAddress(url.hostname);
  return new Promise((resolve, reject) => {
    const req = request(url, {
      method: 'GET', timeout: 10_000, headers: { accept: 'application/yaml, application/json, text/yaml, text/plain', 'accept-encoding': 'identity' },
      lookup: ((_host: string, options: { all?: boolean }, callback: (...args: any[]) => void) => {
        if (options.all) callback(null, [address]);
        else callback(null, address.address, address.family);
      }) as any
    }, response => {
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`OpenAPI download returned HTTP ${response.statusCode} for ${url}`));
        return;
      }
      const chunks: Buffer[] = [];
      let size = 0;
      response.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size > maxFileBytes) { req.destroy(new Error(`OpenAPI source exceeds ${maxFileBytes} bytes: ${url}`)); return; }
        chunks.push(chunk);
      });
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    });
    const deadline = setTimeout(() => req.destroy(new Error(`OpenAPI download exceeded 30 seconds: ${url}`)), 30_000);
    req.once('close', () => clearTimeout(deadline));
    req.on('timeout', () => req.destroy(new Error(`OpenAPI download timed out: ${url}`)));
    req.on('error', reject);
    req.end();
  });
}

function parse(source: Buffer, url: string): any {
  const document = YAML.parseDocument(source.toString('utf8'), { uniqueKeys: true });
  if (document.errors.length) throw new Error(`${url}: ${document.errors.map(error => error.message).join('; ')}`);
  return document.toJS();
}

function localPath(url: string, entry: string): string {
  return url === entry ? 'openapi.yaml' : `refs/${hash(url)}.yaml`;
}

async function snapshot(entry: string, directory: string, download: Download): Promise<Lock> {
  const entryUrl = checkedUrl(entry);
  const queue = [entryUrl.href];
  const queued = new Set(queue);
  const files: Lock['files'] = [];
  let totalBytes = 0;
  for (let index = 0; index < queue.length; index++) {
    const currentUrl = queue[index];
    const bytes = await download(new URL(currentUrl));
    totalBytes += bytes.length;
    if (bytes.length > maxFileBytes || totalBytes > maxTotalBytes) throw new Error('Remote OpenAPI source exceeds the import size limit');
    const value = parse(bytes, currentUrl);
    if (index === 0 && (!value || typeof value !== 'object' || Array.isArray(value) || !/^3\.(0|1)\./.test(String(value.openapi)))) {
      throw new Error(`${currentUrl}: OpenAPI 3.0.x or 3.1.x document required`);
    }
    const currentPath = localPath(currentUrl, entry);
    function rewriteReference(reference: string): string {
      if (reference.startsWith('#')) return reference;
      let target: URL;
      try { target = new URL(reference, currentUrl); } catch { throw new Error(`Invalid remote reference ${reference} in ${currentUrl}`); }
      let fragment: string;
      try { fragment = decodeURIComponent(target.hash); } catch { throw new Error(`Invalid remote reference fragment ${reference}`); }
      target.hash = '';
      checkedUrl(target.href, entryUrl.origin);
      if (fragment && !fragment.startsWith('#/')) throw new Error(`Unsupported remote reference fragment ${reference}`);
      if (!queued.has(target.href)) {
        if (queue.length >= maxFiles) throw new Error(`Remote OpenAPI source exceeds ${maxFiles} files`);
        queue.push(target.href);
        queued.add(target.href);
      }
      if (target.href === currentUrl) return fragment || '#';
      const relative = path.posix.relative(path.posix.dirname(currentPath), localPath(target.href, entry));
      return `${relative.startsWith('.') ? relative : `./${relative}`}${fragment}`;
    }
    async function rewrite(node: any, kind: 'object' | 'schema' | 'example' = 'object', map = false): Promise<void> {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) { for (const child of node) await rewrite(child, kind); return; }
      if (map) { for (const child of Object.values(node)) await rewrite(child, kind); return; }
      if (typeof node.$ref === 'string') node.$ref = rewriteReference(node.$ref);
      if (node.discriminator?.mapping && typeof node.discriminator.mapping === 'object') {
        for (const [name, target] of Object.entries(node.discriminator.mapping)) {
          if (typeof target !== 'string') throw new Error(`Invalid discriminator mapping ${name} in ${currentUrl}`);
          if (target.startsWith('.') || target.startsWith('/') || target.includes('/') || /\.(?:ya?ml|json)(?:#|$)/i.test(target)) node.discriminator.mapping[name] = rewriteReference(target);
        }
      }
      for (const [key, child] of Object.entries(node)) {
        if (key === '$ref' || key.startsWith('x-') || ['example', 'default', 'enum', 'const', 'security'].includes(key) ||
          (kind === 'example' && key === 'value') || (kind === 'schema' && key === 'examples')) continue;
        const childKind = kind === 'schema' || key === 'schema' || key === 'schemas' ? 'schema' : key === 'examples' ? 'example' : kind;
        const isMap = kind === 'schema'
          ? ['properties', 'patternProperties', '$defs', 'definitions', 'dependentSchemas'].includes(key)
          : ['paths', 'webhooks', 'schemas', 'responses', 'parameters', 'requestBodies', 'headers', 'links', 'callbacks', 'pathItems', 'securitySchemes', 'examples', 'content', 'encoding', 'variables', 'flows', 'scopes'].includes(key);
        await rewrite(child, childKind, isMap);
      }
    }
    await rewrite(value);
    const output = path.join(directory, currentPath);
    const digest = hash(bytes);
    const snapshotText = `# Imported from ${currentUrl}\n# Source SHA-256: ${digest}\n${YAML.stringify(value)}`;
    await mkdir(path.dirname(output), { recursive: true });
    await writeFile(output, snapshotText);
    files.push({ url: currentUrl, path: currentPath, digest, snapshotDigest: hash(snapshotText) });
  }
  const lock: Lock = { version: 1, entry, files: files.sort((a, b) => a.url.localeCompare(b.url)) };
  await writeFile(path.join(directory, 'source-lock.json'), JSON.stringify(lock, null, 2) + '\n');
  await new ApiReader().collectReferences(path.join(directory, 'openapi.yaml'));
  return lock;
}

function changes(previous: Lock | undefined, next: Lock): Array<{ url: string; before: string | null; after: string | null; snapshotBefore: string | null; snapshotAfter: string | null }> {
  const oldFiles = new Map(previous?.files.map(file => [file.url, file]) ?? []);
  const newFiles = new Map(next.files.map(file => [file.url, file]));
  return [...new Set([...oldFiles.keys(), ...newFiles.keys()])].sort().flatMap(url => {
    const before = oldFiles.get(url);
    const after = newFiles.get(url);
    return before?.digest === after?.digest && before?.snapshotDigest === after?.snapshotDigest ? [] : [{
      url, before: before?.digest ?? null, after: after?.digest ?? null,
      snapshotBefore: before?.snapshotDigest ?? null, snapshotAfter: after?.snapshotDigest ?? null
    }];
  });
}

export async function importRemoteOpenApi(url: string, directory: string, options: Options = {}) {
  const entry = checkedUrl(url).href;
  const output = path.resolve(directory);
  try { await lstat(output); throw new Error(`Import output already exists: ${output}`); } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  await mkdir(path.dirname(output), { recursive: true });
  const candidate = await mkdtemp(path.join(path.dirname(output), '.shoalrun-import-'));
  try {
    const lock = await snapshot(entry, candidate, options.download ?? downloadPublic);
    await rename(candidate, output);
    return { status: 'imported' as const, directory: output, entry: lock.entry, files: lock.files, changes: changes(undefined, lock) };
  } catch (error) { await rm(candidate, { recursive: true, force: true }); throw error; }
}

export async function refreshRemoteOpenApi(directory: string, options: Options = {}) {
  const output = path.resolve(directory);
  if (!(await lstat(output)).isDirectory()) throw new Error(`Snapshot must be a directory: ${output}`);
  const previous = JSON.parse(await readFile(path.join(output, 'source-lock.json'), 'utf8')) as Lock;
  if (previous.version !== 1 || !Array.isArray(previous.files) || previous.files.some(file =>
    typeof file.path !== 'string' || typeof file.snapshotDigest !== 'string' ||
    (file.path !== 'openapi.yaml' && !/^refs\/[0-9a-f]{64}\.yaml$/.test(file.path))
  )) throw new Error(`Invalid source-lock.json in ${output}`);
  for (const file of previous.files) {
    if (!(await lstat(path.join(output, file.path))).isFile()) throw new Error(`Snapshot file is not a regular file: ${file.path}`);
    const actual = hash(await readFile(path.join(output, file.path)));
    if (actual !== file.snapshotDigest) throw new Error(`Local OpenAPI snapshot changed since import: ${file.path}`);
  }
  const entry = checkedUrl(previous.entry).href;
  const candidate = await mkdtemp(path.join(path.dirname(output), '.shoalrun-import-'));
  try {
    const lock = await snapshot(entry, candidate, options.download ?? downloadPublic);
    const changed = changes(previous, lock);
    if (!changed.length) {
      await rm(candidate, { recursive: true, force: true });
      return { status: 'unchanged' as const, directory: output, entry, files: lock.files, changes: changed };
    }
    const nextOutput = path.resolve(options.output ?? `${output}-refresh-${hash(JSON.stringify(lock)).slice(0, 12)}`);
    const relative = path.relative(output, nextOutput);
    if (nextOutput === output || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative))) {
      throw new Error(`Refresh output must be outside the current snapshot: ${nextOutput}`);
    }
    let existingOutput = false;
    try { existingOutput = (await lstat(nextOutput)).isDirectory(); } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    if (existingOutput) {
      const existing = JSON.parse(await readFile(path.join(nextOutput, 'source-lock.json'), 'utf8')) as Lock;
      if (JSON.stringify(existing) !== JSON.stringify(lock)) throw new Error(`Refresh output already exists with different content: ${nextOutput}`);
      for (const file of existing.files) if (!(await lstat(path.join(nextOutput, file.path))).isFile() || hash(await readFile(path.join(nextOutput, file.path))) !== file.snapshotDigest) {
        throw new Error(`Refresh output already exists with changed content: ${nextOutput}`);
      }
      await rm(candidate, { recursive: true, force: true });
      return { status: 'updated' as const, directory: nextOutput, previousDirectory: output, entry, files: lock.files, changes: changed };
    }
    try { await lstat(nextOutput); throw new Error(`Refresh output already exists: ${nextOutput}`); } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    await mkdir(path.dirname(nextOutput), { recursive: true });
    await rename(candidate, nextOutput);
    return { status: 'updated' as const, directory: nextOutput, previousDirectory: output, entry, files: lock.files, changes: changed };
  } catch (error) { await rm(candidate, { recursive: true, force: true }); throw error; }
}
