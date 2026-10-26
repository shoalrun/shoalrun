import assert from 'node:assert/strict';
import { lstat, mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
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

test('unsafe artifact paths are rejected before preparation or filesystem writes', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-output-paths-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const target = path.join(directory, 'dist');
  await commitArtifacts(target, artifacts('old'));
  let prepared = false;
  for (const route of ['../outside', '/../outside', '/a/../../outside', '//outside', 'a//b', './file', 'a/./b', 'a/../b', 'a\\..\\outside', 'C:/outside', '', '/', 'bad\0name']) {
    await assert.rejects(commitArtifacts(target, new Map([['/valid', 'first'], [route, 'bad']]), async () => { prepared = true; }), /Unsafe output artifact path/);
    assert.equal(await readFile(path.join(target, 'index.html'), 'utf8'), 'old');
    assert.deepEqual(await readdir(directory), ['dist']);
  }
  await assert.rejects(commitArtifacts(target, new Map([['/same', 'one'], ['same', 'two']])), /Duplicate output artifact path/);
  assert.equal(prepared, false);
});

test('symlinked output destinations are refused without changing their contents', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-output-symlink-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const original = path.join(directory, 'original');
  const alias = path.join(directory, 'alias');
  await commitArtifacts(original, artifacts('old'));
  await symlink(original, alias);
  await assert.rejects(commitArtifacts(alias, artifacts('new')), /must not be a symbolic link/);
  assert.ok((await lstat(alias)).isSymbolicLink());
  assert.equal(await readFile(path.join(original, 'index.html'), 'utf8'), 'old');
});

test('a competing process shares the lock through parent aliases and recovers after a killed writer', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-output-process-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const parent = path.join(directory, 'real');
  const alias = path.join(directory, 'alias');
  await mkdir(parent);
  await symlink(parent, alias);
  const target = path.join(parent, 'dist');
  await commitArtifacts(target, artifacts('old'));
  const child = spawn(process.execPath, ['--input-type=module', '-e', `
    import { commitArtifacts } from ${JSON.stringify(new URL('./output-commit.js', import.meta.url).href)};
    await commitArtifacts(process.argv[1], new Map([['/index.html', 'new']]), async () => {
      process.send('locked');
      await new Promise(resolve => process.on('message', resolve));
    });
  `, path.join(alias, 'dist')], { stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
  const exited = once(child, 'exit');
  t.after(async () => { if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL'); await exited; });
  await Promise.race([once(child, 'message'), exited.then(() => { throw new Error('Writer exited before acquiring its lock'); })]);
  await assert.rejects(commitArtifacts(target, artifacts('competing')), /already being built/);
  assert.equal(await readFile(path.join(target, 'index.html'), 'utf8'), 'old');
  child.kill('SIGKILL');
  await exited;
  await commitArtifacts(target, artifacts('recovered'));
  assert.equal(await readFile(path.join(target, 'index.html'), 'utf8'), 'recovered');
  assert.deepEqual(await readdir(parent), ['dist']);
});
