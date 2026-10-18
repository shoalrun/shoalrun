import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import { authoringValidationStatus, validateAuthoringChanges, validateAuthoringChangesWithHooks } from './authoring-validation.js';
import { compile } from './compiler.js';
import { captureAuthoringBaseline, collectSnapshotInputs, writeAuthoringBaseline } from './authoring-snapshot.js';

const execFile = promisify(execFileCallback);
const framework = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
async function fixture(t: TestContext) {
  const parent = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-snapshot-fixture-'));
  t.after(() => rm(parent, { recursive: true, force: true }));
  const root = path.join(parent, 'docs');
  await cp(path.join(framework, 'example-configs/minimal'), root, { recursive: true });
  await rm(path.join(root, '.shoalrun'), { recursive: true, force: true });
  await writeFile(path.join(root, 'dirty.txt'), 'Earlier author edits must survive.\n');
  const config = path.join(root, 'docs.config.yaml');
  const validate = async (options: Parameters<typeof validateAuthoringChanges>[1]) => {
    const report = await validateAuthoringChanges(config, { artifactsDirectory: path.join(parent, `artifacts-${Math.random().toString(16).slice(2)}`), ...options });
    return report;
  };
  return { parent, root, config, validate };
}
const newPage = (id = 'guide.new', slug = '/new', body = '<Steps>\n<Step title="Prepare">Read the source.</Step>\n<Step title="Inspect">Inspect both representations.</Step>\n</Steps>') => `---\nid: ${id}\ntitle: New procedure\nsummary: A reviewed procedure.\nslug: ${slug}\naccess: { policy: draft }\n---\n\n${body}\n`;

test('a changed untracked draft renders HTML/Markdown in isolation and preserves all working-tree bytes', async t => {
  const { root, validate } = await fixture(t);
  await writeFile(path.join(root, 'content/new.mdx'), newPage());
  const before = (await collectSnapshotInputs(root)).inputs;
  const report = await validate({ files: ['content/new.mdx'] });
  assert.equal(report.status, 'ok', JSON.stringify(report.findings));
  assert.deepEqual(report.coverage.notRendered, []);
  assert.ok(report.coverage.rendered.some(doc => doc.id === 'guide.new' && doc.route === '/new'));
  assert.match(await readFile(path.join(report.artifacts.site, 'new/index.html'), 'utf8'), /<ol[^>]*[\s\S]*Prepare/);
  assert.match(await readFile(path.join(report.artifacts.site, 'new.md'), 'utf8'), /1\. ## Prepare/);
  assert.match(await readFile(path.join(report.artifacts.project, 'content/new.mdx'), 'utf8'), /policy: draft/);
  assert.deepEqual((await collectSnapshotInputs(root)).inputs, before);
  assert.equal((await authoringValidationStatus(report.artifacts.report)).current, true);
  await assert.rejects(stat(path.join(root, '.shoalrun')), { code: 'ENOENT' });
});

test('snapshot compilation resolves freshness without writing history, and still rejects check mutations', async t => {
  const { root, config, validate } = await fixture(t);
  await writeFile(config, (await readFile(config, 'utf8')).replace(/^site:$/m, 'site:\n  freshness: { history: history.json }'));
  await compile(config, path.join(root, 'dist'));
  const history = await readFile(path.join(root, 'history.json'), 'utf8');
  await writeFile(path.join(root, 'content/welcome.mdx'), (await readFile(path.join(root, 'content/welcome.mdx'), 'utf8')) + '\nA revised welcome.\n');
  let report = await validate({ files: ['content/welcome.mdx'] });
  assert.equal(report.status, 'ok', JSON.stringify(report.findings));
  assert.equal(await readFile(path.join(root, 'history.json'), 'utf8'), history);
  assert.equal(await readFile(path.join(report.artifacts.project, 'history.json'), 'utf8'), history);
  assert.equal((await authoringValidationStatus(report.artifacts.report)).current, true);
  await writeFile(config, (await readFile(config, 'utf8')) + '\naudit:\n  tests:\n    - id: mutate-history\n      run: [node, mutate.cjs]\n');
  await writeFile(path.join(root, 'mutate.cjs'), 'require("node:fs").writeFileSync("history.json", "{}");');
  report = await validate({ files: ['content/welcome.mdx'], runConfiguredChecks: true });
  assert.equal(report.status, 'failed');
  assert.ok(report.findings.some(item => item.code === 'validation.snapshot-modified'));
  assert.equal(await readFile(path.join(root, 'history.json'), 'utf8'), history);
});

test('declared check inputs capture sibling files/directories and track their freshness', async t => {
  const { root, parent, config, validate } = await fixture(t);
  await mkdir(path.join(parent, 'rules'));
  await writeFile(path.join(parent, 'rules/rule.txt'), 'expected');
  await writeFile(path.join(parent, 'check-config.txt'), 'expected');
  await writeFile(config, (await readFile(config, 'utf8')) + '\naudit:\n  tests:\n    - id: sibling-check\n      run: [node, check.cjs]\n      inputs: [../check-config.txt, ../rules]\n');
  await writeFile(path.join(root, 'check.cjs'), 'const fs = require("node:fs"); const {createRequire} = require("node:module"); const path = require("node:path"); const yaml = createRequire(path.resolve("../missing-package/package.json"))("yaml"); if (yaml.parse("ok: true").ok !== true || fs.readFileSync("../check-config.txt", "utf8") !== "expected" || fs.readFileSync("../rules/rule.txt", "utf8") !== "expected") process.exit(2);');
  const report = await validate({ files: ['content/welcome.mdx'], runConfiguredChecks: true });
  assert.equal(report.status, 'ok', JSON.stringify(report.findings));
  assert.ok(report.inputs.some(item => item.file === '../rules/rule.txt'));
  assert.ok(report.inputs.some(item => item.file === '../check-config.txt'));
  assert.equal((await authoringValidationStatus(report.artifacts.report)).current, true);
  await writeFile(path.join(parent, 'rules/new-rule.txt'), 'new');
  assert.equal((await authoringValidationStatus(report.artifacts.report)).status, 'stale');
});

test('declared check inputs reject escapes, secrets, dependencies, symlinks and missing files', async t => {
  const { root, parent, config, validate } = await fixture(t);
  const base = await readFile(config, 'utf8');
  await writeFile(path.join(parent, 'target.txt'), 'target');
  await symlink(path.join(parent, 'target.txt'), path.join(parent, 'linked.txt'));
  for (const input of ['../../outside.txt', '../.env', '../node_modules', '../linked.txt', '../absent.txt']) {
    await writeFile(config, base + `\naudit:\n  tests:\n    - id: bounded\n      run: [node, -e, 'process.exit(0)']\n      inputs: [${JSON.stringify(input)}]\n`);
    await assert.rejects(validate({ files: ['content/welcome.mdx'], runConfiguredChecks: true }), /escapes|excluded|symlinks|missing/);
  }
});

test('a missing Node check dependency is unavailable rather than a passing or failed assertion', async t => {
  const { root, config, validate } = await fixture(t);
  await writeFile(config, (await readFile(config, 'utf8')) + '\naudit:\n  tests:\n    - id: unavailable-module\n      run: [node, check.cjs]\n');
  await writeFile(path.join(root, 'check.cjs'), 'require("shoalrun-nonexistent-fixture-dependency");');
  const report = await validate({ files: ['content/welcome.mdx'], runConfiguredChecks: true });
  assert.equal(report.status, 'unavailable', JSON.stringify(report.findings));
  assert.equal(report.checks.find(item => item.id === 'test:unavailable-module')?.status, 'unavailable');
  assert.ok(report.findings.some(item => item.code === 'validation.project-check' && item.severity === 'review-needed'));
});

test('task baselines distinguish earlier dirty edits and discover creations, deletions and configuration dependencies', async t => {
  const { root, parent, config, validate } = await fixture(t);
  const baselineFile = path.join(parent, 'baseline.json');
  const baseline = await writeAuthoringBaseline(config, baselineFile);
  assert.ok(baseline.digest);
  await writeFile(path.join(root, 'content/new.mdx'), newPage());
  await rm(path.join(root, 'content/install.mdx'));
  await writeFile(path.join(root, 'docs.config.yaml'), (await readFile(config, 'utf8')).replace(/  - id: setup[\s\S]*/, ''));
  await writeFile(path.join(root, 'content/welcome.mdx'), (await readFile(path.join(root, 'content/welcome.mdx'), 'utf8')).replace('[installation](doc:guide.install)', '[the procedure](doc:guide.new)'));
  const report = await validate({ baselineFile });
  assert.equal(report.status, 'ok', JSON.stringify(report.findings));
  assert.equal(report.baseline.kind, 'task-baseline');
  assert.ok(report.changed.some(item => item.file === 'content/new.mdx' && item.operation === 'created'));
  assert.ok(report.changed.some(item => item.file === 'content/install.mdx' && item.operation === 'deleted' && item.beforeDigest));
  assert.ok(report.changed.some(item => item.file === 'docs.config.yaml' && item.operation === 'modified'));
  assert.ok(!report.changed.some(item => item.file === 'dirty.txt'));
  assert.deepEqual(report.coverage.affected, report.coverage.authored);
  assert.ok(report.dependencies.includes('docs.config.yaml'));
  assert.equal(await readFile(path.join(root, 'dirty.txt'), 'utf8'), 'Earlier author edits must survive.\n');
  assert.equal((await authoringValidationStatus(report.artifacts.report)).status, 'ok');
});

test('located component findings distinguish authored Steps from harness planning and preserve draft source', async t => {
  const { root, validate } = await fixture(t);
  const content = newPage('guide.bad', '/bad', '<Step title="Prepare">Read the source.</Step>');
  await writeFile(path.join(root, 'content/bad.mdx'), content);
  const before = (await collectSnapshotInputs(root)).inputs;
  const report = await validate({ files: ['content/bad.mdx'] });
  assert.equal(report.status, 'failed');
  const problem = report.findings.find(item => item.code === 'validation.component')!;
  assert.equal(problem.file, 'content/bad.mdx');
  assert.equal(problem.location?.line, 9);
  assert.equal(problem.reference, 'guide.component.steps');
  assert.match(problem.explanation, /harness task-plan steps are separate/);
  assert.match(problem.nextAction, /<Steps>/);
  assert.deepEqual((await collectSnapshotInputs(root)).inputs, before);
  assert.ok(report.coverage.notRendered.includes('content/bad.mdx'));
});

test('invalid metadata, IDs, routes and route collisions fail without source writes', async t => {
  const { root, validate } = await fixture(t);
  for (const [name, content, code] of [
    ['metadata', newPage().replace('summary: A reviewed procedure.', 'updated: 2026-99-01\nsummary: A reviewed procedure.'), 'validation.metadata'],
    ['id', newPage('bad id'), 'validation.identity'],
    ['route', newPage('guide.route', '/api/reserved'), 'validation.identity'],
    ['collision', newPage('guide.collision', '/install'), 'validation.identity'],
  ]) {
    const file = `content/${name}.mdx`;
    await writeFile(path.join(root, file), content);
    const before = (await collectSnapshotInputs(root)).inputs;
    const report = await validate({ files: [file] });
    assert.equal(report.status, 'failed', name);
    assert.ok(report.findings.some(item => item.code === code), JSON.stringify(report.findings));
    assert.deepEqual((await collectSnapshotInputs(root)).inputs, before);
    await rm(path.join(root, file));
  }
});

test('deletion produces a located owning navigation or relationship diagnostic', async t => {
  const { root, parent, config, validate } = await fixture(t);
  await mkdir(path.join(root, 'config'));
  await writeFile(path.join(root, 'config/nav.yaml'), '- { id: welcome, doc: guide.welcome }\n');
  await writeFile(path.join(root, 'config/relationships.yaml'), '- { id: setup, from: guide.welcome, to: guide.install, type: prerequisite, reason: Install first. }\n');
  await writeFile(config, (await readFile(config, 'utf8')).replace(/navigation:[\s\S]*/, 'navigation: { $include: config/nav.yaml }\nrelationships: { $include: config/relationships.yaml }\n'));
  const baselineFile = path.join(parent, 'baseline.json');
  await writeAuthoringBaseline(config, baselineFile);
  await rm(path.join(root, 'content/install.mdx'));
  let report = await validate({ baselineFile });
  assert.equal(report.status, 'failed');
  const relationship = report.findings.find(item => item.code === 'validation.relationship')!;
  assert.equal(relationship.file, 'config/relationships.yaml');
  assert.equal(relationship.location?.line, 1);
  await writeFile(path.join(root, 'config/relationships.yaml'), '[]\n');
  await writeFile(path.join(root, 'config/nav.yaml'), '- { id: welcome, doc: guide.welcome }\n- { id: install, doc: guide.install }\n');
  report = await validate({ baselineFile });
  const navigation = report.findings.find(item => item.code === 'validation.navigation')!;
  assert.equal(navigation.file, 'config/nav.yaml');
  assert.equal(navigation.location?.line, 2);
});

test('broken document and rendered local links are errors in changed drafts', async t => {
  const { root, validate } = await fixture(t);
  await writeFile(path.join(root, 'content/new.mdx'), newPage('guide.new', '/new', '[Missing](doc:guide.deleted)'));
  let report = await validate({ files: ['content/new.mdx'] });
  assert.equal(report.status, 'failed');
  const docLink = report.findings.find(item => item.code === 'validation.link')!;
  assert.equal(docLink.file, 'content/new.mdx');
  await writeFile(path.join(root, 'content/new.mdx'), newPage('guide.new', '/new', '[Missing](/absent-route)'));
  report = await validate({ files: ['content/new.mdx'] });
  assert.equal(report.status, 'failed');
  assert.ok(report.checks.some(item => item.id === 'representations-and-links' && item.status === 'failed'));
  assert.ok(report.findings.some(item => item.code === 'validation.link' && item.file === 'content/new.mdx'));
});

test('configured changes render affected drafts even when access is enforced; metadata remains authored', async t => {
  const { root, config, validate } = await fixture(t);
  await writeFile(config, await readFile(config, 'utf8') + '\nfrontmatter:\n  defaults: { type: guide, channel: production, version: current }\n  enforced: { access: { policy: draft } }\n');
  // YAML duplicate keys are invalid: replace the original section rather than
  // weakening the parser to permit them.
  await writeFile(config, (await readFile(config, 'utf8')).replace(/frontmatter:\n[\s\S]*?\nnavigation:/, 'navigation:'));
  await writeFile(path.join(root, 'content/new.mdx'), newPage());
  const before = (await collectSnapshotInputs(root)).inputs;
  const report = await validate({ files: ['docs.config.yaml', 'content/new.mdx'] });
  assert.equal(report.status, 'ok', JSON.stringify(report.findings));
  assert.equal(report.coverage.rendered.length, 3);
  assert.deepEqual((await collectSnapshotInputs(root)).inputs, before);
  assert.match(await readFile(path.join(report.artifacts.project, 'docs.config.yaml'), 'utf8'), /enforced: \{ access: \{ policy: draft/);
});

test('a known but disabled publication is explicitly not rendered, never passed', async t => {
  const { root, config, validate } = await fixture(t);
  await writeFile(config, (await readFile(config, 'utf8')).replace('production: { pathPrefix: "" }', 'production: { pathPrefix: "" }\n    staging: { pathPrefix: /staging }'));
  await writeFile(path.join(root, 'content/new.mdx'), newPage().replace('title: New procedure', 'channel: staging\ntitle: New procedure'));
  const report = await validate({ files: ['content/new.mdx'] });
  assert.equal(report.status, 'failed');
  assert.ok(report.findings.some(item => item.code === 'validation.excluded-page' && item.file === 'content/new.mdx'));
});

test('snapshot copies declared sibling dependencies and exposes their freshness', async t => {
  const { root, parent, validate } = await fixture(t);
  await mkdir(path.join(parent, '.git'));
  await writeFile(path.join(parent, 'shared.js'), 'export const shared = true;\n');
  const walkthrough = '<Walkthrough title="Shared">\n<Step title="Read" file="../../shared.js" highlight="1">\n\nRead it.\n\n</Step>\n<Step title="Use" file="../../shared.js" highlight="1">\n\nUse it.\n\n</Step>\n</Walkthrough>';
  await writeFile(path.join(root, 'content/new.mdx'), newPage('guide.new', '/new', walkthrough));
  const report = await validate({ files: ['content/new.mdx'] });
  assert.equal(report.status, 'ok', JSON.stringify(report.findings));
  assert.ok(report.inputs.some(item => item.file === '../shared.js'));
  assert.ok(report.dependencies.includes('../shared.js'));
  await writeFile(path.join(parent, 'shared.js'), 'export const shared = false;\n');
  assert.equal((await authoringValidationStatus(report.artifacts.report)).status, 'stale');
});

test('snapshot captures a parent Walkthrough file for rendering and freshness', async t => {
  const { root, parent, validate } = await fixture(t);
  await mkdir(path.join(parent, '.git'));
  await writeFile(path.join(parent, 'shared.js'), 'export const shared = true;\n');
  const walkthrough = '<Walkthrough title="Shared" layout="spotlight" file="../../shared.js">\n<Step title="Read" highlight="1">\n\nRead it.\n\n</Step>\n<Step title="Use" highlight="1">\n\nUse it.\n\n</Step>\n</Walkthrough>';
  await writeFile(path.join(root, 'content/new.mdx'), newPage('guide.new', '/new', walkthrough));
  const before = (await collectSnapshotInputs(root)).inputs;
  const report = await validate({ files: ['content/new.mdx'] });
  assert.equal(report.status, 'ok', JSON.stringify(report.findings));
  assert.ok(report.inputs.some(item => item.file === '../shared.js'));
  assert.ok(report.dependencies.includes('../shared.js'));
  assert.match(await readFile(path.join(report.artifacts.site, 'new/index.html'), 'utf8'), /Read it/);
  assert.match(await readFile(path.join(report.artifacts.site, 'new.md'), 'utf8'), /export const shared = true/);
  assert.deepEqual((await collectSnapshotInputs(root)).inputs, before);
  assert.equal((await authoringValidationStatus(report.artifacts.report)).current, true);
  await writeFile(path.join(parent, 'shared.js'), 'export const shared = false;\n');
  assert.equal((await authoringValidationStatus(report.artifacts.report)).status, 'stale');
});

test('capture races and concurrent validation edits produce stale reports, preserving the newer author contents', async t => {
  const { root, parent, config } = await fixture(t);
  for (const phase of ['afterCapture', 'afterChecks'] as const) {
    const newer = `Author edit during ${phase}\n`;
    const report = await validateAuthoringChangesWithHooks(config, { ids: ['guide.welcome'], artifactsDirectory: path.join(parent, phase) }, { [phase]: () => writeFile(path.join(root, 'dirty.txt'), newer) });
    assert.equal(report.status, 'stale');
    assert.equal(report.freshness.current, false);
    assert.ok(report.findings.some(item => item.code === 'validation.stale-input'));
    assert.equal(await readFile(path.join(root, 'dirty.txt'), 'utf8'), newer);
    if (phase === 'afterCapture') assert.equal(report.checks.length, 0);
  }
});

test('freshness detects untracked additions, deletions, changed artifacts and changed task baselines', async t => {
  const { root, parent, config, validate } = await fixture(t);
  const baselineFile = path.join(parent, 'baseline.json');
  await writeAuthoringBaseline(config, baselineFile);
  const report = await validate({ baselineFile });
  assert.equal(report.status, 'ok');
  await writeFile(path.join(root, 'new-untracked.txt'), 'New source');
  assert.equal((await authoringValidationStatus(report.artifacts.report)).changed.source, true);
  await rm(path.join(root, 'new-untracked.txt'));
  await writeFile(path.join(report.artifacts.site, 'index.md'), 'Changed artifact');
  assert.equal((await authoringValidationStatus(report.artifacts.report)).changed.artifacts, true);
  await writeFile(baselineFile, '{}');
  assert.equal((await authoringValidationStatus(report.artifacts.report)).changed.baseline, true);
  await rm(path.join(root, 'content/install.mdx'));
  assert.equal((await authoringValidationStatus(report.artifacts.report)).changed.source, true);
});

test('configured style/example commands are skipped by default and run only in the captured project', async t => {
  const { root, config, validate } = await fixture(t);
  await writeFile(config, await readFile(config, 'utf8') + '\naudit:\n  tests:\n    - id: source-check\n      run: [node, check.mjs]\n');
  await writeFile(path.join(root, 'check.mjs'), 'import { readFileSync } from "node:fs"; if (!process.env.SHOALRUN_VALIDATION_SITE || !readFileSync("content/welcome.mdx", "utf8").includes("Welcome")) process.exit(2);\n');
  let report = await validate({ files: ['content/welcome.mdx'] });
  assert.equal(report.status, 'incomplete');
  assert.ok(report.checks.some(item => item.id === 'test:source-check' && item.status === 'skipped'));
  report = await validate({ files: ['content/welcome.mdx'], runConfiguredChecks: true });
  assert.equal(report.status, 'ok', JSON.stringify(report.findings));
  assert.ok(report.checks.some(item => item.id === 'test:source-check' && item.status === 'passed'));
  await writeFile(path.join(root, 'check.mjs'), 'console.error("Planted example mismatch"); process.exit(1);\n');
  report = await validate({ files: ['content/welcome.mdx'], runConfiguredChecks: true });
  assert.equal(report.status, 'failed');
  assert.ok(report.findings.some(item => item.code === 'validation.project-check' && /Planted example mismatch/.test(item.explanation)));
  await writeFile(path.join(root, 'check.mjs'), 'import { writeFileSync } from "node:fs"; writeFileSync("dirty.txt", "Check rewrote captured source");\n');
  report = await validate({ files: ['content/welcome.mdx'], runConfiguredChecks: true });
  assert.equal(report.status, 'failed');
  assert.ok(report.findings.some(item => item.code === 'validation.snapshot-modified'));
  assert.equal(await readFile(path.join(root, 'dirty.txt'), 'utf8'), 'Earlier author edits must survive.\n');
});

test('missing validators and executable extensions are unavailable, with no implicit execution', async t => {
  const { root, config, validate } = await fixture(t);
  await writeFile(config, await readFile(config, 'utf8') + '\naudit:\n  tests:\n    - id: missing-tool\n      run: [shoalrun-fixture-validator-does-not-exist]\n');
  let report = await validate({ files: ['content/welcome.mdx'], runConfiguredChecks: true });
  assert.equal(report.status, 'unavailable');
  assert.ok(report.checks.some(item => item.id === 'test:missing-tool' && item.status === 'unavailable'));
  await writeFile(path.join(root, 'provider.mjs'), 'throw new Error("Must never execute");\n');
  await writeFile(config, await readFile(config, 'utf8') + '\nmetadata: { provider: { module: provider.mjs } }\n');
  report = await validate({ files: ['content/welcome.mdx'] });
  assert.equal(report.status, 'unavailable');
  assert.ok(report.findings.some(item => item.code === 'validation.extension-unavailable'));
});

test('unsafe inputs, artifact collisions and foreign baselines fail without touching source', async t => {
  const { root, parent, config, validate } = await fixture(t);
  await assert.rejects(validate({ files: ['../../escape'] }), /escapes/);
  await assert.rejects(validateAuthoringChanges(config, { files: ['content/welcome.mdx'], artifactsDirectory: root }), /Artifacts/);
  await assert.rejects(validate({ files: ['docs.config.yaml'], artifactsDirectory: path.join(root, 'content/output') }), /Artifacts/);
  const occupied = path.join(parent, 'occupied');
  await mkdir(occupied);
  await assert.rejects(validate({ files: ['docs.config.yaml'], artifactsDirectory: occupied }), { code: 'EEXIST' });
  const baseline = await captureAuthoringBaseline(config);
  await writeFile(path.join(parent, 'foreign.json'), JSON.stringify({ ...baseline, project: '/other-project' }));
  await assert.rejects(validate({ baselineFile: path.join(parent, 'foreign.json') }), /for this project/);
  await symlink(path.join(root, 'content/welcome.mdx'), path.join(root, 'content/symlink.mdx'));
  await assert.rejects(validate({ files: ['content/welcome.mdx'] }), /symlinks/);
  assert.equal(await readFile(path.join(root, 'dirty.txt'), 'utf8'), 'Earlier author edits must survive.\n');
});

test('public CLI baselines, working-tree validation and freshness work without provider credentials', async t => {
  const { root, parent } = await fixture(t);
  const cli = path.join(framework, 'dist/cli.js');
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/KEY|TOKEN|SECRET|PROVIDER/i.test(key)));
  const run = (args: string[]) => execFile(process.execPath, [cli, 'docs', ...args], { cwd: root, env });
  const baseline = path.join(parent, 'baseline.json'), artifacts = path.join(parent, 'cli-artifacts');
  assert.equal(JSON.parse((await run(['baseline', '--out', baseline])).stdout).status, 'ok');
  await writeFile(path.join(root, 'content/new.mdx'), newPage());
  const report = JSON.parse((await run(['validate', '--baseline', baseline, '--artifacts', artifacts, '--json'])).stdout);
  assert.equal(report.status, 'ok');
  assert.equal(JSON.parse((await run(['validation-status', report.artifacts.report])).stdout).current, true);
  await writeFile(path.join(root, 'dirty.txt'), 'New author edit');
  await assert.rejects(run(['validation-status', report.artifacts.report]), error => {
    assert.equal((error as any).code, 1);
    assert.equal(JSON.parse((error as any).stdout).status, 'stale');
    return true;
  });
  await assert.rejects(run(['validate']), error => {
    assert.equal(JSON.parse((error as any).stdout).error.code, 'invalid_input');
    return true;
  });
});

test('Mermaid syntax validates without a browser and never writes a cache in source', async t => {
  const { root, parent } = await fixture(t);
  const body = '<Diagram title="Procedure" summary="Read then inspect." engine="mermaid">\n\n```mermaid\nflowchart LR\nread --> inspect\n```\n\n</Diagram>';
  await writeFile(path.join(root, 'content/new.mdx'), newPage('guide.new', '/new', body));
  const before = (await collectSnapshotInputs(root)).inputs;
  const result = await execFile(process.execPath, [path.join(framework, 'dist/cli.js'), 'docs', 'validate', '--file', 'content/new.mdx', '--artifacts', path.join(parent, 'missing-browser')], { cwd: root, env: { ...process.env, PUPPETEER_EXECUTABLE_PATH: path.join(parent, 'nonexistent-browser') } });
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, 'ok', JSON.stringify(report.findings));
  assert.ok(!report.coverage.notRendered.includes('content/new.mdx'));
  assert.deepEqual((await collectSnapshotInputs(root)).inputs, before);
  await assert.rejects(stat(path.join(root, '.shoalrun')), { code: 'ENOENT' });
});

test('pre-existing generated caches and credential/dependency locations remain excluded and byte-identical', async t => {
  const { root, validate } = await fixture(t);
  await mkdir(path.join(root, '.shoalrun'), { recursive: true });
  await mkdir(path.join(root, 'dist'), { recursive: true });
  await mkdir(path.join(root, 'node_modules'), { recursive: true });
  await mkdir(path.join(root, '.private-archives'), { recursive: true });
  await mkdir(path.join(root, '.private-evals'), { recursive: true });
  const excluded = ['.shoalrun/cache.txt', 'dist/index.md', 'node_modules/sentinel.txt', '.private-archives/old-agent.zip', '.private-evals/receipt.json', '.env'];
  for (const file of excluded) await writeFile(path.join(root, file), 'fixture sentinel, never captured\n');
  const report = await validate({ files: ['content/welcome.mdx'] });
  assert.equal(report.status, 'ok');
  for (const file of excluded) {
    assert.equal(await readFile(path.join(root, file), 'utf8'), 'fixture sentinel, never captured\n');
    assert.ok(!report.inputs.some(input => input.file === file));
    await assert.rejects(stat(path.join(report.artifacts.project, file)), { code: 'ENOENT' });
  }
  assert.ok(report.excluded.some(item => item.file === '.env'));
  assert.ok(report.excluded.some(item => item.file === '.shoalrun'));
});

test('a removed configuration dependency is not mislabeled as a deleted sibling file', async t => {
  const { root, parent, config, validate } = await fixture(t);
  await writeFile(path.join(parent, 'shared.yaml'), 'variables: { shared: Fixture }\n');
  await writeFile(config, 'extends: [../shared.yaml]\n' + await readFile(config, 'utf8'));
  const baselineFile = path.join(parent, 'baseline.json');
  await writeAuthoringBaseline(config, baselineFile);
  await writeFile(config, (await readFile(config, 'utf8')).replace('extends: [../shared.yaml]\n', ''));
  const report = await validate({ baselineFile });
  assert.equal(report.status, 'ok', JSON.stringify(report.findings));
  assert.ok(report.inputs.some(input => input.file === '../shared.yaml'));
  assert.ok(!report.changed.some(input => input.file === '../shared.yaml'));
  await writeFile(path.join(parent, 'shared.yaml'), 'variables: { shared: Changed }\n');
  assert.equal((await authoringValidationStatus(report.artifacts.report)).status, 'stale');
});
