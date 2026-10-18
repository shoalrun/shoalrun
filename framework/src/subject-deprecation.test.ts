import test from 'node:test';
import assert from 'node:assert/strict';
import { validateFrontmatter, resolveFrontmatter, frontmatterSchema, declaredFrontmatterFields } from './frontmatter.js';
import { resolveSubjectDeprecation, validateSubjectDeprecation, subjectDeprecationNotice } from './subject-deprecation.js';
import { contentDigest } from './freshness.js';
import type { Document } from './content-source.js';
import { renderMarkdown } from './semantic-markdown.js';

const make = (id = 'old', language = 'en'): Document => ({ file: `${id}.mdx`, frontmatter: { id, title: id, summary: id, slug: `/${id}`, type: 'reference', access: { policy: 'public' }, subjectLifecycle: 'deprecated' }, variant: { channel: 'production', version: 'v1', language }, route: `/docs/${language}/v1/${id}`, markdownRoute: `/docs/${language}/v1/${id}.md`, body: '', tree: null });
const key = (doc: Document) => `${doc.frontmatter.id}|${doc.variant.channel}|${doc.variant.version}|${doc.variant.language}`;

test('subject deprecation validates dates, shape, and page-specific ownership', () => {
  for (const value of [null, {}, [], 'retired', { sunsetOn: '2026-02-29' }, { deprecatedOn: '2026-01-01T00:00:00Z' }, { deprecatedOn: 2026 }, { deprecatedOn: '2026-10-15', sunsetOn: '2026-10-14' }, { replacement: '' }, { migration: ' target' }, { typo: '2026-10-15' }]) {
    assert.throws(() => validateFrontmatter({ ...make().frontmatter, subjectDeprecation: value } as any, {}, 'old.mdx'), /subjectDeprecation/);
  }
  for (const value of [undefined, { deprecatedOn: '2024-02-29' }, { sunsetOn: '2027-01-01' }, { replacement: 'new' }, { migration: 'migrate' }, { deprecatedOn: '2026-10-15', sunsetOn: '2026-10-15' }]) validateSubjectDeprecation(value, 'old.mdx');
  for (const layer of ['defaults', 'enforced']) assert.throws(() => resolveFrontmatter(make().frontmatter, { [layer]: { subjectDeprecation: { replacement: 'new' } } }), /must stay page-specific/);
  assert.throws(() => declaredFrontmatterFields({ fields: { 'subjectDeprecation.migration': { type: 'string' } } }), /Cannot redefine/);
  assert.equal((frontmatterSchema({}) as any).properties.subjectDeprecation.additionalProperties, false);
});

test('subject deprecation resolves only public nonself targets in the same publication', () => {
  const source = make();
  const target = make('new');
  const docs = new Map([[key(source), source], [key(target), target]]);
  source.frontmatter.subjectDeprecation = { replacement: 'new', migration: 'new' };
  assert.deepEqual(resolveSubjectDeprecation(source, docs)?.replacement, { id: 'new', title: 'new', url: '/docs/en/v1/new', markdownUrl: '/docs/en/v1/new.md' });
  for (const id of ['old', 'missing', 'https://example.test/new', 'doc:new']) {
    source.frontmatter.subjectDeprecation.replacement = id;
    assert.throws(() => resolveSubjectDeprecation(source, docs), /another public document in the same publication/);
  }
  source.frontmatter.subjectDeprecation.replacement = 'new';
  target.frontmatter.access = { policy: 'draft' };
  assert.throws(() => resolveSubjectDeprecation(source, docs), /another public/);
  target.frontmatter.access = { policy: 'public' };
  for (const dimension of ['language', 'version', 'channel'] as const) {
    const alternate = structuredClone(target);
    alternate.variant[dimension] = 'other';
    assert.throws(() => resolveSubjectDeprecation(source, new Map([[key(alternate), alternate]])), /same publication/);
  }
  source.frontmatter.subjectLifecycle = 'beta';
  assert.throws(() => resolveSubjectDeprecation(source, docs), /requires subjectLifecycle: deprecated/);
});

test('notice keeps subject scope and resolved target changes affect content freshness', () => {
  const source = make(); const target = make('new');
  source.frontmatter.subjectDeprecation = { sunsetOn: '2027-01-15', migration: 'new' };
  const docs = new Map([[key(target), target]]);
  const tree = () => subjectDeprecationNotice(resolveSubjectDeprecation(source, docs), 'html');
  const before = contentDigest(source, tree(), {});
  target.frontmatter.title = 'New name <script>';
  assert.notEqual(contentDigest(source, tree(), {}), before);
  const markdown = renderMarkdown(subjectDeprecationNotice(resolveSubjectDeprecation(source, docs), 'markdown'));
  assert.match(markdown, /Sunset date: 2027-01-15/);
  assert.match(markdown, /not the availability of this documentation page/);
  assert.ok(markdown.includes('/docs/en/v1/new.md'));
});
