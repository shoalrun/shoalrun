import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../../.github/scripts/ci-phase.mjs', import.meta.url));
test('runner temporary directory supplies the default timing file', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'ci-runner-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const env = { ...process.env, RUNNER_TEMP: directory };
  delete env.CI_TIMING_FILE;
  const result = spawnSync(process.execPath, [script, 'run', 'preflight', process.execPath, '-e', 'process.exit(0)'], { env, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(await readFile(path.join(directory, 'ci-phase-timings.jsonl'), 'utf8'), /"state":"finished"/);
});

test('phase timing preserves success, failure, missing-command and signal exit codes', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'ci-phase-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'timings.jsonl');
  const env = { ...process.env, CI_TIMING_FILE: file };
  const run = args => spawnSync(process.execPath, [script, ...args], { env, encoding: 'utf8' });
  assert.equal(run(['run', 'success', process.execPath, '-e', 'process.exit(0)']).status, 0);
  assert.equal(run(['run', 'failure', process.execPath, '-e', 'process.exit(7)']).status, 7);
  assert.equal(run(['run', 'missing', path.join(directory, 'no-command')]).status, 1);
  assert.equal(run(['run', 'signal', process.execPath, '-e', 'process.kill(process.pid, "SIGTERM")']).status, 143);
  const records = (await readFile(file, 'utf8')).trim().split('\n').map(JSON.parse);
  assert.deepEqual(records.filter(r => r.state === 'finished').map(r => r.status), [0, 7, 1, 143]);
  assert.ok(records.filter(r => r.state === 'finished').every(r => r.seconds >= 0));
  assert.ok(!JSON.stringify(records).includes('process.exit'), 'do not record command arguments');
});

test('summary reports failures and interrupted phases without calling command time total runner time', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'ci-summary-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'timings.jsonl'), summary = path.join(directory, 'summary.md');
  await writeFile(file, [
    { phase: 'compile', state: 'finished', seconds: 2.5, status: 0 },
    { phase: 'tests', state: 'finished', seconds: 3.25, status: 7 },
    { phase: 'package-install', state: 'started' },
  ].map(row => JSON.stringify(row)).join('\n') + '\n');
  const env = { ...process.env, CI_TIMING_FILE: file, GITHUB_STEP_SUMMARY: summary, CI_NPM_CACHE_HIT: 'false' };
  const result = spawnSync(process.execPath, [script, 'summary'], { env, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const text = await readFile(summary, 'utf8');
  assert.match(text, /5\.75 seconds/);
  assert.match(text, /failed \(7\)/);
  assert.match(text, /interrupted or unfinished/);
  assert.match(text, /excludes checkout/);
  assert.match(text, /npm: false/);
  env.CI_TIMING_FILE = path.join(directory, 'absent.jsonl');
  assert.equal(spawnSync(process.execPath, [script, 'summary'], { env }).status, 0);
  assert.match(await readFile(summary, 'utf8'), /Setup may have failed/);
});
