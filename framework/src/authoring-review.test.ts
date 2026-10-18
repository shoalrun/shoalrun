import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { spawn, execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import { once } from 'node:events';
import { request } from 'node:http';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { compile } from './compiler.js';
import { authoringReview, authoringReviewMarkdown } from './authoring-review.js';
import { startAuthoringPreview } from './authoring-preview.js';
import { authoringValidationStatus, validateAuthoringChanges } from './authoring-validation.js';
import { collectSnapshotInputs, writeAuthoringBaseline } from './authoring-snapshot.js';

const execFile = promisify(execFileCallback);
const framework = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const page = (id: string, route: string, body = 'Review the procedure.') => `---\nid: ${id}\ntitle: Review procedure\nsummary: A reviewed procedure.\nslug: ${route}\naccess: { policy: draft }\n---\n\n${body}\n`;
async function fixture(t: TestContext) {
  const parent = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-review-test-'));
  t.after(() => rm(parent, { recursive: true, force: true }));
  const root = path.join(parent, 'docs'), config = path.join(root, 'docs.config.yaml');
  await cp(path.join(framework, 'example-configs/minimal'), root, { recursive: true });
  await writeFile(path.join(root, 'dirty.txt'), 'Earlier local edit.\n');
  const validate = (options: Parameters<typeof validateAuthoringChanges>[1]) => validateAuthoringChanges(config, { artifactsDirectory: path.join(parent, `validation-${Math.random().toString(16).slice(2)}`), ...options });
  return { root, parent, config, validate };
}

test('review attributes multi-file changes to the task baseline, includes every affected representation, and preserves earlier edits', async t => {
  const { root, parent, config, validate } = await fixture(t);
  const baselineFile = path.join(parent, 'baseline.json');
  await writeAuthoringBaseline(config, baselineFile);
  await writeFile(path.join(root, 'content/first.mdx'), page('guide.first', '/first'));
  await writeFile(path.join(root, 'content/second.mdx'), page('guide.second', '/second'));
  const before = (await collectSnapshotInputs(root)).inputs;
  const report = await validate({ baselineFile });
  const review = await authoringReview(report.artifacts.report);
  assert.equal(review.status, 'ok');
  assert.equal(review.snapshotId, report.snapshotId);
  assert.deepEqual(review.pages.map(page => page.id).sort(), ['guide.first', 'guide.second']);
  assert.equal(review.baseline.digest, report.baseline.digest);
  assert.ok(review.changed.every(change => change.operation === 'created'));
  assert.ok(!review.changed.some(change => change.file === 'dirty.txt'));
  assert.equal(review.diff.available, false);
  assert.match(review.diff.explanation, /digests, not earlier file contents/);
  assert.ok(review.dependencies.some(dependency => dependency.file === 'docs.config.yaml' && dependency.digest));
  for (const page of review.pages) {
    assert.match(await readFile(page.htmlArtifact, 'utf8'), /Review the procedure/);
    assert.match(await readFile(page.markdownArtifact, 'utf8'), /Review the procedure/);
  }
  assert.equal(review.reviewers.status, 'not-run');
  assert.deepEqual(review.dispositions, []);
  assert.match(authoringReviewMarkdown(review), /Task scope[\s\S]*Affected pages[\s\S]*Checks[\s\S]*Findings/);
  assert.deepEqual((await collectSnapshotInputs(root)).inputs, before);
  const preview = await startAuthoringPreview(report.artifacts.report, { port: 0 });
  t.after(preview.close);
  assert.equal(preview.pages.length, 2);
  for (const route of preview.pages) {
    const html = await fetch(route.htmlUrl); assert.equal(html.status, 200);
    assert.equal(html.headers.get('x-shoalrun-snapshot'), report.snapshotId);
    assert.match(await html.text(), /Review this snapshot/);
    assert.match(await (await fetch(route.markdownUrl)).text(), /Review the procedure/);
  }
  const html = await (await fetch(preview.reviewUrl)).text();
  assert.match(html, /guide.first/); assert.match(html, /guide.second/); assert.match(html, /Task scope/);
  await preview.close();
  await assert.rejects(stat(preview.directory), { code: 'ENOENT' });
  assert.ok(await stat(report.artifacts.report));
  assert.deepEqual((await collectSnapshotInputs(root)).inputs, before);
});

test('source edits make the old preview visibly stale; native revision and revalidation produce a fresh separate preview', async t => {
  const { root, validate } = await fixture(t);
  await writeFile(path.join(root, 'content/draft.mdx'), page('guide.draft', '/draft', 'Original captured text.'));
  const first = await validate({ files: ['content/draft.mdx'] });
  const preview = await startAuthoringPreview(first.artifacts.report, { port: 0 }); t.after(preview.close);
  await writeFile(path.join(root, 'content/draft.mdx'), page('guide.draft', '/draft', 'Revised working-tree text.'));
  const status = await (await fetch(preview.statusUrl)).json() as any;
  assert.equal(status.status, 'stale'); assert.equal(status.freshness.changed.source, true);
  const oldHtml = await (await fetch(preview.pages[0].htmlUrl)).text();
  assert.match(oldHtml, /Original captured text/); assert.doesNotMatch(oldHtml, /Revised working-tree text/); assert.match(oldHtml, /stale; this preview does not verify current edits/);
  const second = await validate({ files: ['content/draft.mdx'] });
  assert.notEqual(second.snapshotId, first.snapshotId);
  const fresh = await startAuthoringPreview(second.artifacts.report, { port: 0 }); t.after(fresh.close);
  assert.equal((await fresh.review()).status, 'ok');
  assert.match(await (await fetch(fresh.pages[0].htmlUrl)).text(), /Revised working-tree text/);
  assert.match(await (await fetch(preview.pages[0].markdownUrl)).text(), /Original captured text/);
});

test('failed component review explains its source and repair; a repaired native edit obtains a matching preview', async t => {
  const { root, validate } = await fixture(t);
  const file = 'content/bad.mdx';
  await writeFile(path.join(root, file), page('guide.bad', '/bad', '<Step title="Read">Read the source.</Step>'));
  const failed = await validate({ files: [file] });
  const review = await authoringReview(failed.artifacts.report);
  assert.equal(review.status, 'failed');
  assert.ok(review.coverage.notRendered.includes(file));
  const finding = review.findings.find(finding => finding.code === 'validation.component')!;
  assert.equal(finding.file, file); assert.equal(finding.location?.line, 9); assert.equal(finding.reference, 'guide.component.steps');
  assert.match(authoringReviewMarkdown(review), /content\/bad.mdx:9:1/);
  await assert.rejects(startAuthoringPreview(failed.artifacts.report, { port: 0 }), /missing or changed|ENOENT/);
  await writeFile(path.join(root, file), page('guide.bad', '/bad', '<Steps>\n<Step title="Read">Read the source.</Step>\n<Step title="Inspect">Inspect the result.</Step>\n</Steps>'));
  const repaired = await validate({ files: [file] });
  assert.equal(repaired.status, 'ok', JSON.stringify(repaired.findings));
  const preview = await startAuthoringPreview(repaired.artifacts.report, { port: 0 }); t.after(preview.close);
  assert.equal((await preview.review()).status, 'ok');
  assert.match(await (await fetch(preview.pages[0].htmlUrl)).text(), /Read the source/);
});

test('skipped checks and failed shell checks remain visible; serving a built snapshot does not imply a passing result', async t => {
  const { config, validate } = await fixture(t);
  await writeFile(config, (await readFile(config, 'utf8')) + '\naudit:\n  tests:\n    - id: review-needed\n      run: [node, -e, "process.exit(1)"]\n');
  const skipped = await validate({ ids: ['guide.install'] });
  const preview = await startAuthoringPreview(skipped.artifacts.report, { port: 0 }); t.after(preview.close);
  const review = await preview.review();
  assert.equal(review.status, 'incomplete');
  assert.ok(review.checks.some(check => check.status === 'skipped'));
  assert.match(await (await fetch(preview.reviewUrl)).text(), /skipped/);
  const failed = await validate({ ids: ['guide.install'], runConfiguredChecks: true });
  const failedPreview = await startAuthoringPreview(failed.artifacts.report, { port: 0 }); t.after(failedPreview.close);
  assert.equal((await failedPreview.review()).status, 'failed');
  assert.match(await (await fetch(failedPreview.pages[0].htmlUrl)).text(), /failed/);
});

test('base paths and multiple publication routes retain matching HTML, Markdown, and content negotiation', async t => {
  const { config, root, validate } = await fixture(t);
  await writeFile(config, (await readFile(config, 'utf8')).replace('  title: Acme handbook', '  title: Acme handbook\n  basePath: /manual').replace('    current: { pathPrefix: "" }', '    current: { pathPrefix: "" }\n    next: { pathPrefix: /next }').replace('    - { channel: production, version: current }', '    - { channel: production, version: current }\n    - { channel: production, version: next }'));
  await writeFile(path.join(root, 'content/both.mdx'), page('guide.both', '/both').replace('access: { policy: draft }', 'access: { policy: draft }\npublications:\n  - { channel: production, version: current }\n  - { channel: production, version: next }'));
  const report = await validate({ files: ['content/both.mdx'] });
  assert.equal(report.status, 'ok', JSON.stringify(report.findings));
  const preview = await startAuthoringPreview(report.artifacts.report, { port: 0 }); t.after(preview.close);
  assert.deepEqual(preview.pages.map(page => page.route).sort(), ['/manual/both', '/manual/next/both']);
  for (const page of preview.pages) {
    assert.equal((await fetch(page.htmlUrl)).status, 200);
    assert.equal((await fetch(page.markdownUrl)).status, 200);
    const negotiated = await fetch(page.htmlUrl, { headers: { Accept: 'text/markdown' } });
    assert.match(negotiated.headers.get('content-type')!, /text\/markdown/);
    assert.doesNotMatch(await negotiated.text(), /shoalrun-preview-status/);
  }
  assert.equal((await fetch(preview.pages[0].htmlUrl, { method: 'HEAD' })).status, 200);
  assert.equal((await fetch(preview.origin + '/', { method: 'POST' })).status, 405);
  const rejectedHost = await new Promise<number | undefined>((resolve, reject) => {
    const req = request(preview.origin, { headers: { Host: 'attacker.example' } }, response => { response.resume(); resolve(response.statusCode); });
    req.on('error', reject); req.end();
  });
  assert.equal(rejectedHost, 421);
});

test('artifact/report tampering never switches content; startup rejects modified sites and active previews fail visibly', async t => {
  const { validate } = await fixture(t);
  const report = await validate({ ids: ['guide.install'] });
  const preview = await startAuthoringPreview(report.artifacts.report, { port: 0 }); t.after(preview.close);
  const raw = await readFile(report.artifacts.report);
  await writeFile(report.artifacts.report, '{}');
  const status = await (await fetch(preview.statusUrl)).json() as any;
  assert.equal(status.snapshotId, report.snapshotId); assert.equal(status.freshness.reportChanged, true); assert.equal(status.status, 'stale');
  await writeFile(report.artifacts.report, raw);
  await writeFile(path.join(report.artifacts.site, 'install/index.html'), 'Unvalidated replacement.');
  assert.equal((await fetch(preview.pages[0].htmlUrl)).status, 409);
  assert.equal((await preview.review()).status, 'stale');
  await assert.rejects(startAuthoringPreview(report.artifacts.report, { port: 0 }), /missing or changed/);
  await preview.close();
  await rm(report.artifacts.directory, { recursive: true, force: true });
  assert.equal((await preview.review()).status, 'stale');
});

test('symlinks, unsafe ports, route traversal, and occupied ports are rejected without source changes', async t => {
  const { root, parent, validate } = await fixture(t);
  const report = await validate({ ids: ['guide.install'] });
  const before = (await collectSnapshotInputs(root)).inputs;
  for (const port of [-1, 65536, 1.5]) await assert.rejects(startAuthoringPreview(report.artifacts.report, { port }), /port/);
  const preview = await startAuthoringPreview(report.artifacts.report, { port: 0 }); t.after(preview.close);
  const port = Number(new URL(preview.origin).port);
  await assert.rejects(startAuthoringPreview(report.artifacts.report, { port }), /EADDRINUSE/);
  await symlink(path.join(parent, 'outside'), path.join(report.artifacts.site, 'escape'));
  await assert.rejects(startAuthoringPreview(report.artifacts.report, { port: 0 }), /regular files/);
  await rm(path.join(report.artifacts.site, 'escape'));
  const bad = { ...report, coverage: { ...report.coverage, rendered: [{ ...report.coverage.rendered.find(page => page.id === 'guide.install'), route: '/../outside' }] } };
  await writeFile(path.join(parent, 'bad-report.json'), JSON.stringify(bad));
  await assert.rejects(authoringReview(path.join(parent, 'bad-report.json')), /Invalid review artifact route/);
  assert.deepEqual((await collectSnapshotInputs(root)).inputs, before);
});

test('public CLI emits review formats, rejects options, and shuts down the foreground preview on SIGTERM', async t => {
  const { validate } = await fixture(t);
  const report = await validate({ ids: ['guide.install'] });
  const cli = path.join(framework, 'dist/cli.js');
  const json = await execFile(process.execPath, [cli, 'docs', 'review', report.artifacts.report]);
  assert.equal(JSON.parse(json.stdout).kind, 'shoalrun-authoring-review');
  const markdown = await execFile(process.execPath, [cli, 'docs', 'review', report.artifacts.report, '--format', 'markdown']);
  assert.match(markdown.stdout, /# Authoring review/);
  for (const args of [['review', report.artifacts.report, '--format', 'html'], ['preview', report.artifacts.report, '--port', 'invalid'], ['preview', report.artifacts.report, '--host', '0.0.0.0']]) {
    await assert.rejects(execFile(process.execPath, [cli, 'docs', ...args]), (error: any) => JSON.parse(error.stdout).error.code === 'invalid_input');
  }
  const child = spawn(process.execPath, [cli, 'docs', 'preview', report.artifacts.report, '--port', '0'], { stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(() => { child.kill('SIGKILL'); });
  let stdout = '';
  const ready = await new Promise<any>((resolve, reject) => {
    const timeout = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('Preview startup timed out')); }, 15000);
    child.stdout.on('data', chunk => { stdout += chunk.toString(); if (stdout.includes('\n')) { clearTimeout(timeout); resolve(JSON.parse(stdout.split('\n')[0])); } });
    child.once('error', error => { clearTimeout(timeout); reject(error); });
    child.once('exit', () => { clearTimeout(timeout); if (!stdout.includes('\n')) reject(new Error('Preview exited before startup')); });
  });
  assert.equal(ready.status, 'serving');
  assert.equal((await fetch(ready.reviewUrl)).status, 200);
  const exited = once(child, 'exit'); child.kill('SIGTERM');
  assert.equal((await exited)[0], 0);
  assert.match(stdout, /"status":"stopped"/);
  await assert.rejects(stat(ready.directory), { code: 'ENOENT' });
  assert.ok(await stat(report.artifacts.report));
  assert.equal((await authoringValidationStatus(report.artifacts.report)).current, true);
});

test('review HTML escapes project check output and private serving-copy changes invalidate the preview', async t => {
  const { config, validate } = await fixture(t);
  await writeFile(config, (await readFile(config, 'utf8')) + '\naudit:\n  tests:\n    - id: unsafe-text\n      run: [node, -e, \'console.error("<script>alert(1)</script>"); process.exit(1)\']\n');
  const report = await validate({ ids: ['guide.install'], runConfiguredChecks: true });
  assert.equal(report.status, 'failed');
  const preview = await startAuthoringPreview(report.artifacts.report, { port: 0 }); t.after(preview.close);
  const html = await (await fetch(preview.reviewUrl)).text();
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
  const copy = path.join(preview.directory, 'site/install/index.html');
  await rm(copy); await writeFile(copy, 'Changed serving copy.');
  assert.equal((await fetch(preview.pages[0].htmlUrl)).status, 409);
  const status = await (await fetch(preview.statusUrl)).json() as any;
  assert.equal(status.status, 'stale'); assert.equal(status.freshness.changed.artifacts, true);
  assert.match(status.nextAction, /private preview copy/);
  await preview.close();
  await assert.rejects(stat(preview.directory), { code: 'ENOENT' });
});

test('dependency changes expose all generated API operation routes and their Markdown twins', async t => {
  const { root, parent, config, validate } = await fixture(t);
  await writeFile(path.join(root, 'api.yaml'), 'openapi: 3.0.3\ninfo: { title: Review API, version: "1" }\npaths:\n  /first:\n    get:\n      operationId: first\n      summary: First operation\n      responses:\n        "200": { description: Success }\n  /second:\n    get:\n      operationId: second\n      summary: Second operation\n      responses:\n        "200": { description: Success }\n');
  await writeFile(config, (await readFile(config, 'utf8')) + '\napis:\n  sample:\n    source: { kind: file, path: ./api.yaml, publish: false }\n    generateReferences: { pathPrefix: /reference }\n');
  // Pin the canonical review digest for these isolated fixture operations.
  // Preview must retain the existing API publication gate.
  const candidate = await compile(config, path.join(parent, 'api-review'), {}, { apiReview: 'report' });
  await writeFile(config, (await readFile(config, 'utf8')) + `    publicReview: { digest: ${candidate.apiPublicationReview[0].digest} }\n`);
  const report = await validate({ files: ['api.yaml'] });
  assert.equal(report.status, 'ok', JSON.stringify(report.findings));
  const review = await authoringReview(report.artifacts.report);
  assert.equal(review.pageSelection, 'complete-rendered-project');
  const generated = review.pages.filter(page => page.origin === 'generated');
  assert.equal(generated.length, 2);
  assert.ok(generated.every(page => page.file === 'api.yaml'));
  const preview = await startAuthoringPreview(report.artifacts.report, { port: 0 }); t.after(preview.close);
  for (const page of preview.pages.filter(page => page.origin === 'generated')) {
    assert.equal((await fetch(page.htmlUrl)).status, 200);
    assert.equal((await fetch(page.markdownUrl)).status, 200);
  }
});
