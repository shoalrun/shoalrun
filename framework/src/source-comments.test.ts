import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { parse, renderMarkdown } from './semantic-markdown.js';
import { sourceCommentRanges } from './source-comments.js';
import { hasScaffoldPlaceholders } from './scaffold-placeholders.js';
import { transformMdx } from './component-transform.js';
import { compile } from './compiler.js';
import { exportContent } from './content-export.js';
import { captureSnapshotInputs } from './authoring-snapshot.js';

const words = (node: any): string => node.value ?? (node.children ?? []).map(words).join('');

test('source comments are omitted during parse, with original ranges and positions', () => {
  const source = '<!-- hidden\r\n\r\n## hidden heading\r\n-->\r\n{/* hidden jsx */}\r\n## Visible\r\n\r\na<!-- hidden -->b{/* hidden */}c';
  const tree: any = parse.parse(source);
  assert.equal(tree.children.length, 2);
  assert.equal(words(tree.children[0]), 'Visible');
  assert.equal(tree.children[0].position.start.line, 6);
  assert.equal(tree.children[0].position.start.offset, source.indexOf('## Visible'));
  assert.equal(words(tree.children[1]), 'abc');
  assert.equal(sourceCommentRanges(tree).length, 4);
  for (const [start, end] of sourceCommentRanges(tree)) assert.match(source.slice(start, end), /^(?:<!--|\{\/\*)/);
  assert.doesNotMatch(JSON.stringify(tree), /hidden|sourceComment|estree/);
});

test('comments work in containers, component children, headings, and beside prose', () => {
  for (const source of [
    '> <!-- hidden\n>\n> hidden -->\n> Visible',
    '- <!-- hidden -->\n  Visible',
    '<Note>\n<!-- hidden -->\n\nVisible{/* hidden */}\n</Note>',
    '## Vis<!-- hidden -->ible{/* hidden */}',
    '<!-- hidden -->Visible',
    '<!-- hidden\n\nhidden --> **Visible**',
    'Vis<!-- hidden\nhidden -->ible',
    'Vis{/* hidden\nhidden */}ible',
    '<!-- hidden --><!-- hidden -->Visible'
  ]) {
    const tree: any = parse.parse(source);
    assert.equal(words(tree).trim(), 'Visible', source);
    assert.doesNotMatch(JSON.stringify(tree), /hidden/, source);
  }
});

test('multiline block comments can end at EOF without a trailing newline', () => {
  for (const source of ['<!-- a\nb -->', '<!-- a\n\nb -->', '{/* a\n\nb */}']) {
    assert.deepEqual(parse.parse(source).children, []);
  }
});

test('trailing prose uses normal paragraph, heading, and Markdown continuation rules', () => {
  const paragraph: any = parse.parse('<!-- hidden -->foo\nbar');
  assert.equal(paragraph.children.length, 1);
  assert.equal(words(paragraph.children[0]), 'foo\nbar');
  for (const underline of ['===', '---']) {
    const tree: any = parse.parse(`<!-- hidden -->foo\n${underline}`);
    assert.equal(tree.children.length, 1);
    assert.equal(tree.children[0].type, 'heading');
    assert.equal(words(tree.children[0]), 'foo');
  }
  for (const source of ['<!-- one --><!-- two\nmore --> after', '<!-- one -->{/* two\nmore */} after']) {
    const tree: any = parse.parse(source);
    assert.equal(tree.children.length, 1);
    assert.equal(words(tree).trim(), 'after');
    assert.equal(sourceCommentRanges(tree).length, 2);
  }
});

test('inline comments are opaque across paragraph, heading, list, and invalid MDX boundaries', () => {
  for (const hidden of ['hidden\n\ntext', 'hidden\n# heading\ntext', 'hidden\n- list\ntext', '\n<Invalid {\n# hidden\n\n', '\n~~~\n\n']) {
    for (const wrap of [(body: string) => `<!-- ${body} -->`, (body: string) => `{/* ${body} */}`]) {
      const source = `before ${wrap(hidden)} after`;
      const tree: any = parse.parse(source);
      assert.equal(tree.children.length, 1, source);
      assert.equal(words(tree), 'before  after', source);
      assert.equal(tree.children[0].children.at(-1).position.start.offset, source.lastIndexOf(' after'));
    }
  }
  const source = 'before <!--\n~~~\n--> after\n\n~~~mdx\n<!-- literal -->\n~~~';
  const tree: any = parse.parse(source);
  assert.equal(words(tree.children[0]), 'before  after');
  assert.equal(tree.children[1].value, '<!-- literal -->');
});

test('normalization preserves real code contexts after comment and attribute payloads', () => {
  const source = '<!--\n~~~\n-->\n~~~mdx\n<!-- literal -->\n~~~';
  assert.equal((parse.parse(source).children[0] as any).value, '<!-- literal -->');
  const attribute = '<Note title="\n~~~\n">\n~~~mdx\n<!-- literal -->\n~~~\n</Note>';
  const tree: any = parse.parse(attribute);
  assert.deepEqual(sourceCommentRanges(tree), []);
  assert.equal(tree.children[0].children[0].value, '<!-- literal -->');
  for (const code of ['> ~~~mdx\n> <!-- literal -->\n> ~~~~', '- ```mdx\n  {/* literal */}\n  ````', '``multiple ` ticks <!-- literal -->``']) {
    const parsed = parse.parse(code);
    assert.deepEqual(sourceCommentRanges(parsed), []);
    assert.match(words(parsed), /literal/);
  }
  const unmatched: any = parse.parse('Unmatched `\n\n<!-- hidden -->\n\nLater `.');
  assert.equal(unmatched.children.length, 2);
  assert.doesNotMatch(words(unmatched), /hidden/);
  assert.match(words(unmatched), /Unmatched `Later `\./);
  const expressions: any = parse.parse('<Note values={{example:"<!-- literal -->"}}>Body</Note>');
  assert.deepEqual(sourceCommentRanges(expressions), []);
  assert.equal(expressions.children[0].children[0].attributes[0].value.data.estree.body[0].expression.properties[0].value.value, '<!-- literal -->');
});

test('positions and diagnostics after normalized comments refer to original CRLF source', () => {
  const prefix = '<!--\r\nhidden\r\n-->\r\n\r\n';
  const tree: any = parse.parse(prefix + '<Note values={{x:1}} />');
  const element = tree.children[0];
  assert.equal(element.position.start.line, 5);
  assert.equal(element.position.start.offset, prefix.length);
  const expression = element.attributes[0].value.data.estree.body[0].expression;
  assert.equal(expression.loc.start.line, 5);
  assert.equal(expression.loc.start.column, 14);
  assert.equal(expression.loc.start.offset, prefix.length + 14);
  assert.throws(() => parse.parse({ value: prefix + '<Note bad=>', path: 'page.mdx' }), (error: any) => {
    assert.equal(error.line, 5);
    assert.equal(error.column, 11);
    assert.equal(error.place.offset, prefix.length + 10);
    assert.match(error.message, /page\.mdx: 5:11:/);
    return true;
  });
  const spaced = parse.parse('{ /* hidden */ }\nVisible');
  assert.doesNotMatch(words(spaced), /hidden/);
  assert.equal(sourceCommentRanges(spaced).length, 1);
});

test('multiline JSX attributes remain literal across blank lines and adjacent tags', () => {
  for (const value of ['<!-- literal -->', '{/* literal */}', 'a\n\n<!-- literal -->\n\nb', '{/* unclosed', '<!-- unclosed', 'hello\n## heading\n<!-- literal -->']) {
    const source = `<Note\n\n title="${value}" />`;
    const tree: any = parse.parse(source);
    assert.equal(tree.children[0].attributes[0].value, value);
    assert.deepEqual(sourceCommentRanges(tree), []);
  }
  const source = '<Note title="\n\n<!-- literal -->\n\n"><Inner title="{/* literal */}" /></Note>';
  const tree: any = parse.parse(source);
  assert.equal(tree.children[0].attributes[0].value, '\n\n<!-- literal -->\n\n');
  assert.equal(tree.children[0].children[0].attributes[0].value, '{/* literal */}');
  assert.deepEqual(sourceCommentRanges(tree), []);
  const inline: any = parse.parse('before <Note title="literal\n{/* literal */}" /> after');
  assert.equal(inline.children[0].children[1].attributes[0].value, 'literal\n{/* literal */}');
  assert.deepEqual(sourceCommentRanges(inline), []);
  for (const source of ['`one\n{/* literal */}`', '`one\ntext <!-- literal -->`']) {
    const code: any = parse.parse(source);
    assert.deepEqual(sourceCommentRanges(code), []);
    assert.equal(code.children[0].children[0].type, 'inlineCode');
    assert.match(code.children[0].children[0].value, /literal/);
  }
});

test('code examples, escaped openers, and attribute strings remain literal', () => {
  const source = '```mdx\n<!-- literal -->\n{/* literal */}\n```\n\n`<!-- literal -->` and `{/* literal */}`\n\n\\<!-- escaped -->\n\n<Note title="<!-- attribute --> {/* attribute */}">Body</Note>';
  const tree: any = parse.parse(source);
  assert.deepEqual(sourceCommentRanges(tree), []);
  assert.equal(tree.children[0].value, '<!-- literal -->\n{/* literal */}');
  const markdown = renderMarkdown({ type: 'root', children: tree.children.slice(0, 3) });
  assert.match(markdown, /<!-- literal -->/);
  assert.match(markdown, /\{\/\* literal \*\/\}/);
  assert.equal(tree.children.at(-1).children[0].attributes[0].value, '<!-- attribute --> {/* attribute */}');
});

test('malformed comments report their opener, and actual expressions remain rejected', () => {
  assert.throws(() => parse.parse({ value: 'Visible\n\n<!-- unclosed', path: 'page.mdx' }), /page\.mdx: Unclosed HTML comment at 3:1/);
  assert.throws(() => parse.parse('{/* unclosed'), /Unclosed JSX comment/);
  const page = { file: 'page.mdx', frontmatter: {}, variant: {} } as any;
  for (const source of ['{}', '{42}', '{/* note */ 42}']) {
    assert.throws(() => transformMdx(parse.parse(source), page, new Map()), /dynamic MDX expression/);
  }
  assert.throws(() => parse.parse('<script>invalid raw HTML</script>\n\n<!-- unclosed'), /Unclosed HTML comment/);
});

test('scaffold placeholders ignore source comments while retaining visible checks', () => {
  assert.equal(hasScaffoldPlaceholders('<!-- [[TODO: hidden]] -->\n\n{/* [[TODO: hidden]] */}'), false);
  assert.equal(hasScaffoldPlaceholders('<!-- [[TODO: hidden]] -->\n\n[[TODO: visible]]'), true);
  assert.equal(hasScaffoldPlaceholders('```md\n<!-- [[TODO: literal]] -->\n```'), false);
});

test('builds and content exports omit comments and never resolve hidden dependencies', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-comments-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const config = path.join(directory, 'docs.config.yaml');
  const output = path.join(directory, 'dist');
  const content = path.join(directory, 'content', 'start.mdx');
  const snippet = path.join(directory, 'snippet.mdx');
  await mkdir(path.dirname(content));
  await writeFile(config, `schemaVersion: 1
site: { title: Comment docs }
publications:
  defaults: { channel: production, version: current, language: en }
  channels: { production: { pathPrefix: "" } }
  versions: { current: { pathPrefix: "" } }
  enabled: [{ channel: production, version: current }]
navigation: [{ id: start, doc: guide.start }]
snippets:
  example: { file: ./snippet.mdx }
exports:
  help:
    formats: [html, markdown]
    resources:
      - { kind: page, documentId: guide.start }
      - { kind: section, documentId: guide.start, sectionId: visible }
      - { kind: snippet, id: example, snippetId: example, title: Example, summary: Visible snippet. }
`);
  const hidden = `COMMENT_SENTINEL
## Hidden heading
[Missing](doc:missing)
![Missing](./missing.png)
<Unknown />
<Snippet id="missing" />
<Walkthrough file="../missing-source.ts" />
[[TODO: hidden]]`;
  const source = `---
id: guide.start
title: Start
type: guide
summary: Start here.
slug: /
channel: production
version: current
language: en
standaloneSections: [{ id: visible, context: section }]
access: { policy: public }
---
<!-- test {"testId":"COMMENT_SENTINEL"} -->
<!-- ${hidden} -->
{/* ${hidden} */}
## Visible

Visible page text.

<Snippet id="example" />

Inline <!-- COMMENT_SENTINEL -->content{/* COMMENT_SENTINEL */} stays.

\`<!-- literal example -->\` and \`{/* literal example */}\`.

\`\`\`mdx
<!-- fenced example -->
{/* fenced example */}
\`\`\`
`;
  const snippetSource = `<!-- ${hidden} -->\n{/* ${hidden} */}\nVisible snippet text.\n`;
  await writeFile(content, source);
  await writeFile(snippet, snippetSource);
  const captured = await captureSnapshotInputs(config);
  assert.ok(!captured.inputs.some(input => input.file.includes('missing')));
  await compile(config, output);
  const files: string[] = [];
  const inspect = async (directory: string) => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) await inspect(file);
      else if (/\.(?:html|md|txt|json)$/.test(entry.name)) {
        files.push(file);
        assert.doesNotMatch(await readFile(file, 'utf8'), /COMMENT_SENTINEL|Hidden heading|missing-source|doc:missing/, file);
      }
    }
  };
  await inspect(output);
  assert.ok(files.some(file => file.endsWith('search-index.json')));
  assert.ok(files.some(file => file.endsWith('llms.txt')));
  assert.ok(files.some(file => file.endsWith('documents.json')));
  const markdown = await readFile(path.join(output, 'index.md'), 'utf8');
  assert.match(markdown, /Visible page text/);
  assert.match(markdown, /Visible snippet text/);
  assert.match(markdown, /Inline content stays/);
  assert.match(markdown, /<!-- literal example -->/);
  assert.match(markdown, /\{\/\* literal example \*\/\}/);
  assert.match(markdown, /<!-- fenced example -->/);
  assert.match(markdown, /\{\/\* fenced example \*\/\}/);
  const exported = path.join(directory, 'export');
  await exportContent(config, exported, { target: 'help' });
  await inspect(exported);
  const manifest = JSON.parse(await readFile(path.join(exported, 'manifest.json'), 'utf8'));
  assert.equal(manifest.resources.length, 3);
  for (const resource of manifest.resources) {
    assert.deepEqual(resource.externalDependencies, []);
    for (const representation of Object.values(resource.representations) as any[]) {
      assert.match(await readFile(path.join(exported, representation.path), 'utf8'), /Visible snippet text/);
    }
  }
  assert.equal(await readFile(content, 'utf8'), source);
  assert.equal(await readFile(snippet, 'utf8'), snippetSource);
});
