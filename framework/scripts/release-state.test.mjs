import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { approvalId, requireApproval, publishOnce, deployOnce, verifyArchive, digest, releaseTag, withCompilerLock } from './release-state.mjs';
import { sourceFingerprint, auditReleaseDependencies, releaseFrameworkFile } from './release.mjs';
import { execFileSync } from 'node:child_process';

const expected = { version: '0.1.0-alpha.18', integrity: 'sha512-reviewed' };
test('release commits include versioned root installation instructions but reject unrelated source', () => {
  for (const file of ['README.md', 'framework/README.md', 'framework/CHANGELOG.md', 'framework/package.json', 'framework/package-lock.json', 'framework/agent-docs/SNAPSHOT.json']) assert.equal(releaseFrameworkFile(file), true, file);
  for (const file of ['framework/src/cli.ts', 'framework/README.md.backup', 'notes.md', 'package.json']) assert.equal(releaseFrameworkFile(file), false, file);
});
test('release dependency audits include docs development tools and stop on an advisory', () => {
  const calls = [];
  const audit = (label, command, args, directory) => {
    calls.push({ command, args, directory });
    if (directory === '/docs' && !args.includes('--omit=dev')) throw new Error('Docs development dependency advisory');
  };
  assert.throws(() => auditReleaseDependencies('/framework', '/docs', audit), /Docs development dependency advisory/);
  assert.deepEqual(calls, [
    { command: 'npm', args: ['audit', '--json'], directory: '/framework' },
    { command: 'npm', args: ['audit', '--omit=dev', '--json'], directory: '/framework' },
    { command: 'npm', args: ['audit', '--json'], directory: '/docs' },
  ]);
  const successful = [];
  auditReleaseDependencies('/framework', '/docs', (...args) => successful.push(args));
  assert.equal(successful.length, 4);
  assert.deepEqual(successful.at(-1).slice(1), ['npm', ['audit', '--omit=dev', '--json'], '/docs']);
});
test('local compiler installation uses the committed dependency graph and restores source after failure', t => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'release-lock-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const pkg = JSON.stringify({ dependencies: { '@shoalrun/cli': 'old' } });
  const lock = JSON.stringify({ packages: { '': { dependencies: { '@shoalrun/cli': 'old' } }, 'node_modules/@shoalrun/cli': { version: 'old' }, 'node_modules/other': { version: 'fixed', integrity: 'original' } } });
  writeFileSync(path.join(root, 'package.json'), pkg); writeFileSync(path.join(root, 'package-lock.json'), lock);
  const archive = path.join(root, 'compiler.tgz'); writeFileSync(archive, 'archive');
  assert.throws(() => withCompilerLock(root, expected.version, archive, () => {
    const candidate = JSON.parse(readFileSync(path.join(root, 'package-lock.json')));
    assert.equal(candidate.packages['node_modules/@shoalrun/cli'].resolved, `file:${archive}`);
    assert.deepEqual(candidate.packages['node_modules/other'], { version: 'fixed', integrity: 'original' });
    throw new Error('Installation failed');
  }), /Installation failed/);
  assert.equal(readFileSync(path.join(root, 'package.json'), 'utf8'), pkg);
  assert.equal(readFileSync(path.join(root, 'package-lock.json'), 'utf8'), lock);
});
test('hosting authentication can recover before upload while an ambiguous deployment is never repeated', async t => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'release-hosting-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  let authorized = false, uploads = 0, live = false;
  const input = { marker: path.join(root, 'deploy.json'), buildId: 'reviewed', live: async () => live, authenticate: async () => { if (!authorized) throw new Error('Login required'); }, deploy: async () => { uploads++; throw new Error('Upload response lost'); } };
  await assert.rejects(deployOnce(input), /Login required/);
  authorized = true;
  await assert.rejects(deployOnce(input), /Upload response lost/);
  assert.equal(await deployOnce(input), 'pending');
  assert.equal(uploads, 1);
  live = true;
  assert.equal(await deployOnce(input), 'verified');
});
test('releases preserve an existing prerelease latest channel without moving a stable latest tag', () => {
  assert.equal(releaseTag('0.1.0-alpha.18', '0.1.0-alpha.17'), 'latest');
  assert.equal(releaseTag('1.1.0-beta.1', '1.0.0'), 'beta');
  assert.equal(releaseTag('1.1.0', '1.0.0'), 'latest');
});
test('release checkpoints include unpublished source edits and exclude ignored build output', t => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'release-inputs-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  execFileSync('git', ['init', '--quiet', root]);
  writeFileSync(path.join(root, '.gitignore'), 'output.txt\n');
  writeFileSync(path.join(root, 'page.md'), 'Reviewed text');
  execFileSync('git', ['add', '.'], { cwd: root });
  const before = sourceFingerprint(root);
  writeFileSync(path.join(root, 'output.txt'), 'Generated build');
  assert.equal(sourceFingerprint(root), before);
  writeFileSync(path.join(root, 'page.md'), 'Changed text');
  assert.notEqual(sourceFingerprint(root), before);
  const edited = sourceFingerprint(root);
  writeFileSync(path.join(root, 'new.md'), 'Untracked source');
  assert.notEqual(sourceFingerprint(root), edited);
});
test('an interrupted npm upload is never repeated and can resume through registry verification', async t => {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'release-state-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const marker = path.join(directory, 'attempt.json');
  let calls = 0, registered;
  const input = { marker, expected, lookup: async () => registered, publish: async () => { calls++; throw new Error('Connection lost after upload'); } };
  await assert.rejects(publishOnce(input), /Connection lost/);
  assert.equal(await publishOnce(input), 'pending');
  assert.equal(calls, 1);
  registered = { version: expected.version, dist: { integrity: expected.integrity } };
  assert.equal(await publishOnce(input), 'verified');
  assert.equal(calls, 1);
  registered.dist.integrity = 'sha512-other';
  await assert.rejects(publishOnce(input), /differs/);
});
test('unavailable registry metadata cannot trigger an upload', async t => {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'release-network-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  let uploaded = false;
  await assert.rejects(publishOnce({ marker: path.join(directory, 'marker'), expected, lookup: async () => { throw new Error('Offline'); }, publish: async () => { uploaded = true; } }), /Offline/);
  assert.equal(uploaded, false);
});
test('approval and publication evidence reject modified artifacts or a changed site plan', t => {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'release-approval-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'package.tgz'), bytes = Buffer.from('reviewed archive');
  writeFileSync(file, bytes);
  const artifact = { sha256: digest(bytes), integrity: `sha512-${createHash('sha512').update(bytes).digest('base64')}` };
  verifyArchive(file, artifact);
  const plan = { ...artifact, docsCommit: 'a'.repeat(40), buildId: 'b'.repeat(64) };
  const approval = approvalId(plan);
  requireApproval(plan, approval);
  assert.throws(() => requireApproval({ ...plan, buildId: 'c'.repeat(64) }, approval), /exact reviewed/);
  writeFileSync(file, 'changed archive');
  assert.throws(() => verifyArchive(file, artifact), /archive changed/);
});
