import { copyFile, mkdir, mkdtemp, readFile, realpath, rename, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const framework = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(framework, 'agent-docs');
export async function bundleDocs(site, destination) {
  const root = await realpath(site);
  const manifest = JSON.parse(await readFile(path.join(root, 'documents.json'), 'utf8'));
  const index = JSON.parse(await readFile(path.join(root, 'search-index.json'), 'utf8'));
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.documents) || index.schemaVersion !== 1 || !Array.isArray(index.documents)) throw new Error('Expected a Shoalrun documentation build');
  const files = ['documents.json', 'search-index.json'];
  for (const tab of manifest.navigationTabs ?? []) {
    if (typeof tab.indexUrl !== 'string' || !/^\/(?:[^?#\\]+\/)*navigation\/[a-z0-9-]+\.txt$/.test(tab.indexUrl) || tab.indexUrl.split('/').some(part => part === '..' || part === '.')) throw new Error('Invalid navigation index URL');
    files.push(tab.indexUrl.slice(1));
  }
  for (const doc of manifest.documents.flatMap(doc => [doc, ...(doc.sections ?? [])])) {
    if (typeof doc.markdownUrl !== 'string' || !doc.markdownUrl.startsWith('/') || !doc.markdownUrl.endsWith('.md') || /[?#\\\\]/.test(doc.markdownUrl)) throw new Error('Invalid manifest Markdown URL');
    const relative = doc.markdownUrl.slice(1);
    if (relative.split('/').some(segment => !segment || segment === '.' || segment === '..')) throw new Error('Invalid manifest Markdown path');
    files.push(relative);
  }
  const resolved = [];
  for (const relative of files) {
    const sourceFile = await realpath(path.join(root, relative));
    if (!sourceFile.startsWith(root + path.sep)) throw new Error('Manifest file escapes the build directory');
    resolved.push([relative, sourceFile]);
  }
  await mkdir(path.dirname(destination), { recursive: true });
  const staging = await mkdtemp(destination + '.staging-');
  try {
    for (const [relative, sourceFile] of resolved) {
      const output = path.join(staging, relative);
      await mkdir(path.dirname(output), { recursive: true });
      if (relative === 'documents.json' && Object.hasOwn(manifest, 'buildId')) {
        // This package omits HTML, images, and other site assets. Their platform-
        // dependent build identity must not claim to identify this Markdown subset.
        const { buildId, ...bundledManifest } = manifest;
        await writeFile(output, JSON.stringify(bundledManifest, null, 2) + '\n');
      } else await copyFile(sourceFile, output);
    }
    await rm(destination, { recursive: true, force: true });
    await rename(staging, destination);
    return { pages: manifest.documents.length, records: index.documents.length };
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

async function main(args) {
  if (args.length !== 2 || args[0] !== '--site') throw new Error('Use --site <reviewed-built-site>; site source lives in shoalrun/docs');
  console.log(JSON.stringify(await bundleDocs(path.resolve(args[1]), target)));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
