import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, readdir, writeFile, rm, symlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { importDocsSnapshot } from './import-docs-snapshot.mjs';
const hash = text => createHash('sha256').update(text).digest('hex');
const commit = 'a'.repeat(40);
async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'docs-import-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = path.join(root, 'export');
  const destination = path.join(root, 'target');
  await mkdir(source);
  await mkdir(destination);
  await writeFile(path.join(destination, 'previous.md'), 'Keep this until validation succeeds');
  const markdown = '# Example\n\nComplete documentation.\n';
  const manifest = { schemaVersion: 1, documents: [{ id: 'guide.example', markdownUrl: '/example.md', digest: hash(markdown), markdownBytes: Buffer.byteLength(markdown), sections: [] }] };
  async function saveManifest() {
    const bytes = JSON.stringify(manifest);
    await writeFile(path.join(source, 'documents.json'), bytes);
    await writeFile(path.join(source, 'provenance.json'), JSON.stringify({ schemaVersion: 1, manifestDigest: hash(bytes), siteBuild: { buildId: 'b'.repeat(64) }, packageIntegrity: 'sha512-example' }));
  }
  await saveManifest();
  await writeFile(path.join(source, 'search-index.json'), JSON.stringify({ schemaVersion: 1, documents: [{ id: 'guide.example', markdownUrl: '/example.md' }] }));
  await writeFile(path.join(source, 'example.md'), markdown);
  return { root, source, destination, manifest, saveManifest };
}
test('imports only declared docs and records the exact reviewed commit', async t => {
  const { source, destination } = await fixture(t);
  await writeFile(path.join(source, '.env.local'), 'PRIVATE');
  await writeFile(path.join(source, 'index.html'), 'not a Markdown resource');
  await importDocsSnapshot(source, destination, commit);
  assert.deepEqual((await readdir(destination)).sort(), ['SNAPSHOT.json', 'documents.json', 'example.md', 'provenance.json', 'search-index.json']);
  assert.equal(JSON.parse(await readFile(path.join(destination, 'SNAPSHOT.json'))).sourceCommit, commit);
});
test('rejects changed Markdown without replacing the previous snapshot', async t => {
  const { source, destination } = await fixture(t);
  await writeFile(path.join(source, 'example.md'), 'tampered');
  await assert.rejects(importDocsSnapshot(source, destination, commit), /digest or byte count/);
  assert.deepEqual(await readdir(destination), ['previous.md']);
});
test('rejects escaping paths and symlinks, missing pages, and unpinned imports', async t => {
  for (const kind of ['path', 'symlink', 'missing', 'commit']) {
    const { root, source, destination, manifest, saveManifest } = await fixture(t);
    if (kind === 'path') { manifest.documents[0].markdownUrl = '/../private.md'; await saveManifest(); }
    if (kind === 'symlink') { await rm(path.join(source, 'example.md')); await writeFile(path.join(root, 'private.md'), 'PRIVATE'); await symlink(path.join(root, 'private.md'), path.join(source, 'example.md')); }
    if (kind === 'missing') await rm(path.join(source, 'example.md'));
    await assert.rejects(importDocsSnapshot(source, destination, kind === 'commit' ? 'main' : commit));
    assert.deepEqual(await readdir(destination), ['previous.md']);
  }
});
