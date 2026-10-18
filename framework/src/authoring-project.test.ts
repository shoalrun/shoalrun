import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { inspectAuthoringProject, readAuthoringSource } from './authoring-project.js';
import { documentationTokens, bundledDocumentation, getDocumentationPage, searchDocumentation } from './documentation-core.js';
import { parseProjectOptions } from './authoring-project-command.js';
import { builtinAuthoringTemplates } from './scaffold.js';

const execFile = promisify(execFileCallback);
const framework = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
async function fixture(t: TestContext) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-project-tools-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(path.join(framework, 'example-configs/minimal'), root, { recursive: true });
  return { root, config: path.join(root, 'docs.config.yaml') };
}

test('consumer discovery uses canonical defaults, actual config owners, aliases and draft/untracked pages', async t => {
  const { root, config } = await fixture(t);
  const before = await readFile(config, 'utf8');
  await writeFile(path.join(root, 'metadata.yaml'), 'defaults: { type: tutorial, access: { policy: draft }, language: fr }\nenforced: { type: how-to }\nfields:\n  owner: { type: string, required: true }\n');
  await writeFile(config, before.replace(/frontmatter:\n[\s\S]*?\nnavigation:/, 'frontmatter: { $include: metadata.yaml }\n\nnavigation:') + '\nauthoring:\n  directives: Update the release log only for released behavior.\n  guideFiles: [STYLE.md]\n  exemplarFiles: [content/install.mdx]\nsearch:\n  synonyms: [[bootstrap, installation]]\nrelationships:\n  - { id: first, from: guide.welcome, to: guide.install, type: prerequisite }\n');
  await writeFile(path.join(root, 'AGENTS.md'), 'Keep unreleased drafts out of the release log.\n');
  await writeFile(path.join(root, 'STYLE.md'), 'Prefer short procedures.\n');
  await writeFile(path.join(root, 'dirty.txt'), 'unrelated pre-existing edits\n');
  const baseline = await readFile(path.join(root, 'dirty.txt'));
  const all = await inspectAuthoringProject(config);
  assert.equal(all.schemaVersion, 1);
  assert.equal(all.summary.policyStatus, 'requires-interpretation');
  assert.equal(all.entries.length, 2);
  assert.equal(all.entries[0].type, 'how-to');
  assert.equal(all.entries[0].publication.language, 'fr');
  assert.equal(all.entries[0].access.policy, 'draft');
  const query = await inspectAuthoringProject(config, { query: 'bootstrap' });
  assert.equal(query.entries[0].id, 'guide.install');
  assert.deepEqual(query.entries[0].aliases, ['installation']);
  const settings = await inspectAuthoringProject(config, { section: 'configuration', limit: 100 });
  assert.equal(settings.entries.find(entry => entry.location === 'frontmatter.enforced.type')!.file, 'metadata.yaml');
  const navigation = await inspectAuthoringProject(config, { section: 'navigation', id: 'guide.install' });
  assert.equal(navigation.entries[0].id, 'install');
  const edges = await inspectAuthoringProject(config, { section: 'relationships', file: 'content/install.mdx' });
  assert.equal(edges.entries[0].from, 'guide.welcome');
  const guidance = await inspectAuthoringProject(config, { section: 'guidance' });
  assert.equal(guidance.entries.find(entry => entry.kind === 'directives')!.file, 'docs.config.yaml');
  assert.ok(guidance.entries.some(entry => entry.role === 'style' && entry.file === 'STYLE.md'));
  const policy = await readAuthoringSource(config, 'AGENTS.md');
  assert.equal(policy.role, 'policy');
  assert.match(policy.content, /unreleased drafts/);
  assert.equal(policy.digest, createHash('sha256').update(policy.content).digest('hex'));
  assert.deepEqual(await readFile(path.join(root, 'dirty.txt')), baseline);
  assert.equal(await readFile(config, 'utf8'), before.replace(/frontmatter:\n[\s\S]*?\nnavigation:/, 'frontmatter: { $include: metadata.yaml }\n\nnavigation:') + '\nauthoring:\n  directives: Update the release log only for released behavior.\n  guideFiles: [STYLE.md]\n  exemplarFiles: [content/install.mdx]\nsearch:\n  synonyms: [[bootstrap, installation]]\nrelationships:\n  - { id: first, from: guide.welcome, to: guide.install, type: prerequisite }\n');
});

test('missing, conflicting and directory-scoped policy stays attributable without guessed obligations', async t => {
  const { root, config } = await fixture(t);
  let result = await inspectAuthoringProject(config, { section: 'findings' });
  assert.equal(result.summary.policyStatus, 'missing');
  assert.equal(result.entries[0].code, 'project.policy-missing');
  await mkdir(path.join(root, 'content/nested'));
  await writeFile(path.join(root, 'content/nested/AGENTS.md'), 'Never add release notes for this folder.\n');
  await writeFile(path.join(root, 'AGENTS.md'), 'Every edit needs release notes.\n');
  await writeFile(config, await readFile(config, 'utf8') + '\nauthoring:\n  guideFiles: [missing-style.md]\n');
  result = await inspectAuthoringProject(config, { section: 'guidance' });
  assert.equal(result.summary.policyStatus, 'requires-interpretation');
  assert.equal(result.entries.filter(entry => entry.role === 'policy').length, 2);
  assert.equal(result.entries.find(entry => entry.file === 'content/nested/AGENTS.md')!.applicability, 'directory scope: content/nested');
  assert.match((await readAuthoringSource(config, 'AGENTS.md')).content, /Every edit/);
  assert.match((await readAuthoringSource(config, 'content/nested/AGENTS.md')).content, /Never add/);
  const findings = await inspectAuthoringProject(config, { section: 'findings' });
  assert.ok(findings.entries.some(entry => entry.code === 'project.guidance-unavailable' && entry.file === 'missing-style.md' && entry.severity === 'review-needed'));
});

test('large sites paginate deterministically and passages reconstruct Unicode source exactly within budget', async t => {
  const { root, config } = await fixture(t);
  await Promise.all(Array.from({ length: 110 }, (_, index) => writeFile(path.join(root, `content/page-${String(index).padStart(3, '0')}.mdx`), `---\nid: topic.${index}\ntitle: Topic ${index}\nsummary: Fixture\nslug: /topic-${index}\n---\n\nTopic evidence.\n`)));
  const ids: string[] = [];
  let offset = 0;
  while (true) {
    const result = await inspectAuthoringProject(config, { offset, limit: 100, maxTokens: 2048 });
    assert.ok(documentationTokens(JSON.stringify(result)) <= 2048);
    ids.push(...result.entries.map(entry => entry.id));
    if (result.pagination.nextOffset === null) break;
    assert.ok(result.pagination.nextOffset > offset);
    offset = result.pagination.nextOffset;
  }
  assert.equal(new Set(ids).size, 112);
  const raw = ('😊 héllo\n' + 'z'.repeat(80) + '\n').repeat(100);
  await writeFile(path.join(root, 'SOURCE.txt'), raw);
  let passage = '', cursor = 0;
  while (true) {
    const result = await readAuthoringSource(config, 'SOURCE.txt', { offset: cursor, maxTokens: 1024 });
    assert.ok(documentationTokens(JSON.stringify(result)) <= 1024);
    passage += result.content;
    if (result.nextOffset === null) break;
    assert.ok(result.nextOffset > cursor);
    cursor = result.nextOffset;
  }
  assert.equal(passage, raw);
});

test('empty sites, broken pages and unsafe paths return honest coverage without requiring an ID', async t => {
  const { root, config } = await fixture(t);
  await rm(path.join(root, 'content'), { recursive: true });
  const empty = await inspectAuthoringProject(config);
  assert.equal(empty.entries.length, 0);
  assert.equal(empty.coverage.validation, 'not-run');
  await mkdir(path.join(root, 'content'));
  await writeFile(path.join(root, 'content/broken.mdx'), 'No frontmatter');
  const broken = await inspectAuthoringProject(config, { section: 'findings' });
  assert.ok(broken.entries.some(entry => entry.code === 'project.invalid-page' && entry.file === 'content/broken.mdx'));
  await symlink(os.tmpdir(), path.join(root, 'escape'));
  await assert.rejects(readAuthoringSource(config, '../outside'), /project-relative/);
  await assert.rejects(readAuthoringSource(config, '/etc/passwd'), /project-relative/);
  await assert.rejects(readAuthoringSource(config, 'escape'), /escapes project/);
  await assert.rejects(inspectAuthoringProject(config, { id: 'a', query: 'b' }), /at most one/);
  await assert.rejects(inspectAuthoringProject(config, { offset: -1 }), /offset/);
  await assert.rejects(inspectAuthoringProject(config, { limit: 101 }), /limit/);
});

test('public CLI discovers config without page setup and reads existing canonical Steps reference without credentials', async t => {
  const { root } = await fixture(t);
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/KEY|TOKEN|SECRET|PROVIDER/i.test(key)));
  const cli = path.join(framework, 'dist/cli.js');
  const project = JSON.parse((await execFile(process.execPath, [cli, 'docs', 'project', '--json'], { cwd: root, env })).stdout);
  assert.equal(project.entries.length, 2);
  assert.equal(project.summary.project, await realpath(root));
  const search = JSON.parse((await execFile(process.execPath, [cli, 'docs', 'search', 'Steps', '--json'], { cwd: root, env })).stdout);
  assert.ok(search.results.some((entry: any) => entry.id === 'guide.component.steps'));
  const page = JSON.parse((await execFile(process.execPath, [cli, 'docs', 'read', 'guide.component.steps', '--json'], { cwd: root, env })).stdout);
  assert.match(page.content, /<Steps>/);
  assert.match(page.content, /title.*Required/);
  assert.match(page.content, /semantic ordered list/);
  assert.match(page.content, /Markdown keeps/);
  const source = JSON.parse((await execFile(process.execPath, [cli, 'docs', 'source', 'content/install.mdx'], { cwd: root, env })).stdout);
  assert.match(source.content, /acme --version/);
  try { await execFile(process.execPath, [cli, 'docs', 'project', '--limit', 'zero'], { cwd: root, env }); assert.fail('Expected nonzero exit'); }
  catch (error) {
    const failure = error as any;
    assert.equal(failure.code, 1);
    assert.equal(JSON.parse(failure.stdout).error.code, 'invalid_input');
    assert.equal(failure.stderr, '');
  }
  for (const args of [['--limit', '1', '--limit', '2'], ['--query'], ['--section', 'bad'], ['extra'], ['--offset', '1.5']]) assert.throws(() => parseProjectOptions('project', args));
});

test('templates and reference exports use canonical bundled data', async t => {
  const { root, config } = await fixture(t);
  await mkdir(path.join(root, 'config'));
  await writeFile(path.join(root, 'config/AGENTS.md'), 'Preserve template ownership.\n');
  await writeFile(path.join(root, 'config/templates.yaml'), 'procedure: { type: consumer-procedure, body: procedure.mdx }\n');
  await writeFile(path.join(root, 'config/procedure.mdx'), '## Consumer procedure\n');
  await writeFile(config, await readFile(config, 'utf8') + '\ntemplates: { $include: config/templates.yaml }\n');
  const result = await inspectAuthoringProject(config, { section: 'templates' });
  assert.equal(result.entries.find(entry => entry.id === 'how-to')!.type, builtinAuthoringTemplates['how-to'].type);
  const local = result.entries.find(entry => entry.id === 'procedure')!;
  assert.equal(local.type, 'consumer-procedure');
  assert.equal(local.source.file, 'config/templates.yaml');
  assert.equal(local.bodyFile, 'config/procedure.mdx');
  assert.match((await readAuthoringSource(config, local.bodyFile)).content, /Consumer procedure/);
  assert.ok((await inspectAuthoringProject(config, { section: 'guidance' })).entries.some(entry => entry.file === 'config/AGENTS.md' && entry.role === 'policy'));
  const search = await searchDocumentation(bundledDocumentation, 'Steps');
  assert.ok(search.results.some((entry: any) => entry.id === 'guide.component.steps'));
  assert.match((await getDocumentationPage(bundledDocumentation, 'guide.frontmatter-reference')).content, /slug/);
});

test('CLI configuration failures use the versioned invalid_project envelope', async t => {
  const { root, config } = await fixture(t);
  const canonicalConfig = await realpath(config);
  await writeFile(config, 'schemaVersion: wrong\n');
  await assert.rejects(execFile(process.execPath, [path.join(framework, 'dist/cli.js'), 'docs', 'project'], { cwd: root }), error => {
    const failure = error as any;
    assert.equal(failure.code, 1);
    assert.deepEqual(JSON.parse(failure.stdout), { schemaVersion: 1, status: 'error', error: { code: 'invalid_project', message: `Cannot load project configuration: ${canonicalConfig}: schemaVersion must be 1` } });
    assert.equal(failure.stderr, '');
    return true;
  });
});
