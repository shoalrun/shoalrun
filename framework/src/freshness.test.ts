import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, rm, utimes } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { contentDigest, loadFreshness } from './freshness.js';
import { validateFrontmatter } from './frontmatter.js';
import type { Document } from './content-source.js';

test('content changes advance dates; file touches, source positions, and verification preserve revision dates', async t => {
  const base = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-freshness-'));
  t.after(() => rm(base, { recursive: true, force: true }));
  const doc = { frontmatter: { id: 'guide.test', title: 'Test', summary: 'Test content', type: 'reference', slug: '/test', updated: '2026-09-20' }, variant: { channel: 'production', version: 'current', language: 'en' } } as Document;
  const tree = { type: 'root', children: [{ type: 'text', value: 'Original', position: { start: 1 } }] };
  const original = contentDigest(doc, tree, tree);
  const settings = { history: './history.json' };
  const first = (await loadFreshness(settings, base, '2026-09-25'))!;
  assert.equal(first.resolve(doc, original), '2026-09-20');
  await first.commit();
  const file = path.join(base, 'history.json');
  const history = await readFile(file, 'utf8');
  await utimes(file, new Date(), new Date());
  doc.frontmatter.updated = '2026-09-28';
  doc.frontmatter.verified = '2026-09-28';
  tree.children[0].position.start = 20;
  assert.equal(contentDigest(doc, tree, tree), original);
  const unchanged = (await loadFreshness(settings, base, '2026-10-01'))!;
  assert.equal(unchanged.resolve(doc, original), '2026-09-20');
  await unchanged.commit();
  assert.equal(await readFile(file, 'utf8'), history);
  tree.children[0].value = 'Revised';
  const changed = (await loadFreshness(settings, base, '2026-10-01'))!;
  assert.equal(changed.resolve(doc, contentDigest(doc, tree, tree)), '2026-10-01');
  assert.equal(doc.frontmatter.verified, '2026-09-28');
  await changed.commit();
  const cleanBuild = (await loadFreshness(settings, base, '2026-10-02'))!;
  assert.equal(cleanBuild.resolve(doc, contentDigest(doc, tree, tree)), '2026-10-01');
  await assert.rejects(loadFreshness({ history: '../outside.json' }, base), /inside the project/);
});

test('verification must be a real calendar date', () => {
  const doc = { id: 'test', title: 'Test', summary: 'Test', type: 'reference', slug: '/test', verified: '2026-02-30' };
  assert.throws(() => validateFrontmatter(doc, {}, 'test.mdx'), /verified must be a real/);
  doc.verified = '2026-10-01';
  assert.doesNotThrow(() => validateFrontmatter(doc, {}, 'test.mdx'));
});
