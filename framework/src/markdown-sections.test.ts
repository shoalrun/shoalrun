import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createSiteServer } from './server.js';
import { queryBuiltSite } from './search-query.js';
import { compile } from './compiler.js';
import { getDocumentationOutline, getDocumentationSection, documentationTokens } from './documentation-core.js';
import { validateFrontmatter, frontmatterLayers, frontmatterSchema } from './frontmatter.js';
import type { Frontmatter } from './content.js';
import { contentDigest } from './freshness.js';
import { resolveCardTree, publicationRelationships, type Relationship } from './cards.js';
import type { Document } from './content.js';
import { markdownSections } from './markdown-sections.js';
import { root, heading, paragraph, text, code, renderMarkdown } from './semantic-markdown.js';

const framework = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
test('section boundaries preserve nested blocks and disambiguate generated identities', () => {
  const tree = root([paragraph(text('Shared context.')), heading(2, 'Café'), code('## Not a section', 'md'),
    { type: 'blockquote', children: [heading(2, 'Nested'), paragraph(text('For developers.'))] }, heading(3, 'Child'), paragraph(text('Child body.')), heading(2, 'Café'), heading(2, 'Cafe-2')]);
  const sections = markdownSections(tree, '/docs/v1/page.md', 'parent bytes '.repeat(2000), '# Page\n\n', renderMarkdown);
  assert.deepEqual(sections.map(item => item.id), ['cafe', 'cafe-2', 'cafe-2-2']);
  assert.match(sections[0].content, /```md\n## Not a section\n```/);
  assert.match(sections[0].content, /> ## Nested/);
  assert.match(sections[0].content, /### Child/);
  for (const section of sections) {
    assert.match(section.content, /Shared context/);
    assert.equal(section.digest, hash(section.content));
    assert.equal(section.parentDigest, hash('parent bytes '.repeat(2000)));
  }
  assert.deepEqual(markdownSections(tree, '/short.md', 'Short page.', '', renderMarkdown), [], 'short pages do not get section files');
  assert.deepEqual(markdownSections(root([paragraph(text('No sections'))]), '/p.md', 'parent', '', renderMarkdown), []);
});

test('mounted section artifacts, outline, CLI reads, budgets, and digest checks agree', async t => {
  const directory = await mkdtemp(path.join(tmpdir(), 'shoalrun-sections-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await cp(path.join(framework, 'example-configs/minimal'), directory, { recursive: true });
  const config = path.join(directory, 'docs.config.yaml');
  await writeFile(config, (await readFile(config, 'utf8')).replace('  title: Acme handbook', '  title: Acme handbook\n  basePath: /docs').replace('current: { pathPrefix: "" }', 'current: { pathPrefix: /v1 }') + `
relationships:
  - { id: setup, from: guide.sections, to: guide.install, type: prerequisite, reason: Install before continuing. }
  - { id: next, from: guide.sections, to: guide.welcome, type: next-step, reason: Choose the next task. }
`);
  await writeFile(path.join(directory, 'content/sections.mdx'), `---\nid: guide.sections\ntitle: Sections\nsummary: Test sections.\nstandaloneSections: [First]\nslug: /sections\n---\n\nShared context.\n\n## First\n\nCafé 世界 🐟. [Full context](#second).\n\n\`\`\`md\n## Code heading\n\`\`\`\n\n### Nested\n\nNested body.\n\n## Second\n\nSecond body.\n\n## Appendix\n\n${'Detailed background material. '.repeat(1500)}\n\n## Related reading\n\n<RelatedReading />\n`);
  const output = path.join(directory, 'output');
  const manifest = await compile(config, output);
  const server = await createSiteServer(output);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise<void>(resolve => server.close(() => resolve())));
  const origin = `http://127.0.0.1:${(server.address() as import('node:net').AddressInfo).port}`;
  const doc = manifest.documents.find(doc => doc.id === 'guide.sections')!;
  const textIndex = await readFile(path.join(output, 'docs/llms.min.txt'), 'utf8');
  assert.ok(textIndex.includes(`](${doc.sections[0].markdownUrl})`));
  assert.ok(!textIndex.includes(`](${doc.sections[1].markdownUrl})`));
  assert.ok(textIndex.includes(`[Full page](${doc.markdownUrl})`));
  assert.match(textIndex, /Publication \(channel\/version\/language\): production\/current\/en/);
  assert.equal(doc.sections.length, 3);
  assert.equal(doc.sections[0].standalone, true);
  assert.equal(doc.sections[1].standalone, undefined);
  assert.equal((await queryBuiltSite(output, 'Sections Second')).results[0].read.tool, 'get_page');
  const search = await queryBuiltSite(output, 'Sections First timeout');
  // A missing subject term keeps the full page rather than guessing a section.
  assert.equal(search.results.find(result => result.id === doc.id)!.read.tool, 'get_page');
  const direct = await queryBuiltSite(output, 'Sections First');
  const hit = direct.results.find(result => result.id === doc.id)!;
  assert.equal(hit.read.tool, 'get_section');
  assert.equal(hit.markdownUrl, doc.sections[0].markdownUrl);
  assert.equal(hit.pageMarkdownUrl, doc.markdownUrl);
  const instruction = hit.read.arguments;
  const followed = await getDocumentationSection(output, instruction.id, instruction.section!, instruction);
  assert.equal(followed.section.id, 'first');
  assert.equal(followed.budget.truncated, false);
  assert.equal((await queryBuiltSite(output, 'Sections')).results.find(result => result.id === doc.id)!.read.tool, 'get_page');
  assert.equal((await queryBuiltSite(output, 'First Second')).results.find(result => result.id === doc.id)!.read.tool, 'get_page');
  const compact = JSON.parse(await readFile(path.join(output, 'search-index.min.json'), 'utf8')).documents.find((record: any) => record.id === doc.id);
  assert.equal(compact.sections[0].markdownUrl, hit.markdownUrl);
  assert.equal(compact.sections[0].standalone, true);
  assert.equal(compact.sections[1].standalone, undefined);
  assert.ok(!('content' in compact.sections[0]));
  const outline = await getDocumentationOutline(output, doc.id);
  assert.deepEqual(outline.sections, doc.sections);
  for (const section of doc.sections) {
    assert.ok(section.markdownUrl.startsWith('/docs/v1/sections.sections/'));
    const bytes = await readFile(path.join(output, section.markdownUrl));
    const response = await fetch(origin + section.markdownUrl);
    assert.equal(response.status, 200);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
    assert.match(response.headers.get('content-type')!, /text\/markdown/);
    assert.equal(response.headers.get('etag'), `"${section.digest}"`);
    assert.equal(section.digest, hash(bytes));
    assert.equal(section.markdownBytes, bytes.length);
    assert.equal(section.markdownTokens, documentationTokens(bytes.toString('utf8')));
    assert.equal(section.parentDigest, doc.digest);
    const result = await getDocumentationSection(output, doc.id, section.id);
    assert.equal(result.content, bytes.toString('utf8'));
    assert.equal(result.budget.truncated, false);
    assert.ok(documentationTokens(JSON.stringify(result)) <= result.budget.maxTokens);
  }
  const first = await getDocumentationSection(output, doc.id, 'first');
  assert.match(first.content, /\[Full context\]\(\/docs\/v1\/sections.md#second\)/);
  assert.doesNotMatch(first.content, /Second body/);
  assert.match(first.content, /Page reading path/);
  assert.match(first.content, /Read first/);
  assert.match(first.content, /Next steps/);
  assert.match(first.content, /\]\(\/docs\/v1\/install.md\) — Install before continuing/);
  const related = await getDocumentationSection(output, doc.id, 'related-reading');
  assert.doesNotMatch(related.content, /Page reading path/);
  assert.equal((related.content.match(/Install before continuing/g) ?? []).length, 1);
  const html = await readFile(path.join(output, doc.url, 'index.html'), 'utf8');
  assert.match(html, /Install before continuing/);
  assert.doesNotMatch(html, /sectionReadingPath|Page reading path/);
  await assert.rejects(getDocumentationSection(output, doc.id, 'missing'), /No section/);
  await assert.rejects(getDocumentationSection(output, doc.id, '../first'), /section must/);
  await assert.rejects(getDocumentationSection(output, doc.id, 'first', { maxTokens: 256 }), /complete section/);
  await assert.rejects(getDocumentationSection(output, doc.id, 'first', { version: 'absent' }), /selected publication/);
  const cli = spawnSync(process.execPath, [path.join(framework, 'dist/cli.js'), 'docs', 'section', doc.id, 'first', '--site', output], { encoding: 'utf8' });
  assert.equal(cli.status, 0, cli.stderr);
  assert.equal(JSON.parse(cli.stdout).content, first.content);
  const headers = JSON.parse(await readFile(path.join(output, 'resource-headers.json'), 'utf8'));
  assert.ok(JSON.stringify(headers).includes(doc.sections[0].digest));
  await writeFile(path.join(output, doc.sections[0].markdownUrl), 'tampered');
  await assert.rejects(getDocumentationSection(output, doc.id, 'first'), /stale/);
  await writeFile(path.join(directory, 'content/sections.mdx'), '---\nid: guide.sections\ntitle: Sections\nsummary: Short page.\nslug: /sections\n---\n\n## First\n\nA short complete page.\n');
  const rebuilt = await compile(config, output);
  assert.deepEqual(rebuilt.documents.find(record => record.id === doc.id)!.sections, []);
  await assert.rejects(readFile(path.join(output, doc.sections[0].markdownUrl)), { code: 'ENOENT' });
});


test('standalone declarations reject missing, nested and ambiguous headings even on short pages', () => {
  const tree = root([heading(2, 'Setup'), paragraph(text('Prerequisite configuration.')), heading(2, 'Use'), heading(3, 'Detail'), paragraph(text('Action.'))]);
  const sections = markdownSections(tree, '/page.md', 'background '.repeat(3000), '', renderMarkdown, ['Setup']);
  assert.equal(sections[0].standalone, true);
  assert.equal(sections[1].standalone, undefined);
  for (const title of ['Renamed', 'Detail']) assert.throws(() => markdownSections(tree, '/page.md', 'short', '', renderMarkdown, [title]), /must match exactly one/);
  assert.throws(() => markdownSections(root([heading(2, 'Same'), heading(2, 'Same')]), '/page.md', 'short', '', renderMarkdown, ['Same']), /must match exactly one/);
});


test('standalone declarations are page-specific and validate their shape', () => {
  const page = { id: 'test', title: 'Test', summary: 'Test', type: 'reference', slug: '/test' } as Frontmatter;
  for (const standaloneSections of [true, 'Setup', [''], [' Setup'], ['Setup', 'Setup'], [42]]) {
    assert.throws(() => validateFrontmatter({ ...page, standaloneSections } as Frontmatter, {}, 'test.mdx'), /standaloneSections/);
  }
  validateFrontmatter({ ...page, standaloneSections: ['Setup'] }, {}, 'test.mdx');
  for (const layer of ['defaults', 'enforced']) assert.throws(() => frontmatterLayers({ [layer]: { standaloneSections: ['Setup'] } }), /must stay page-specific/);
  assert.equal(frontmatterSchema({}).properties.standaloneSections.type, 'array');
});


test('sections carry only displayed root-level current-page reading paths and deduplicate views', () => {
  const doc = (id: string, language = 'en'): Document => ({ file: id, frontmatter: { id, title: id, summary: id, type: 'guide', slug: `/${id}`, access: { policy: 'public' } }, variant: { channel: 'production', version: 'current', language }, route: `/${id}`, markdownRoute: `/${id}.md`, body: '', tree: null });
  const source = doc('source'), before = doc('before'), after = doc('after'), foreign = doc('foreign', 'fr');
  after.frontmatter.subjectLifecycle = 'deprecated';
  const documents = new Map([source, before, after, foreign].map(doc => [`${doc.frontmatter.id}|production|current|${doc.variant.language}`, doc]));
  const relationships: Relationship[] = [
    { id: 'before', from: 'source', to: 'before', type: 'prerequisite', reason: 'Prepare credentials.', order: 2 },
    { id: 'after', from: 'source', to: 'after', type: 'next-step', reason: 'Continue if needed.', order: 1 },
    { id: 'foreign', from: 'source', to: 'foreign', type: 'prerequisite', reason: 'Foreign context.' },
    { id: 'draft', from: 'source', to: 'draft', type: 'prerequisite', reason: 'Private context.' },
    { id: 'reference', from: 'source', to: 'before', type: 'reference', reason: 'Look up details.' },
    { id: 'other-source', from: 'before', to: 'after', type: 'next-step', reason: 'Other page path.' }
  ];
  const edges = publicationRelationships(relationships, new Map([source, before, after].map(doc => [doc.frontmatter.id, doc])));
  const view = (request = {}) => ({ type: 'docCards', sourceFile: 'source', request: { component: 'RelatedReading', ...request } });
  const sections = (views: any[]) => {
    const tree = resolveCardTree(root([heading(2, 'Task'), paragraph(text('Do the task.')), heading(2, 'Paths'), ...views]), source, documents, edges, new Set(), { targets: [], queries: [] });
    return markdownSections(tree, '/source.md', 'background '.repeat(3000), '', renderMarkdown);
  };
  for (const layout of ['list', 'cards']) {
    const output = sections([view({ layout }), view({ relation: 'prerequisite' })]);
    assert.equal((output[0].content.match(/Prepare credentials/g) ?? []).length, 1);
    assert.match(output[0].content, /Continue if needed.*Status: deprecated/);
    assert.ok(output[0].content.indexOf('Read first') < output[0].content.indexOf('Next steps'));
    assert.doesNotMatch(output[0].content, /Look up details|Foreign context|Private context/);
    assert.doesNotMatch(output[1].content, /Page reading path/);
  }
  for (const views of [[view({ relatedTo: 'before' })], [{ type: 'blockquote', children: [view()] }], [view({ relation: 'reference' })], []]) {
    assert.doesNotMatch(sections(views)[0].content, /Page reading path|Prepare credentials|Continue if needed|Other page path/);
  }
  const tree = resolveCardTree(root([view({ relation: 'prerequisite' }), heading(2, 'Task'), paragraph(text('Body.'))]), source, documents, edges, new Set(), { targets: [], queries: [] });
  const withoutAnnotations = JSON.parse(JSON.stringify(tree), (key, value) => key === 'sectionReadingPath' ? undefined : value);
  assert.equal(contentDigest(source, tree, tree), contentDigest(source, withoutAnnotations, withoutAnnotations), 'section annotations do not restamp unchanged articles');
  const preamble = markdownSections(tree, '/source.md', 'background '.repeat(3000), '', renderMarkdown)[0].content;
  assert.equal((preamble.match(/Prepare credentials/g) ?? []).length, 1);
  assert.doesNotMatch(preamble, /Page reading path/);
});
