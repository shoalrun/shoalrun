import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { validateFrontmatter, resolveFrontmatter, declaredFrontmatterFields, frontmatterSchema } from './frontmatter.js';
import { resolveAuthoredChange, authoredChangeNotice } from './authored-change.js';
import { contentDigest } from './freshness.js';
import { compile } from './compiler.js';
import { markdownSize } from './markdown-size.js';
import type { Document } from './content-source.js';

const make = (id = 'change'): Document => ({ file: `${id}.mdx`, frontmatter: { id, title: id, summary: id, slug: `/${id}`, type: 'changelog-entry', date: '2026-10-15', access: { policy: 'public' } }, variant: { channel: 'production', version: 'v1', language: 'en' }, route: `/docs/v1/${id}`, markdownRoute: `/docs/v1/${id}.md`, body: '', tree: null });
const key = (d: Document) => `${d.frontmatter.id}|${d.variant.channel}|${d.variant.version}|${d.variant.language}`;

test('authored change validates kinds, scope, ownership, and optional legacy entries', () => {
  const valid = { kind: 'breaking', affects: ['target'], migration: 'migrate' };
  for (const change of [null, [], {}, 'breaking', { ...valid, kind: 'minor' }, { ...valid, affects: [] }, { ...valid, affects: 'target' }, { ...valid, affects: ['target', 'target'] }, { ...valid, affects: [' target'] }, { ...valid, affects: [4] }, { ...valid, migration: '' }, { ...valid, migration: ' migrate' }, { ...valid, effectiveDate: '2026-10-15' }]) {
    assert.throws(() => validateFrontmatter({ ...make().frontmatter, change } as any, {}, 'entry'), /change/);
  }
  validateFrontmatter(make().frontmatter, {}, 'entry');
  for (const kind of ['editorial', 'procedure', 'behavior', 'breaking'] as const) validateFrontmatter({ ...make().frontmatter, change: { kind, affects: ['target'] } }, {}, 'entry');
  for (const type of ['guide', 'release-note']) assert.throws(() => validateFrontmatter({ ...make().frontmatter, type, change: valid } as any, {}, 'entry'), /only on changelog-entry/);
  for (const layer of ['defaults', 'enforced']) assert.throws(() => resolveFrontmatter(make().frontmatter, { [layer]: { change: valid } }), /page-specific/);
  assert.throws(() => declaredFrontmatterFields({ fields: { 'change.kind': { type: 'string' } } }), /Cannot redefine/);
  assert.deepEqual(frontmatterSchema({}).properties.change.required, ['kind', 'affects']);
  assert.equal(frontmatterSchema({}).properties.change.additionalProperties, false);
});

test('authored change resolves public targets in the same publication and tracks their current URLs', () => {
  const source = make(), target = make('target');
  source.frontmatter.change = { kind: 'procedure', affects: ['target'], migration: 'target' };
  const docs = new Map([[key(source), source], [key(target), target]]);
  assert.equal(resolveAuthoredChange(source, docs)?.affects[0].markdownUrl, '/docs/v1/target.md');
  target.route = '/docs/v1/renamed'; target.markdownRoute = '/docs/v1/renamed.md';
  assert.equal(resolveAuthoredChange(source, docs)?.migration?.url, '/docs/v1/renamed');
  const digest = () => contentDigest(source, authoredChangeNotice(resolveAuthoredChange(source, docs), 'html'), {});
  const before = digest(); target.frontmatter.title = 'New name'; assert.notEqual(digest(), before);
  const renamed = digest(); source.frontmatter.change.kind = 'breaking'; assert.notEqual(digest(), renamed);
  for (const field of ['affects', 'migration'] as const) for (const id of ['change', 'missing', 'doc:target', 'https://example.test/page']) {
    source.frontmatter.change = { kind: 'procedure', affects: ['target'], [field]: field === 'affects' ? [id] : id };
    assert.throws(() => resolveAuthoredChange(source, docs), /another public document in the same publication/);
  }
  source.frontmatter.change = { kind: 'breaking', affects: ['target'] };
  target.frontmatter.access = { policy: 'draft' };
  assert.throws(() => resolveAuthoredChange(source, docs), /another public/);
  target.frontmatter.access = { policy: 'public' };
  for (const dimension of ['channel', 'version', 'language'] as const) {
    const alternate = structuredClone(target); alternate.variant[dimension] = 'other';
    assert.throws(() => resolveAuthoredChange(source, new Map([[key(alternate), alternate]])), /same publication/);
  }
  delete source.frontmatter.change;
  assert.equal(resolveAuthoredChange(source, docs), undefined);
});

test('authored change publishes consistent mounted HTML, full/section Markdown and manifest without classifying old entries', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-change-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await cp(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../example-configs/minimal'), directory, { recursive: true });
  const config = path.join(directory, 'docs.config.yaml');
  await writeFile(config, (await readFile(config, 'utf8')).replace('  title: Acme handbook', '  title: Acme handbook\n  basePath: /docs\n  origin: https://docs.example.test').replace('current: { pathPrefix: "" }', 'current: { pathPrefix: /v1 }'));
  await writeFile(path.join(directory, 'content/change.mdx'), `---\nid: change.new\ntitle: Changed procedure\nsummary: A fictional change.\ntype: changelog-entry\ndate: 2026-10-15\nslug: /changes/new\nchange:\n  kind: breaking\n  affects: [guide.install, guide.welcome]\n  migration: guide.install\n---\n\n## Action\n\nFollow the migration guide.\n\n## Background\n\n${'Historical context for the change. '.repeat(1800)}\n`);
  await writeFile(path.join(directory, 'content/old.mdx'), '---\nid: change.old\ntitle: Old entry\nsummary: Unclassified entry.\ntype: changelog-entry\ndate: 2026-10-14\nslug: /changes/old\n---\n\nOld entry remains readable.\n');
  const output = path.join(directory, 'output');
  const manifest = await compile(config, output);
  const doc = manifest.documents.find(d => d.id === 'change.new')!;
  assert.equal(doc.change?.kind, 'breaking');
  assert.deepEqual(doc.change?.affects.map(d => d.id), ['guide.install', 'guide.welcome']);
  assert.equal(doc.change?.migration?.markdownUrl, '/docs/v1/install.md');
  const html = await readFile(path.join(output, doc.url, 'index.html'), 'utf8');
  assert.match(html, /<strong>Authored change<\/strong>: Breaking change/);
  assert.match(html, /href="\/docs\/v1\/install"/);
  assert.match(html, /Classification and scope are declared by the author/);
  assert.ok(doc.sections.length);
  for (const record of [doc, ...doc.sections]) {
    const md = await readFile(path.join(output, record.markdownUrl), 'utf8');
    assert.equal((md.match(/\*\*Authored change\*\*/g) ?? []).length, 1);
    assert.match(md, /Migration guide: \[Install Acme\]\(https:\/\/docs.example.test\/docs\/v1\/install.md\)/);
    assert.equal(record.digest, createHash('sha256').update(md).digest('hex'));
    assert.equal(record.markdownBytes, Buffer.byteLength(md));
    assert.equal(record.markdownTokens, markdownSize(md).markdownTokens);
  }
  const old = manifest.documents.find(d => d.id === 'change.old')!;
  assert.equal(old.change, undefined);
  assert.doesNotMatch(await readFile(path.join(output, old.markdownUrl), 'utf8'), /Authored change|nonbreaking/);
  assert.ok((await readFile(path.join(output, 'docs/llms.min.txt'), 'utf8')).includes('/docs/v1/changes/old.md'));
});
