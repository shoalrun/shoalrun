import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditProject, parseAuditSettings } from './audit.js';

const framework = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('audit check inputs are optional distinct path declarations', () => {
  const spec = { id: 'format', run: ['vale', 'content'] };
  assert.deepEqual(parseAuditSettings({ tests: [spec] }).tests, [spec]);
  assert.deepEqual(parseAuditSettings({ tests: [{ ...spec, inputs: ['../rules'] }] }).tests[0].inputs, ['../rules']);
  for (const inputs of ['../rules', [7], [''], ['../rules', '../rules']]) {
    assert.throws(() => parseAuditSettings({ tests: [{ ...spec, inputs }] }), /inputs must be/);
  }
});

test('project audit runs configured tests and API representation audits', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-project-audit-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await cp(path.join(framework, 'example'), directory, { recursive: true, filter: source => !source.includes('/dist') });
  const configFile = path.join(directory, 'docs.config.yaml');
  const base = await readFile(configFile, 'utf8');
  await writeFile(configFile, `${base}\naudit:\n  tests:\n    - id: smoke\n      run: [${JSON.stringify(process.execPath)}, -e, 'process.exit(0)']\n`);
  const report = await auditProject(configFile);
  assert.equal(report.status, 'ok', JSON.stringify(report));
  assert.ok(report.results.some(item => item.id === 'test:smoke' && item.status === 'ok'));
  assert.ok(report.results.some(item => item.id.startsWith('api:') && item.status === 'ok'));
  assert.ok(report.results.some(item => item.id === 'focused-contracts' && item.status === 'ok'));
  await writeFile(configFile, `${base}\naudit:\n  tests:\n    - id: smoke\n      run: [${JSON.stringify(process.execPath)}, -e, 'process.stderr.write("failed assertion"); process.exit(3)']\n`);
  const failed = await auditProject(configFile);
  assert.equal(failed.status, 'error');
  assert.match(failed.results.find(item => item.id === 'test:smoke')?.findings[0].message ?? '', /failed assertion/);
  assert.ok(failed.results.some(item => item.id === 'build' && item.status === 'ok'), 'independent audits still run');
  const cli = spawnSync(process.execPath, [path.join(framework, 'dist/cli.js'), 'audit', configFile], { encoding: 'utf8' });
  assert.equal(cli.status, 1);
  assert.equal(JSON.parse(cli.stdout).status, 'error');
  await writeFile(configFile, `${base}\naudit:\n  tests:\n    - id: smoke\n      run: []\n`);
  await assert.rejects(auditProject(configFile), /audit.tests\[0\].run/);
});

test('pre-push CLI reports broken links, supports JSON, and preserves existing build output', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-check-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await cp(path.join(framework, 'example-configs/minimal'), directory, { recursive: true });
  const cli = path.join(framework, 'dist/cli.js');
  const run = (...args: string[]) => spawnSync(process.execPath, [cli, 'check', ...args], { cwd: directory, encoding: 'utf8' });
  const good = run();
  assert.equal(good.status, 0, good.stderr);
  assert.match(good.stdout, /PASS build[\s\S]*PASS links[\s\S]*Checks passed/);
  await mkdir(path.join(directory, 'site-dist'));
  await writeFile(path.join(directory, 'site-dist/keep.txt'), 'last good build');
  const page = path.join(directory, 'content/welcome.mdx');
  await writeFile(page, (await readFile(page, 'utf8')) + '\n[Broken heading](/install#not-a-heading)\n');
  const bad = run('--json');
  assert.equal(bad.status, 1, bad.stderr);
  const report = JSON.parse(bad.stdout);
  assert.equal(report.status, 'error');
  assert.match(report.results.find((item: { id: string }) => item.id === 'links').findings[0].message, /Missing fragment #not-a-heading/);
  assert.equal(await readFile(path.join(directory, 'site-dist/keep.txt'), 'utf8'), 'last good build');
  const config = path.join(directory, 'docs.config.yaml');
  await writeFile(config, (await readFile(config, 'utf8')) + '\naudit: { links: false }\n');
  assert.equal(run().status, 0);
  assert.equal(run('--bogus').status, 1);
  await writeFile(config, (await readFile(config, 'utf8')).replace('audit: { links: false }', ''));
  await writeFile(page, (await readFile(page, 'utf8')) + '\n{process.exit(0)}\n');
  const malformed = run('--json');
  assert.equal(malformed.status, 1);
  assert.ok(JSON.parse(malformed.stdout).results.some((item: { id: string; status: string }) => item.id === 'build' && item.status === 'error'));
  assert.equal(await readFile(path.join(directory, 'site-dist/keep.txt'), 'utf8'), 'last good build');
});
