import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundleDocs } from './build-agent-docs.mjs';

const framework = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

// Import only an explicitly reviewed local export. No network or source checkout
// discovery: the caller identifies the exact docs commit being released.
export async function importDocsSnapshot(source, destination, sourceCommit) {
  if (!/^[a-f0-9]{40}$/.test(sourceCommit ?? '')) throw new Error('Provide --source-commit with the full reviewed docs commit SHA');
  source = path.resolve(source);
  destination = path.resolve(destination);
  if (source === destination || source.startsWith(destination + path.sep) || destination.startsWith(source + path.sep)) throw new Error('Source and destination must be separate directories');
  const container = await mkdtemp(destination + '.import-');
  const staging = path.join(container, 'snapshot');
  const backup = path.join(container, 'previous');
  let backedUp = false;
  try {
    // This copies only declared Markdown, navigation and index files, rejecting
    // traversal and symlinks outside the supplied export before touching target.
    await bundleDocs(source, staging);
    const manifestBytes = await readFile(path.join(staging, 'documents.json'));
    const indexBytes = await readFile(path.join(staging, 'search-index.json'));
    const manifest = JSON.parse(manifestBytes);
    const index = JSON.parse(indexBytes);
    const provenance = JSON.parse(await readFile(path.join(source, 'provenance.json'), 'utf8'));
    if (provenance.schemaVersion !== 1 || provenance.manifestDigest !== digest(manifestBytes) || !/^[a-f0-9]{64}$/.test(provenance.siteBuild?.buildId ?? '') || typeof provenance.packageIntegrity !== 'string' || !provenance.packageIntegrity.startsWith('sha512-')) throw new Error('Export provenance does not match the documentation manifest');
    if (!manifest.documents.length || index.documents.length !== manifest.documents.length) throw new Error('Snapshot needs one search record per document');
    const ids = new Set();
    for (const doc of manifest.documents) {
      if (typeof doc.id !== 'string' || ids.has(doc.id)) throw new Error('Snapshot document IDs must be unique');
      ids.add(doc.id);
      const records = index.documents.filter(record => record.id === doc.id && record.markdownUrl === doc.markdownUrl);
      if (records.length !== 1) throw new Error(`Missing or duplicate search record: ${doc.id}`);
      for (const item of [doc, ...(doc.sections ?? [])]) {
        const bytes = await readFile(path.join(staging, item.markdownUrl));
        if (digest(bytes) !== item.digest || bytes.length !== item.markdownBytes) throw new Error(`Markdown digest or byte count mismatch: ${item.markdownUrl}`);
        if (item !== doc && item.parentDigest !== doc.digest) throw new Error(`Section parent digest mismatch: ${item.markdownUrl}`);
      }
    }
    await writeFile(path.join(staging, 'provenance.json'), JSON.stringify(provenance, null, 2) + '\n');
    await writeFile(path.join(staging, 'SNAPSHOT.json'), JSON.stringify({ schemaVersion: 1, sourceRepository: 'https://github.com/shoalrun/docs', sourceCommit, siteBuildId: provenance.siteBuild.buildId, manifestDigest: digest(manifestBytes), indexDigest: digest(indexBytes), packageIntegrity: provenance.packageIntegrity }, null, 2) + '\n');
    try { await rename(destination, backup); backedUp = true; } catch (error) { if (error.code !== 'ENOENT') throw error; }
    try { await rename(staging, destination); } catch (error) { if (backedUp) { await rename(backup, destination); backedUp = false; } throw error; }
    return { pages: ids.size, sourceCommit };
  } finally {
    await rm(container, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [source, flag, commit, ...extra] = process.argv.slice(2);
  if (!source || flag !== '--source-commit' || extra.length) {
    console.error('Usage: npm run agent-docs:import -- <reviewed-export> --source-commit <full-docs-commit>');
    process.exitCode = 1;
  } else {
    importDocsSnapshot(source, path.join(framework, 'agent-docs'), commit).then(result => console.log(JSON.stringify(result))).catch(error => { console.error(error.message); process.exitCode = 1; });
  }
}
