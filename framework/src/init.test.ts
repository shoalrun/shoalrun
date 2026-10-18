import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const cli = path.join(path.dirname(fileURLToPath(import.meta.url)), 'cli.js');
const run = (cwd: string, ...args: string[]) => spawnSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8' });

test('init creates a buildable minimal site and checks conflicts before writing', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-init-'));
  try {
    await writeFile(path.join(root, 'notes.txt'), 'keep this file');
    const result = run(root, 'init');
    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.equal(output.starter, 'minimal');
    assert.deepEqual(output.files, ['content/install.mdx', 'content/welcome.mdx', 'docs.config.yaml']);
    assert.deepEqual(output.next, ['shoalrun config validate docs.config.yaml', 'shoalrun build docs.config.yaml site-dist']);
    assert.equal(await readFile(path.join(root, 'notes.txt'), 'utf8'), 'keep this file');

    const build = run(root, 'build', 'docs.config.yaml', 'site-dist');
    assert.equal(build.status, 0, build.stderr);
    assert.match(await readFile(path.join(root, 'site-dist/index.html'), 'utf8'), /Welcome/);
    assert.match(await readFile(path.join(root, 'site-dist/index.md'), 'utf8'), /Welcome/);

    const again = run(root, 'init');
    assert.equal(again.status, 1);
    assert.match(JSON.parse(again.stderr).message, /would overwrite/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('init copies the API starter and leaves a conflicting directory untouched', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-init-api-'));
  try {
    const target = path.join(root, 'api-site');
    const result = run(root, 'init', '--starter', 'api-docs', target);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).starter, 'api-docs');
    const build = run(target, 'build');
    assert.equal(build.status, 0, build.stderr);
    const manifest = JSON.parse(await readFile(path.join(target, 'site-dist/documents.json'), 'utf8'));
    assert.equal(manifest.documents.length, 8);
    assert.ok(manifest.documents.some((page: { id: string; url: string }) => page.id === 'guide.overview' && page.url === '/'));
    assert.equal(await readFile(path.join(target, 'apis/cedar-parcel.yaml'), 'utf8'), await readFile(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../example-configs/reference-stress/apis/cedar-parcel.yaml'), 'utf8'));
    const overview = await readFile(path.join(target, 'site-dist/index.html'), 'utf8');
    assert.match(overview, /fictional API/);
    assert.match(overview, /href="\/quickstart"/);
    assert.match(overview, /class="mode-toggle"/);
    assert.match(overview, /Use Markdown for complete examples/);
    const quickstart = await readFile(path.join(target, 'site-dist/quickstart.md'), 'utf8');
    assert.match(quickstart, /create-enrollment/);
    assert.match(quickstart, /X-Application-Key/);
    assert.match(quickstart, /enr_demo_001/);
    assert.doesNotMatch(overview + quickstart, /payment/i);

    const blocked = path.join(root, 'blocked');
    await mkdir(blocked);
    await writeFile(path.join(blocked, 'docs.config.yaml'), 'owner content');
    const conflict = run(root, 'init', blocked, '--starter', 'api-docs');
    assert.equal(conflict.status, 1);
    assert.equal(await readFile(path.join(blocked, 'docs.config.yaml'), 'utf8'), 'owner content');
    await assert.rejects(readFile(path.join(blocked, 'content/quickstart.mdx'), 'utf8'), { code: 'ENOENT' });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
