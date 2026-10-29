import assert from 'node:assert/strict';
import test from 'node:test';
import { parse, renderMarkdown } from './semantic-markdown.js';
import { lowerSectionMarkers, sectionIdentities, selectSection, validateStandaloneSections, validateStandaloneSectionDeclarations } from './section-identity.js';
import { renderHtmlWithHeadings } from './html-renderer.js';
import { transformMdx } from './component-transform.js';
import { markdownSections } from './markdown-sections.js';

const tree = (source: string) => lowerSectionMarkers(parse.parse(source));
const approval = (id: string) => [{ id, context: 'section' as const }];

test('section identities default to existing heading slugs and explicit identities survive renaming', () => {
  assert.deepEqual(sectionIdentities(tree('## Café\n\nText.\n\n## Café')).map(item => item.id), ['cafe', 'cafe-2']);
  for (const title of ['Request a refund', 'Refund policy']) {
    const source = tree(`## ${title} <Anchor id="refunds" />\n\nBody.`);
    assert.equal(sectionIdentities(source)[0].id, 'refunds');
    assert.equal(sectionIdentities(source)[0].explicit, true);
    assert.equal(renderMarkdown(source), `## ${title}\n\nBody.\n`);
  }
  assert.equal(sectionIdentities(tree('Setext <Anchor id="setext-id" />\n---'))[0].id, 'setext-id');
});

test('anchors preserve existing HTML heading IDs and reject stealing another anchor', () => {
  const rendered = renderHtmlWithHeadings(tree('## Request a refund <Anchor id="refunds" />\n\nBody.'));
  assert.match(rendered.html, /<span id="refunds" aria-hidden="true"><\/span><h2 id="request-a-refund">/);
  assert.equal(rendered.headings[0].id, 'request-a-refund');
  assert.doesNotMatch(rendered.html, /data-shoalrun|dataShoalrun/);
  assert.throws(() => renderHtmlWithHeadings(tree('## Request a refund <Anchor id="main" />'), undefined, ['main']), /conflicts/);
  assert.throws(() => renderHtmlWithHeadings(tree('## Title <Anchor id="nested" />\n\n### Nested')), /conflicts/);
  assert.throws(() => sectionIdentities(tree('## Title <Anchor id="other" />\n\n## Other')), /conflicts/);
  assert.throws(() => sectionIdentities(tree('## First <Anchor id="same" />\n\n## Second <Anchor id="same" />')), /duplicate/);
});

test('anchor syntax is literal heading metadata and does not consume code examples', () => {
  for (const source of [
    '## Title <Anchor id={"refunds"} />', '## Title <Anchor id="refunds" extra="x" />',
    '## Title <Anchor id="refunds"> </Anchor>', '## Title <Anchor id="refunds" /> more',
    '## **Title <Anchor id="refunds" />**', '## [Title <Anchor id="refunds" />](https://example.com)',
    '## <Anchor id="refunds" />', '### Title <Anchor id="refunds" />',
    '<Anchor id="refunds" />', '<Only format="html">\n\n## Title <Anchor id="refunds" />\n\n</Only>',
    '## Title <Anchor id="a" /><Anchor id="b" />', '## Title <Anchor id="../bad" />',
  ]) assert.throws(() => tree(source), /Anchor|anchored heading/);
  const source = '## `<Anchor id="refunds" />`\n\n```mdx\n## Example <Anchor id="refunds" />\n```';
  assert.equal(renderMarkdown(tree(source)), renderMarkdown(parse.parse(source)));
});

test('slice approval supports derived IDs and does not reinterpret legacy titles', () => {
  const source = tree('Preamble.\n\n## Setup\n\nDo it.\n\n### Check\n\nVerify.\n\n## Other\n\nBackground.');
  assert.throws(() => selectSection(source, 'setup', ['Setup']), /approval/);
  const selected = selectSection(source, 'setup', approval('setup'));
  assert.equal(renderMarkdown(selected.tree), '## Setup\n\nDo it.\n\n### Check\n\nVerify.\n');
  assert.throws(() => validateStandaloneSections(source, ['Setup', ...approval('setup')]), /same heading/);
  assert.throws(() => validateStandaloneSections(source, approval('absent')), /exactly one/);
  for (const value of [[{ id: 'setup' }], [{ id: 'setup', context: 'page' }], [{ id: 'setup', context: 'section', extra: true }], [{ id: '../bad', context: 'section' }]]) assert.throws(() => validateStandaloneSectionDeclarations(value), /standaloneSections/);
  const contextual = markdownSections(source, '/page.md', 'background '.repeat(3000), '', renderMarkdown, approval('setup'));
  assert.match(contextual[0].content, /Preamble/);
  assert.match(contextual[0].content, /Parent page/);
  assert.equal(contextual[0].standalone, true);
  assert.deepEqual(markdownSections(source, '/page.md', 'short', '', renderMarkdown, approval('setup')), []);
});

test('section references include only transitive parent definitions and reject ambiguous definitions', () => {
  const source = tree('## Setup\n\nSee [guide][g] and note[^n].\n\n## Other\n\n[g]: https://example.com/guide\n[unused]: https://example.com/unused\n[^n]: See [details][d].\n[d]: https://example.com/details');
  const content = renderMarkdown(selectSection(source, 'setup', approval('setup')).tree);
  assert.match(content, /https:\/\/example.com\/guide/);
  assert.match(content, /https:\/\/example.com\/details/);
  assert.doesNotMatch(content, /unused|## Other/);
  const ambiguous = tree('## Setup\n\n[link][g]\n\n[g]: https://example.com/one\n\n## Other\n\n[g]: https://example.com/two');
  assert.throws(() => selectSection(ambiguous, 'setup', approval('setup')), /ambiguous definition/);
});

test('component lowering consumes root markers but keeps snippet headings prohibited', () => {
  const page: any = { file: 'page.mdx', frontmatter: { id: 'page' }, variant: { channel: 'production', version: 'current', language: 'en' } };
  const lowered = transformMdx(parse.parse('## Title <Anchor id="stable" />'), page, new Map());
  assert.equal(sectionIdentities(lowered)[0].id, 'stable');
  const snippets = new Map([['example', { file: 'snippet.mdx', tree: parse.parse('## Heading'), variables: {} }]]);
  assert.throws(() => transformMdx(parse.parse('<Snippet id="example" />'), page, new Map(), snippets), /snippet headings/);
});
