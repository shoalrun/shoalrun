import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { compile } from './compiler.js';
import { compareDocumentSnapshots, documentSnapshot, parseDocumentSnapshot, publicationBuildId } from './document-sync.js';

const hash = (text: string) => createHash('sha256').update(text).digest('hex');
const page = (id: string, version = 'v1') => ({ id, variant: { channel: 'production', version, language: 'en' }, url: `/${version}/${id}`, markdownUrl: `/${version}/${id}.md`, digest: hash(id), contentDigest: hash(id), title: id });
const snapshot = (documents: ReturnType<typeof page>[], metadata = {}) => documentSnapshot({ documents, ...metadata }, hash(JSON.stringify([documents, metadata])));

test('sync compares publication identities, removals, moves, content and manifest-only metadata', () => {
  const old = snapshot([page('keep'), page('remove'), page('edit'), page('metadata'), page('move'), page('keep', 'v2')]);
  const current = snapshot([page('keep'), page('new'), { ...page('edit'), digest: hash('edited') }, { ...page('metadata'), title: 'New title' }, { ...page('move'), url: '/moved', markdownUrl: '/moved.md' }]);
  const result = compareDocumentSnapshots(old, current);
  assert.deepEqual(result.added.map(doc => doc.id), ['new']);
  assert.deepEqual(result.changed.map(doc => doc.id), ['edit', 'metadata', 'move']);
  assert.deepEqual(result.removed.map(doc => [doc.id, doc.variant.version]), [['keep', 'v2'], ['remove', 'v1']]);
  assert.equal(result.metadataChanged, false);
  assert.equal(result.buildChanged, true);
  assert.deepEqual(compareDocumentSnapshots(old, old).changed, []);
  assert.equal(compareDocumentSnapshots(old, old).buildChanged, false);
  assert.equal(compareDocumentSnapshots(snapshot([]), snapshot([], { redirects: ['/new'] })).metadataChanged, true);
});

test('sync validates both inputs, rejects duplicates, and does not equate versions', () => {
  const valid = snapshot([page('one'), page('one', 'v2')]);
  assert.equal(parseDocumentSnapshot(valid).documents.length, 2);
  for (const invalid of [null, {}, { ...valid, schemaVersion: 2 }, { ...valid, documents: [valid.documents[0], valid.documents[0]] }, { ...valid, documents: [{ ...valid.documents[0], digest: 'bad' }] }, { ...valid, documents: [{ ...valid.documents[0], variant: null }] }]) {
    assert.throws(() => compareDocumentSnapshots(invalid, valid), /sync/);
    assert.throws(() => compareDocumentSnapshots(valid, invalid), /sync/);
  }
});

test('publication identity is order-independent and covers routes and binary artifact bytes', () => {
  const entries: [string, string | Buffer][] = [['/a', 'one'], ['/b', Buffer.from([0, 255])]];
  const original = publicationBuildId(new Map(entries));
  assert.equal(publicationBuildId(new Map([...entries].reverse())), original);
  assert.notEqual(publicationBuildId(new Map([['/a', 'two'], entries[1]])), original);
  assert.notEqual(publicationBuildId(new Map([entries[0], ['/b', Buffer.from([0, 254])]])), original);
  assert.notEqual(publicationBuildId(new Map([entries[0], ['/c', entries[1][1]]])), original);
});

test('real builds publish matching stable identities, compact snapshots, and CLI changes', async t => {
  const directory = await mkdtemp(path.join(tmpdir(), 'shoalrun-sync-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await cp(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../example-configs/minimal'), directory, { recursive: true });
  const config = path.join(directory, 'docs.config.yaml');
  await writeFile(config, (await readFile(config, 'utf8')).replace('  title: Acme handbook', '  title: Acme handbook\n  basePath: /docs'));
  const output = path.join(directory, 'output');
  const first = await compile(config, output);
  const load = async (file: string) => JSON.parse(await readFile(path.join(output, file), 'utf8'));
  const before = await load('documents.sync.json');
  assert.equal(before.buildId, first.buildId);
  assert.equal((await load('build-info.json')).buildId, first.buildId);
  assert.equal((await load('documents.json')).buildId, first.buildId);
  assert.deepEqual(await load('docs/documents.sync.json'), before);
  assert.equal((await load('resource-headers.json'))['/docs/documents.sync.json']['Content-Type'], 'application/json');
  for (const doc of before.documents) assert.equal(doc.digest, hash(await readFile(path.join(output, doc.markdownUrl), 'utf8')));
  assert.equal((await compile(config, output)).buildId, first.buildId);
  assert.equal((await compile(config, path.join(directory, 'fresh-output'))).buildId, first.buildId, 'identity does not depend on output history');
  const install = path.join(directory, 'content/install.mdx');
  await writeFile(install, `${await readFile(install, 'utf8')}\nNew installation instruction.\n`);
  const next = await compile(config, output);
  assert.equal(next.configDigest, first.configDigest, 'configuration alone does not detect a content edit');
  assert.notEqual(next.buildId, first.buildId);
  const after = await load('documents.sync.json');
  assert.deepEqual(compareDocumentSnapshots(before, after).changed.map(doc => doc.id), ['guide.install']);
  const previousFile = path.join(directory, 'previous.json');
  await writeFile(previousFile, JSON.stringify(before));
  const cli = path.join(path.dirname(fileURLToPath(import.meta.url)), 'cli.js');
  const result = spawnSync(process.execPath, [cli, 'docs', 'changes', path.join(output, 'documents.sync.json'), '--since', previousFile], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), compareDocumentSnapshots(before, after));
  const invalid = spawnSync(process.execPath, [cli, 'docs', 'changes', previousFile], { encoding: 'utf8' });
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /Usage:/);
});
