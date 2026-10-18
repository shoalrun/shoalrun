import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { commitArtifacts } from './output-commit.js';

const artifacts = (value: string) => new Map<string, string | Buffer>([['/documents.json', '{}'], ['/resource-headers.json', '{}'], ['/index.html', value]]);

test('an interrupted output swap restores the previous site before publishing the next one', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-output-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const target = path.join(directory, 'dist');
  const previous = `${target}.staging-99999999-previous`;
  await mkdir(previous);
  await writeFile(path.join(previous, 'documents.json'), '{}');
  await writeFile(path.join(previous, 'resource-headers.json'), '{}');
  await writeFile(path.join(previous, 'index.html'), 'old');
  await assert.rejects(commitArtifacts(target, new Map([['/broken', 'bad'], ['/broken/child', 'bad']])), /EEXIST|ENOTDIR/);
  assert.equal(await readFile(path.join(target, 'index.html'), 'utf8'), 'old');
  await commitArtifacts(target, artifacts('new'));
  assert.equal(await readFile(path.join(target, 'index.html'), 'utf8'), 'new');
  assert.deepEqual((await readdir(directory)).filter(name => name.includes('staging-') || name.endsWith('.lock')), []);
});

test('two builds cannot commit to the same output at once', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-output-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const target = path.join(directory, 'dist');
  const results = await Promise.allSettled([commitArtifacts(target, artifacts('one')), commitArtifacts(target, artifacts('two'))]);
  assert.equal(results.filter(item => item.status === 'fulfilled').length, 1);
  assert.equal(results.filter(item => item.status === 'rejected').length, 1);
  assert.match((results.find(item => item.status === 'rejected') as PromiseRejectedResult).reason.message, /already being built/);
});

test('failure while preparing generated helpers keeps the previous site', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-output-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const target = path.join(directory, 'dist');
  await commitArtifacts(target, artifacts('old'));
  await assert.rejects(commitArtifacts(target, artifacts('new'), async () => { throw new Error('helper write failed'); }), /helper write failed/);
  assert.equal(await readFile(path.join(target, 'index.html'), 'utf8'), 'old');
  assert.deepEqual((await readdir(directory)).filter(name => name.includes('staging-') || name.endsWith('.lock')), []);
});
