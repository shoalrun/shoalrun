import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const cli = fileURLToPath(new URL('./cli.js', import.meta.url));
const run = (cwd: string, ...args: string[]) => spawnSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8' });

test('help and packaged skills are discoverable outside any project without writes', async t => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-discovery-'));
  t.after(() => rm(cwd, { recursive: true, force: true }));
  for (const args of [[], ['--help'], ['-h'], ['help'], ['docs', '--help'], ['skills', '--help']]) {
    const result = run(cwd, ...args);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, '');
    assert.match(result.stdout, /skills/);
  }
  assert.match(run(cwd, '--help').stdout, /docs validate/);
  const listing = run(cwd, 'skills', 'list', '--json');
  assert.equal(listing.status, 0, listing.stderr);
  const { skills } = JSON.parse(listing.stdout);
  assert.ok(skills.some((skill: any) => skill.name === 'shoalrun-setup'));
  assert.ok(skills.some((skill: any) => skill.name === 'shoalrun-author'));
  assert.ok(skills.some((skill: any) => skill.name === 'shoalrun-component-author'));
  for (const skill of skills) {
    assert.ok(skill.description.length > 0);
    assert.ok(path.isAbsolute(skill.file));
    const result = run(cwd, 'skills', 'read', skill.name, '--json');
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).content, await readFile(skill.file, 'utf8'));
  }
  const plain = run(cwd, 'skills', 'read', 'shoalrun-setup');
  assert.equal(plain.status, 0, plain.stderr);
  assert.equal(plain.stdout, await readFile(skills.find((skill: any) => skill.name === 'shoalrun-setup').file, 'utf8'));
  assert.deepEqual(await readdir(cwd), []);
});

test('skill discovery rejects unknown names, path traversal and malformed arguments', () => {
  for (const args of [['skills', 'read', '../README.md'], ['skills', 'read', 'missing'], ['skills', 'read'], ['skills', 'list', 'extra'], ['skills', 'list', '--json', '--json'], ['unknown-command']]) {
    const result = run(os.tmpdir(), ...args);
    assert.equal(result.status, 1);
    assert.equal(JSON.parse(result.stderr).status, 'error');
    assert.equal(result.stdout, '');
  }
});
