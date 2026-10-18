import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { compile } from './compiler.js';
import { auditProject } from './audit.js';
import { checkEvalReport, evalBuildSnapshot, evalTasksDigest, parseEvalTasks, parseEvalReport, parseEvalSettings, prepareEvalReport, compareEvalBuildInventories, parseEvalBuildInventory, type EvalReport } from './docs-eval.js';

const framework = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const definitions = { schemaVersion: 1, tasks: [
  { id: 'install', prompt: 'Explain installation from the docs.', allowedTools: ['docs.search', 'docs.read'], criteria: [{ id: 'steps', description: 'Give the documented install steps.' }] },
  { id: 'extra', prompt: 'An exploratory task.', required: false, allowedTools: ['docs.search', 'docs.read'], criteria: [{ id: 'answer', description: 'Answer with citations.' }] },
] };
async function fixture(t: { after: (fn: () => Promise<unknown>) => unknown }) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-eval-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await cp(path.join(framework, 'example-configs/minimal'), directory, { recursive: true });
  const config = path.join(directory, 'docs.config.yaml');
  const site = path.join(directory, 'site-dist');
  const manifest = await compile(config, site);
  const tasksFile = path.join(directory, 'tasks.json');
  const reportFile = path.join(directory, 'report.json');
  await writeFile(tasksFile, JSON.stringify(definitions));
  await prepareEvalReport(site, tasksFile, reportFile);
  const template = JSON.parse(await readFile(reportFile, 'utf8')) as EvalReport;
  const doc = manifest.documents.find(doc => doc.id === 'guide.install')!;
  const report: EvalReport = { ...template, recordedAt: '2026-09-30T12:00:00Z', runner: { name: 'External agent', tools: ['docs.search', 'docs.read'] }, review: { reviewer: 'Test reviewer', method: 'external', reviewedAt: '2026-09-30T12:01:00Z', notes: 'Recorded criterion assessment.' }, results: [
    { taskId: 'install', status: 'pass', answer: 'Install the CLI, then run the setup command.', citations: [{ id: doc.id, publication: doc.variant }], criteria: [{ id: 'steps', status: 'pass', reason: 'The answer includes the documented steps.' }] },
  ] };
  await writeFile(reportFile, JSON.stringify(report));
  return { directory, config, site, tasksFile, reportFile, report, template };
}

test('eval prepare makes an ungraded template and never overwrites an existing report', async t => {
  const { site, tasksFile, reportFile, template } = await fixture(t);
  assert.ok(template.results.every(result => result.status === 'skipped'));
  assert.equal(template.review, null);
  assert.equal(template.runner.name, 'not-run');
  await assert.rejects(prepareEvalReport(site, tasksFile, reportFile), /EEXIST/);
  await writeFile(reportFile, JSON.stringify(template));
  const check = await checkEvalReport(site, tasksFile, reportFile);
  assert.equal(check.status, 'error');
  assert.ok(check.findings.some(finding => finding.target === 'install'));
});

test('eval reports gate required tasks, citations, criteria, tool declarations, and review', async t => {
  const { site, tasksFile, reportFile, report } = await fixture(t);
  assert.equal((await checkEvalReport(site, tasksFile, reportFile)).status, 'ok');
  const cases: Array<[string, (copy: EvalReport) => void]> = [
    ['Required task', copy => { copy.results = []; }],
    ['Required task fail', copy => { copy.results[0].status = 'fail'; }],
    ['published page', copy => { copy.results[0].citations[0].id = 'guide.unknown'; }],
    ['published page', copy => { copy.results[0].citations[0].publication.version = 'other'; }],
    ['passing judgment', copy => { copy.results[0].criteria = []; }],
    ['passing judgment', copy => { copy.results[0].criteria[0].status = 'fail'; }],
    ['answer', copy => { copy.results[0].answer = ''; }],
    ['citation', copy => { copy.results[0].citations = []; }],
    ['review', copy => { copy.review = null; }],
    ['allowedTools', copy => { copy.runner.tools.push('shell'); }],
    ['absent', copy => { copy.results[0].taskId = 'unknown'; }],
    ['Unknown criterion', copy => { copy.results[0].criteria[0].id = 'unknown'; }],
    ['future', copy => { copy.recordedAt = '2099-01-01T00:00:00Z'; }],
  ];
  for (const [message, mutate] of cases) {
    const copy = structuredClone(report); mutate(copy);
    await writeFile(reportFile, JSON.stringify(copy));
    const checked = await checkEvalReport(site, tasksFile, reportFile);
    assert.equal(checked.status, 'error', message);
    assert.ok(checked.findings.some(finding => finding.message.includes(message)), JSON.stringify(checked));
  }
  await rm(reportFile);
  assert.match((await checkEvalReport(site, tasksFile, reportFile)).findings[0].message, /missing/);
  await writeFile(reportFile, '{bad');
  assert.match((await checkEvalReport(site, tasksFile, reportFile)).findings[0].message, /Invalid/);
});

test('eval freshness binds task definitions and published output while ignoring file touches and provenance', async t => {
  const { site, tasksFile, reportFile, report } = await fixture(t);
  const snapshot = await evalBuildSnapshot(site);
  await writeFile(path.join(site, 'build-info.json'), '{"sourceCommit":"a-new-commit"}');
  await mkdir(path.join(site, 'ai'));
  await writeFile(path.join(site, 'ai/chunks.json'), '{}');
  assert.equal((await evalBuildSnapshot(site)).buildDigest, snapshot.buildDigest);
  await writeFile(tasksFile, JSON.stringify(definitions, null, 2));
  assert.equal((await checkEvalReport(site, tasksFile, reportFile)).status, 'ok');
  const altered = structuredClone(definitions); altered.tasks[0].prompt += ' More detail.';
  await writeFile(tasksFile, JSON.stringify(altered));
  assert.ok((await checkEvalReport(site, tasksFile, reportFile)).findings.some(finding => finding.target === 'tasksDigest'));
  await writeFile(tasksFile, JSON.stringify(definitions));
  await writeFile(path.join(site, 'install/index.html'), (await readFile(path.join(site, 'install/index.html'), 'utf8')) + '<p>Changed content</p>');
  assert.ok((await checkEvalReport(site, tasksFile, reportFile)).findings.some(finding => finding.target === 'buildDigest'));
  assert.equal(report.tasksDigest, evalTasksDigest(parseEvalTasks(definitions)));
});

test('eval schemas reject duplicate tasks/results, unknown properties, bad judgments, and invalid dates', async t => {
  const { report } = await fixture(t);
  assert.throws(() => parseEvalTasks({ ...definitions, tasks: [definitions.tasks[0], definitions.tasks[0]] }), /duplicate/);
  assert.throws(() => parseEvalTasks({ ...definitions, harness: {} }), /only/);
  assert.throws(() => parseEvalReport({ ...report, results: [report.results[0], report.results[0]] }), /duplicate/);
  assert.throws(() => parseEvalReport({ ...report, recordedAt: '2026-02-30T00:00:00Z' }), /valid UTC/);
  assert.throws(() => parseEvalReport({ ...report, review: { ...report.review, method: 'automatic-pass' } }), /human or external/);
  assert.deepEqual(parseEvalSettings({ tasks: 'tasks.yaml', report: 'results.json', run: ['tool', '--arg', 'same', '--other', 'same'] })?.run, ['tool', '--arg', 'same', '--other', 'same']);
});

test('audit eval hook runs after building with exact paths/digests; nonzero runner exits still fail', async t => {
  const { directory, config, site, tasksFile, reportFile, report } = await fixture(t);
  const base = await readFile(config, 'utf8');
  const coreUrl = new URL('./docs-eval.js', import.meta.url).href;
  const hookFile = path.join(directory, 'hook.mjs');
  await writeFile(hookFile, `import {readFile,writeFile} from 'node:fs/promises'; import {evalBuildSnapshot,loadEvalTasks,evalTasksDigest} from ${JSON.stringify(coreUrl)}; const e=process.env; const snap=await evalBuildSnapshot(e.SHOALRUN_EVAL_SITE); if(snap.buildDigest!==e.SHOALRUN_EVAL_BUILD_DIGEST) throw Error('build mismatch'); if(evalTasksDigest(await loadEvalTasks(e.SHOALRUN_EVAL_TASKS))!==e.SHOALRUN_EVAL_TASKS_DIGEST) throw Error('tasks mismatch'); const report=JSON.parse(await readFile(e.SHOALRUN_EVAL_REPORT,'utf8')); report.buildDigest=snap.buildDigest; report.buildFiles=snap.fileDigests; report.tasksDigest=e.SHOALRUN_EVAL_TASKS_DIGEST; await writeFile(e.SHOALRUN_EVAL_REPORT,JSON.stringify(report));`);
  await writeFile(config, base + `\naudit:\n  evals:\n    tasks: tasks.json\n    report: report.json\n    run: [${JSON.stringify(process.execPath)}, hook.mjs]\n`);
  const good = await auditProject(config);
  assert.equal(good.status, 'ok', JSON.stringify(good));
  assert.ok(good.results.some(result => result.id === 'eval-run' && result.status === 'ok'));
  assert.ok(good.results.some(result => result.id === 'evals' && result.status === 'ok'));
  await writeFile(hookFile, (await readFile(hookFile, 'utf8')) + '\nprocess.exitCode=3;');
  const failed = await auditProject(config);
  assert.equal(failed.status, 'error');
  assert.ok(failed.results.some(result => result.id === 'eval-run' && result.status === 'error'));
  assert.ok(failed.results.some(result => result.id === 'evals' && result.status === 'ok'));
  const cli = path.join(framework, 'dist/cli.js');
  await writeFile(reportFile, JSON.stringify({ ...report, buildDigest: (await evalBuildSnapshot(site)).buildDigest }));
  const checked = spawnSync(process.execPath, [cli, 'eval', 'check', site, '--tasks', tasksFile, '--report', reportFile], { encoding: 'utf8' });
  assert.equal(checked.status, 0, checked.stderr);
  assert.equal(JSON.parse(checked.stdout).status, 'ok');
  assert.equal(spawnSync(process.execPath, [cli, 'eval', 'check', site, '--tasks', tasksFile, '--report', reportFile, '--bogus'], { encoding: 'utf8' }).status, 1);
  const mutatingHook = `import {readFile,writeFile} from 'node:fs/promises'; import {evalBuildSnapshot} from ${JSON.stringify(coreUrl)}; const e=process.env; await writeFile(e.SHOALRUN_EVAL_SITE+'/index.html','Changed by runner'); const report=JSON.parse(await readFile(e.SHOALRUN_EVAL_REPORT,'utf8')); const mutated=await evalBuildSnapshot(e.SHOALRUN_EVAL_SITE); report.buildDigest=mutated.buildDigest; report.buildFiles=mutated.fileDigests; await writeFile(e.SHOALRUN_EVAL_REPORT,JSON.stringify(report));`;
  await writeFile(hookFile, mutatingHook);
  const modified = await auditProject(config);
  assert.equal(modified.status, 'error');
  assert.ok(modified.results.find(result => result.id === 'evals')?.findings.some(finding => /modified the temporary/.test(finding.message)));
  // A build failure must not execute the post-build evaluator.
  await writeFile(hookFile, `import {writeFile} from 'node:fs/promises'; await writeFile('hook-ran.txt','yes');`);
  await writeFile(path.join(directory, 'content/welcome.mdx'), (await readFile(path.join(directory, 'content/welcome.mdx'), 'utf8')) + '\n{process.exit(0)}\n');
  const broken = await auditProject(config);
  assert.equal(broken.status, 'error');
  assert.ok(!broken.results.some(result => result.id === 'eval-run'));
  await assert.rejects(readFile(path.join(directory, 'hook-ran.txt'), 'utf8'), /ENOENT/);
});

test('included eval settings resolve task and report paths beside the declaring config', async t => {
  const { directory, config, reportFile } = await fixture(t);
  const base = await readFile(config, 'utf8');
  await mkdir(path.join(directory, 'checks'));
  await writeFile(path.join(directory, 'checks/eval.yaml'), 'tasks: ../tasks.json\nreport: ../report.json\n');
  await writeFile(config, base + '\naudit:\n  evals: { $include: ./checks/eval.yaml }\n');
  const report = await auditProject(config);
  // Changing the config invalidates the stored build. It should find the report,
  // report staleness, and never mistakenly look inside the root or temp folder.
  const evals = report.results.find(result => result.id === 'evals')!;
  assert.ok(evals.findings.some(finding => finding.target === 'buildDigest'));
  assert.ok(!evals.findings.some(finding => /missing|ENOENT/.test(finding.message)), JSON.stringify(evals));
  const stored = JSON.parse(await readFile(reportFile, 'utf8'));
  const rebuilt = path.join(directory, 'rebuilt');
  await compile(config, rebuilt);
  const snapshot = await evalBuildSnapshot(rebuilt);
  stored.buildDigest = snapshot.buildDigest;
  stored.buildFiles = snapshot.fileDigests;
  await writeFile(reportFile, JSON.stringify(stored));
  assert.equal((await auditProject(config)).status, 'ok');
});


test('eval inventories diagnose exact file changes and survive copying a build between machines', async t => {
  const { directory, site, tasksFile, reportFile, report } = await fixture(t);
  const copied = path.join(directory, 'downloaded-build');
  await cp(site, copied, { recursive: true });
  const inventory = async (root: string) => {
    const snapshot = await evalBuildSnapshot(root);
    return { schemaVersion: 1, buildDigest: snapshot.buildDigest, files: snapshot.fileDigests };
  };
  const before = await inventory(site);
  assert.equal(compareEvalBuildInventories(before, await inventory(copied)).status, 'ok');
  assert.equal((await checkEvalReport(copied, tasksFile, reportFile)).status, 'ok');
  await writeFile(path.join(copied, 'install/index.html'), 'Changed rendered page');
  await writeFile(path.join(copied, 'new.txt'), 'New published resource');
  await rm(path.join(copied, 'llms.txt'));
  const comparison = compareEvalBuildInventories(before, await inventory(copied));
  assert.deepEqual(comparison.changed, ['install/index.html']);
  assert.deepEqual(comparison.added, ['new.txt']);
  assert.deepEqual(comparison.removed, ['llms.txt']);
  const checked = await checkEvalReport(copied, tasksFile, reportFile);
  assert.equal(checked.status, 'error');
  assert.deepEqual('buildChanges' in checked.details ? checked.details.buildChanges : undefined, comparison);
  const legacy = { ...report }; delete legacy.buildFiles;
  await writeFile(reportFile, JSON.stringify(legacy));
  assert.equal((await checkEvalReport(site, tasksFile, reportFile)).status, 'ok');
  assert.match((await checkEvalReport(copied, tasksFile, reportFile)).findings[0].message, /older report has no file inventory/);
});

test('eval inventory diagnostics reject tampering, duplicate paths, and traversal', async t => {
  const { site, report } = await fixture(t);
  const snapshot = await evalBuildSnapshot(site);
  const inventory = { schemaVersion: 1, buildDigest: snapshot.buildDigest, files: snapshot.fileDigests };
  assert.deepEqual(parseEvalBuildInventory({ ...inventory, files: [...inventory.files].reverse() }), inventory);
  assert.throws(() => parseEvalBuildInventory({ ...inventory, files: [...inventory.files, inventory.files[0]] }), /duplicate/);
  assert.throws(() => parseEvalBuildInventory({ ...inventory, files: [['../outside', 'a'.repeat(64)]] }), /path/);
  assert.throws(() => parseEvalReport({ ...report, buildFiles: [] }), /do not match/);
  assert.throws(() => parseEvalBuildInventory({ ...inventory, buildDigest: 'a'.repeat(64) }), /do not match/);
});

test('eval snapshot and compare CLI report differences without approving them', async t => {
  const { directory, site } = await fixture(t);
  const cli = path.join(framework, 'dist/cli.js');
  const run = (...args: string[]) => spawnSync(process.execPath, [cli, 'eval', ...args], { encoding: 'utf8' });
  const before = run('snapshot', site);
  assert.equal(before.status, 0, before.stderr);
  const previous = path.join(directory, 'before.json');
  const current = path.join(directory, 'after.json');
  await writeFile(previous, before.stdout);
  await writeFile(current, before.stdout);
  assert.equal(run('compare', current, '--since', previous).status, 0);
  await writeFile(path.join(site, 'index.html'), 'Changed output');
  await writeFile(current, run('snapshot', site).stdout);
  const changed = run('compare', current, '--since', previous);
  assert.equal(changed.status, 1);
  assert.deepEqual(JSON.parse(changed.stdout).changed, ['index.html']);
  assert.equal(run('snapshot', site, '--unknown').status, 1);
});
