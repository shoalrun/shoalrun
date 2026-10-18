import test from 'node:test';
import assert from 'node:assert/strict';
import { chmod, cp, link, mkdir, mkdtemp, readFile, readdir, rename, rm, stat, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { commitAuthoringFiles, docsApply, docsContext, docsPlan } from './docs-author.js';

const fixture = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../example-configs/minimal');

test('agent authoring plans validate a staged site, reject stale edits, and apply multiple files', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-author-test-'));
  try {
    await cp(fixture, root, { recursive: true });
    const config = path.join(root, 'docs.config.yaml');
    const page = path.join(root, 'content/welcome.mdx');
    const originalPage = await readFile(page, 'utf8');
    let originalConfig = await readFile(config, 'utf8');
    await writeFile(config, originalConfig + '\nauthoring:\n  directives: Use Steps for procedures.\n  guideFiles: [content/welcome.mdx]\n');
    originalConfig = await readFile(config, 'utf8');
    await chmod(page, 0o600);
    const context = await docsContext('guide.welcome', config);
    assert.equal(context.sources[0].file, 'content/welcome.mdx');
    assert.match(context.sources[0].baseDigest, /^[a-f0-9]{64}$/);
    assert.equal(context.authoring?.directives, 'Use Steps for procedures.');
    assert.deepEqual(context.authoring?.guideFiles, ['content/welcome.mdx']);
    assert.equal(context.configOwners.authoring, 'docs.config.yaml');
    assert.deepEqual(context.navigation.map(item => item.id), ['welcome']);
    const request = path.join(root, 'request.json');
    const plan = path.join(root, 'plan.json');
    const changedPage = originalPage.replace('This handbook explains', 'This updated handbook explains');
    const changedConfig = originalConfig.replace('title: Acme handbook', 'title: Updated Acme handbook');
    await writeFile(request, JSON.stringify({ edits: [{ file: 'content/welcome.mdx', content: changedPage }, { file: 'docs.config.yaml', content: changedConfig }] }));
    await docsPlan(request, config, plan);
    const checked = await docsApply(plan, config, true);
    assert.equal(checked.checked, true);
    assert.equal(checked.affected.some(item => item.id.startsWith('guide.welcome|')), true);
    assert.equal(await readFile(page, 'utf8'), originalPage);
    assert.equal(await readFile(config, 'utf8'), originalConfig);
    const applied = await docsApply(plan, config, false);
    assert.equal('applied' in applied && applied.applied, true);
    assert.equal(await readFile(page, 'utf8'), changedPage);
    assert.equal(await readFile(config, 'utf8'), changedConfig);
    assert.equal((await stat(page)).mode & 0o777, 0o600);
    await assert.rejects(docsApply(plan, config, true), /Stale plan/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('invalid candidate and symlink targets leave source files untouched', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-author-test-'));
  try {
    await cp(fixture, root, { recursive: true });
    const config = path.join(root, 'docs.config.yaml');
    const page = path.join(root, 'content/welcome.mdx');
    const original = await readFile(page, 'utf8');
    const request = path.join(root, 'request.json');
    const plan = path.join(root, 'plan.json');
    await writeFile(request, JSON.stringify({ edits: [{ file: 'content/welcome.mdx', content: original.replace('doc:guide.install', 'doc:missing') }] }));
    await docsPlan(request, config, plan);
    await assert.rejects(docsApply(plan, config, false), /missing/i);
    assert.equal(await readFile(page, 'utf8'), original);
    await symlink(page, path.join(root, 'content/alias.mdx'));
    await writeFile(request, JSON.stringify({ edits: [{ file: 'content/alias.mdx', content: 'changed' }] }));
    await assert.rejects(docsPlan(request, config, path.join(root, 'other-plan.json')), /symlink/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('staged repair preserves sibling source paths inside a Git repository', async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-author-repo-'));
  try {
    await mkdir(path.join(parent, '.git'));
    const root = path.join(parent, 'site');
    await cp(fixture, root, { recursive: true });
    await writeFile(path.join(parent, 'shared.js'), 'export const shared = true;\n');
    const page = path.join(root, 'content/welcome.mdx');
    const original = await readFile(page, 'utf8');
    const walkthrough = '\n<Walkthrough title="Shared code">\n<Step title="Read it" file="../../shared.js" highlight="1">\n\nThe shared setting.\n\n</Step>\n<Step title="Use it" file="../../shared.js" highlight="1">\n\nThe shared value.\n\n</Step>\n</Walkthrough>\n';
    await writeFile(page, original.replace('doc:guide.install', 'doc:guide.missing') + walkthrough);
    const request = path.join(parent, 'request.json');
    const plan = path.join(parent, 'plan.json');
    await writeFile(request, JSON.stringify({ edits: [{ file: 'content/welcome.mdx', content: original.replace('This handbook', 'The handbook') + walkthrough }] }));
    await docsPlan(request, path.join(root, 'docs.config.yaml'), plan);
    const result = await docsApply(plan, path.join(root, 'docs.config.yaml'), true);
    assert.equal(result.checked, true);
    assert.equal(result.baselineValid, false);
  } finally { await rm(parent, { recursive: true, force: true }); }
});

test('a repair can be checked and applied when the original page has a broken link', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-author-repair-'));
  try {
    await cp(fixture, root, { recursive: true });
    const config = path.join(root, 'docs.config.yaml');
    const page = path.join(root, 'content/welcome.mdx');
    const fixed = await readFile(page, 'utf8');
    const broken = fixed.replace('doc:guide.install', 'doc:guide.missing');
    await writeFile(page, broken);
    const request = path.join(root, 'request.json');
    const plan = path.join(root, 'plan.json');
    await writeFile(request, JSON.stringify({ edits: [{ file: 'content/welcome.mdx', content: fixed }] }));
    await docsPlan(request, config, plan);
    const result = await docsApply(plan, config, true);
    assert.equal(result.checked, true);
    assert.equal(result.baselineValid, false);
    assert.match(result.baselineError!, /guide\.missing/);
    assert.equal(result.affected.length, result.documents);
    assert.equal(await readFile(page, 'utf8'), broken);
    await docsApply(plan, config, false);
    assert.equal(await readFile(page, 'utf8'), fixed);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('repairing one original error does not allow an invalid replacement to apply', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-author-bad-repair-'));
  try {
    await cp(fixture, root, { recursive: true });
    const config = path.join(root, 'docs.config.yaml');
    const page = path.join(root, 'content/welcome.mdx');
    const original = (await readFile(page, 'utf8')).replace('doc:guide.install', 'doc:guide.missing');
    await writeFile(page, original);
    const request = path.join(root, 'request.json');
    const plan = path.join(root, 'plan.json');
    await writeFile(request, JSON.stringify({ edits: [{ file: 'content/welcome.mdx', content: original.replace('doc:guide.missing', 'doc:guide.still-missing') }] }));
    await docsPlan(request, config, plan);
    await assert.rejects(docsApply(plan, config, false), /still-missing/);
    assert.equal(await readFile(page, 'utf8'), original);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('new pages are staged without placeholders, render draft access and reject collisions', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-author-create-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(fixture, root, { recursive: true });
  const config = path.join(root, 'docs.config.yaml');
  const original = await readFile(path.join(root, 'content/welcome.mdx'), 'utf8');
  const candidate = original.replaceAll('guide.welcome', 'guide.preview').replace('slug: /', 'slug: /preview\naccess: { policy: draft }');
  const request = path.join(root, 'request.json'), plan = path.join(root, 'plan.json');
  const file = 'content/new/preview.mdx';
  await writeFile(request, JSON.stringify({ edits: [{ file, content: candidate, operation: 'create', expectedAbsent: true }] }));
  await docsPlan(request, config, plan);
  assert.equal(JSON.parse(await readFile(plan, 'utf8')).schemaVersion, 2);
  await assert.rejects(stat(path.join(root, file)), { code: 'ENOENT' });
  await docsApply(plan, config, true);
  await assert.rejects(stat(path.join(root, file)), { code: 'ENOENT' });
  await docsApply(plan, config, false);
  assert.equal(await readFile(path.join(root, file), 'utf8'), candidate);
  await assert.rejects(docsApply(plan, config, false), /collision/);
});

test('creation rejects symlink ancestors and validates excluded draft pages', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-author-create-invalid-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(fixture, root, { recursive: true });
  const config = path.join(root, 'docs.config.yaml');
  const original = await readFile(path.join(root, 'content/welcome.mdx'), 'utf8');
  const candidate = original.replaceAll('guide.welcome', 'guide.preview').replace('slug: /', 'slug: /preview\naccess: { policy: draft }').replace('doc:guide.install', 'doc:missing');
  const request = path.join(root, 'request.json'), plan = path.join(root, 'plan.json');
  await symlink(path.join(root, 'content'), path.join(root, 'content/alias'));
  await writeFile(request, JSON.stringify({ edits: [{ file: 'content/alias/preview.mdx', content: candidate, operation: 'create', expectedAbsent: true }] }));
  await assert.rejects(docsPlan(request, config, plan), /symlink/);
  await rm(path.join(root, 'content/alias'));
  await writeFile(request, JSON.stringify({ edits: [{ file: 'content/preview.mdx', content: candidate, operation: 'create', expectedAbsent: true }] }));
  await docsPlan(request, config, plan);
  await assert.rejects(docsApply(plan, config, false), /missing/);
  await assert.rejects(stat(path.join(root, 'content/preview.mdx')), { code: 'ENOENT' });
  assert.equal(await readFile(path.join(root, 'content/welcome.mdx'), 'utf8'), original);
});

test('a concurrent creation during application rolls back earlier updates and creations', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-author-rollback-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(fixture, root, { recursive: true });
  const config = path.join(root, 'docs.config.yaml');
  const original = await readFile(path.join(root, 'content/welcome.mdx'), 'utf8');
  const request = path.join(root, 'request.json'), plan = path.join(root, 'plan.json');
  const newPage = (name: string) => original.replace('guide.welcome', `guide.${name}`).replace('slug: /', `slug: /${name}`);
  await writeFile(request, JSON.stringify({ edits: [
    { file: 'content/welcome.mdx', content: original.replace('This handbook', 'This updated handbook') },
    { file: 'content/one.mdx', content: newPage('one'), operation: 'create', expectedAbsent: true },
    { file: 'content/two.mdx', content: newPage('two'), operation: 'create', expectedAbsent: true },
  ] }));
  await docsPlan(request, config, plan);
  let collided = false;
  await docsApply(plan, config, true);
  const saved = JSON.parse(await readFile(plan, 'utf8'));
  await assert.rejects(commitAuthoringFiles(saved.edits.map((edit: any) => ({ ...edit, target: path.join(root, edit.file) })), async () => {}, {
    rename,
    async link(from, to) {
      if (to === path.join(root, 'content/two.mdx')) {
        collided = true;
        await writeFile(to, 'Concurrent author content', { flag: 'wx' });
      }
      return link(from, to);
    },
  }), /EEXIST/);
  assert.equal(collided, true);
  assert.equal(await readFile(path.join(root, 'content/welcome.mdx'), 'utf8'), original);
  await assert.rejects(stat(path.join(root, 'content/one.mdx')), { code: 'ENOENT' });
  assert.equal(await readFile(path.join(root, 'content/two.mdx'), 'utf8'), 'Concurrent author content');
});

test('new pages discover sibling implementation dependencies without live placeholders', async t => {
  const parent = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-author-create-deps-'));
  t.after(() => rm(parent, { recursive: true, force: true }));
  await mkdir(path.join(parent, '.git'));
  const root = path.join(parent, 'docs');
  await cp(fixture, root, { recursive: true });
  await writeFile(path.join(parent, 'shared.js'), 'export const shared = true;\n');
  const original = await readFile(path.join(root, 'content/welcome.mdx'), 'utf8');
  const candidate = original.replace('guide.welcome', 'guide.preview').replace('slug: /', 'slug: /preview') + '\n<Walkthrough title="Shared code">\n<Step title="Read it" file="../../shared.js" highlight="1">\n\nThe shared setting.\n\n</Step>\n<Step title="Use it" file="../../shared.js" highlight="1">\n\nThe shared value.\n\n</Step>\n</Walkthrough>\n';
  const request = path.join(parent, 'request.json'), plan = path.join(parent, 'plan.json');
  await writeFile(request, JSON.stringify({ edits: [{ file: 'content/preview.mdx', content: candidate, operation: 'create', expectedAbsent: true }] }));
  await docsPlan(request, path.join(root, 'docs.config.yaml'), plan);
  const checked = await docsApply(plan, path.join(root, 'docs.config.yaml'), true);
  assert.equal(checked.checked, true);
  await assert.rejects(stat(path.join(root, 'content/preview.mdx')), { code: 'ENOENT' });
});

test('failed rollback retains the original backup and reports recovery instead of deleting it', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-author-backup-recovery-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(fixture, root, { recursive: true });
  const original = await readFile(path.join(root, 'content/welcome.mdx'), 'utf8');
  const request = path.join(root, 'request.json'), plan = path.join(root, 'plan.json');
  await writeFile(request, JSON.stringify({ edits: [
    { file: 'content/welcome.mdx', content: original.replace('This handbook', 'This updated handbook') },
    { file: 'content/new.mdx', content: original, operation: 'create', expectedAbsent: true },
  ] }));
  await docsPlan(request, path.join(root, 'docs.config.yaml'), plan);
  const saved = JSON.parse(await readFile(plan, 'utf8'));
  await assert.rejects(commitAuthoringFiles(saved.edits.map((edit: any) => ({ ...edit, target: path.join(root, edit.file) })), async () => {}, {
    async rename(from, to) {
      if (String(from).includes('.shoalrun-backup-')) throw new Error('Simulated rollback failure');
      return rename(from, to);
    },
    async link(from, to) {
      await writeFile(to, 'Concurrent author content', { flag: 'wx' });
      return link(from, to);
    },
  }), /rollback needs recovery.*Retained backups/);
  const backup = (await readdir(path.join(root, 'content'))).find(file => file.startsWith('welcome.mdx.shoalrun-backup-'))!;
  assert.ok(backup);
  assert.equal(await readFile(path.join(root, 'content', backup), 'utf8'), original);
  assert.equal(await readFile(path.join(root, 'content/new.mdx'), 'utf8'), 'Concurrent author content');
});
