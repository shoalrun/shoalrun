import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { bundleDocs } from './build-agent-docs.mjs';

test('bundled docs reuse exact manifest, index, and nested Markdown from a prebuilt site', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-bundle-reuse-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const site = path.join(root, 'site');
  const target = path.join(root, 'bundle');
  await mkdir(path.join(site, 'author'), { recursive: true });
  const files = {
    'documents.json': JSON.stringify({ schemaVersion: 1, documents: [{ id: 'guide', markdownUrl: '/author/guide.md' }] }),
    'search-index.json': JSON.stringify({ schemaVersion: 1, documents: [{ id: 'guide', text: 'Guide' }] }),
    'author/guide.md': '# Guide\n\nContent from the existing build.\n',
  };
  for (const [file, content] of Object.entries(files)) await writeFile(path.join(site, file), content);
  await mkdir(target);
  await writeFile(path.join(target, 'old.md'), 'old');
  assert.deepEqual(await bundleDocs(site, target), { pages: 1, records: 1 });
  for (const [file, content] of Object.entries(files)) assert.equal(await readFile(path.join(target, file), 'utf8'), content);
  await assert.rejects(readFile(path.join(target, 'old.md')), { code: 'ENOENT' });

  for (const markdownUrl of ['/../outside.md', '/author/../outside.md', '/author/guide.md?view=all', '/author\\guide.md']) {
    await writeFile(path.join(site, 'documents.json'), JSON.stringify({ schemaVersion: 1, documents: [{ markdownUrl }] }));
    await assert.rejects(bundleDocs(site, target), /Invalid manifest/);
    assert.equal(await readFile(path.join(target, 'author/guide.md'), 'utf8'), files['author/guide.md']);
  }
  await writeFile(path.join(site, 'documents.json'), files['documents.json']);
  await rm(path.join(site, 'author/guide.md'));
  await assert.rejects(bundleDocs(site, target), { code: 'ENOENT' });
  assert.equal(await readFile(path.join(target, 'author/guide.md'), 'utf8'), files['author/guide.md']);
  await writeFile(path.join(root, 'outside.md'), 'outside');
  await symlink(path.join(root, 'outside.md'), path.join(site, 'author/guide.md'));
  await assert.rejects(bundleDocs(site, target), /escapes the build/);
  await writeFile(path.join(site, 'documents.json'), '{}');
  await assert.rejects(bundleDocs(site, target), /Expected a Shoalrun/);
  assert.equal(await readFile(path.join(target, 'author/guide.md'), 'utf8'), files['author/guide.md']);
});


test('Markdown bundles omit whole-site identity but retain changed page metadata and bytes', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-bundle-identity-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const site = path.join(root, 'site'), target = path.join(root, 'bundle');
  await mkdir(site);
  const manifest = { schemaVersion: 1, buildId: 'a'.repeat(64), documents: [{id: 'page', markdownUrl: '/page.md', digest: 'first-page-digest'}] };
  await writeFile(path.join(site, 'documents.json'), JSON.stringify(manifest));
  await writeFile(path.join(site, 'search-index.json'), JSON.stringify({schemaVersion: 1, documents: []}));
  await writeFile(path.join(site, 'page.md'), '# Page');
  await bundleDocs(site, target);
  const first = await readFile(path.join(target, 'documents.json'), 'utf8');
  assert.equal(JSON.parse(first).buildId, undefined);
  manifest.buildId = 'b'.repeat(64);
  await writeFile(path.join(site, 'documents.json'), JSON.stringify(manifest));
  await bundleDocs(site, target);
  assert.equal(await readFile(path.join(target, 'documents.json'), 'utf8'), first);
  manifest.documents[0].digest = 'changed-page-digest';
  await writeFile(path.join(site, 'documents.json'), JSON.stringify(manifest));
  await writeFile(path.join(site, 'page.md'), '# Changed page');
  await bundleDocs(site, target);
  assert.equal(JSON.parse(await readFile(path.join(target, 'documents.json'), 'utf8')).documents[0].digest, 'changed-page-digest');
  assert.equal(await readFile(path.join(target, 'page.md'), 'utf8'), '# Changed page');
  assert.equal(JSON.parse(await readFile(path.join(site, 'documents.json'), 'utf8')).buildId, manifest.buildId, 'public site identity remains unchanged');
});
