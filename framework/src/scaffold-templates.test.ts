import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import YAML from 'yaml';
import { compile } from './compiler.js';
import { scaffold } from './scaffold.js';

const placeholder = /\[\[TODO:[\s\S]*?\]\]/g;
const config = `schemaVersion: 1
site: { title: Example }
readerFilters:
  facets:
    audience: { label: Reader, options: { ui: Use the UI, developer: Build with the API } }
publications:
  defaults: { channel: production, version: current, language: en }
  channels: { production: { pathPrefix: "" } }
  versions: { current: { pathPrefix: "" } }
  enabled:
    - { channel: production, version: current }
`;
const apis = `apis:
  things:
    source: { kind: file, path: ./openapi.yaml }
    operations:
      - { id: things.create, sourceOperationId: createThing, reference: reference.create-thing }
`;
const openapi = `openapi: 3.1.0
info: { title: Things, version: "1" }
paths:
  /things:
    post:
      operationId: createThing
      summary: Create a thing
      responses: { "201": { description: Created } }
`;

async function project(extra = '') {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-scaffold-templates-'));
  await writeFile(path.join(root, 'docs.config.yaml'), config + extra);
  await writeFile(path.join(root, 'openapi.yaml'), openapi);
  return root;
}

const split = (source: string) => {
  const match = /^---\n([\s\S]*?)\n---\n\n([\s\S]*)$/.exec(source);
  assert.ok(match, 'page has frontmatter');
  return { header: match[1], frontmatter: YAML.parse(match[1]), body: match[2] };
};

for (const [template, type, icon] of [['how-to', 'how-to', 'book-open'], ['explanation', 'explanation', 'lightbulb'], ['guide', 'guide', 'book-open'], ['tutorial', 'tutorial', 'graduation-cap'], ['reference', 'reference', 'book-marked'], ['troubleshooting', 'troubleshooting', 'life-buoy']]) {
  test(`built-in ${template} template scaffolds commented frontmatter and stays a draft until every placeholder is resolved`, async () => {
    const root = await project();
    try {
      const configFile = path.join(root, 'docs.config.yaml');
      const target = path.join(root, `content/${template}/example-page.mdx`);
      await scaffold(configFile, template, target, { id: `${template}.example-page`, title: 'Example page', summary: 'Do the example.', slug: `/${template}/example-page` });
      const { header, frontmatter, body } = split(await readFile(target, 'utf8'));

      assert.equal(frontmatter.id, `${template}.example-page`);
      assert.equal(frontmatter.type, type);
      assert.deepEqual(frontmatter.access, { policy: 'draft' });
      assert.deepEqual(frontmatter.card, { icon });
      assert.match(frontmatter.description, /\[\[TODO:/);
      assert.match(frontmatter.tags[0], /\[\[TODO:/);
      assert.match(header, /^# Stable identity\./m, 'comments on scaffold-owned fields survive');
      assert.match(header, /^# audiences: /m, 'optional fields are commented out');
      assert.doesNotMatch(header, /^audiences:/m);
      assert.equal(header.split('\n').filter(line => /^\s+#/.test(line)).length, 0, 'no comment is indented under a nested mapping');

      const headings = [...body.matchAll(/^## (.+)$/gm)].map(match => match[1]);
      assert.ok(body.trimStart().startsWith('[[TODO: Write the introduction'), 'intro paragraph comes first, with no heading');
      assert.ok(headings.includes('HTML, Markdown, and agents'));
      assert.equal(headings.at(-1), 'Related reading');
      assert.match(body.trimEnd(), /<RelatedReading \/>$/);
      assert.ok(headings.indexOf('HTML, Markdown, and agents') < headings.indexOf('Related reading'));

      const output = path.join(root, 'dist');
      const draft = await compile(configFile, output);
      assert.equal(draft.documents.length, 0, 'drafts validate but are not published');

      const source = await readFile(target, 'utf8');
      await writeFile(target, source.replace('policy: draft', 'policy: public'));
      await assert.rejects(compile(configFile, output), /unresolved scaffold placeholders/);

      await writeFile(target, source.replace('policy: draft', 'policy: public').replace(/^summary: .*$/m, 'summary: Do the example.').replace(placeholder, 'Reviewed example content.'));
      const published = await compile(configFile, output);
      assert.equal(published.documents.find(doc => doc.id === `${template}.example-page`)?.url, `/${template}/example-page`);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
}

test('built-in API reference requires one known operation and supports a project override', async () => {
  const root = await project(apis);
  try {
    const configFile = path.join(root, 'docs.config.yaml');
    const target = path.join(root, 'content/create-thing.mdx');
    const input = { id: 'reference.create-thing', title: 'Create a thing', summary: 'Create a thing.', slug: '/create-thing' };
    await assert.rejects(scaffold(configFile, 'api-reference', target, input), /requires operations/);
    await assert.rejects(scaffold(configFile, 'api-reference', target, { ...input, operations: ['things.missing'] }), /Unknown scaffold operation/);
    await assert.rejects(scaffold(configFile, 'api-reference', target, { ...input, operations: ['things.create', 'things.create'] }), /exactly one operation/);
    await scaffold(configFile, 'api-reference', target, { ...input, operations: ['things.create'] });
    const source = await readFile(target, 'utf8');
    assert.equal(split(source).frontmatter.type, 'api-reference');
    assert.deepEqual(split(source).frontmatter.operations, ['things.create']);
    assert.equal((await compile(configFile, path.join(root, 'dist'))).documents.length, 0);
    await writeFile(path.join(root, 'custom.mdx'), 'Custom API context.\n');
    await writeFile(configFile, `${config}${apis}templates:\n  api-reference: { type: api-reference, body: ./custom.mdx, required: [operations] }\n`);
    const override = path.join(root, 'content/custom.mdx');
    await scaffold(configFile, 'api-reference', override, { ...input, id: 'reference.custom', slug: '/custom', operations: ['things.create'] });
    assert.equal(split(await readFile(override, 'utf8')).body, 'Custom API context.\n');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

for (const template of ['recipe', 'ingredient', 'cookbook']) {
  test(`built-in ${template} works without project registration and can be overridden`, async () => {
    const root = await project();
    try {
      const configFile = path.join(root, 'docs.config.yaml');
      const target = path.join(root, `content/${template}.mdx`);
      await scaffold(configFile, template, target, { id: `${template}.one`, title: 'Example', summary: 'Example task.', slug: `/${template}` });
      const source = await readFile(target, 'utf8');
      assert.equal(split(source).frontmatter.type, template);
      assert.match(source, /\[\[TODO:/);
      assert.equal((await compile(configFile, path.join(root, 'dist'))).documents.length, 0);
      await writeFile(target, source.replace('policy: draft', 'policy: public'));
      await assert.rejects(compile(configFile, path.join(root, 'dist')), /unresolved scaffold placeholders/);
      await writeFile(target, source.replace('policy: draft', 'policy: public').replace(placeholder, 'Reviewed task content.'));
      assert.equal((await compile(configFile, path.join(root, 'dist'))).documents.length, 1);

      await writeFile(path.join(root, 'custom.mdx'), 'Custom project outline.\n');
      await writeFile(configFile, `${config}templates:\n  ${template}: { type: ${template}, body: ./custom.mdx }\n`);
      const override = path.join(root, `content/${template}-custom.mdx`);
      await scaffold(configFile, template, override, { id: `${template}.custom`, title: 'Custom', summary: 'Custom.', slug: `/${template}-custom` });
      assert.equal(split(await readFile(override, 'utf8')).body, 'Custom project outline.\n');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
}

test('guide keeps procedure before reference and the optional blocks right after the introduction', async () => {
  const root = await project();
  try {
    const target = path.join(root, 'content/guide.mdx');
    await scaffold(path.join(root, 'docs.config.yaml'), 'guide', target, { id: 'guide.order', title: 'Order', summary: 'Order.', slug: '/order' });
    const headings = [...(await readFile(target, 'utf8')).matchAll(/^## (.+)$/gm)].map(match => match[1].replace(/^\[\[TODO: (Name the task)[\s\S]*$/, '$1'));
    assert.deepEqual(headings, ['Prerequisites', 'Considerations', 'Name the task', 'Check the result', 'Troubleshooting', 'Reference', 'HTML, Markdown, and agents', 'Related reading']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('scaffold adds operations after the template comments and validates them', async () => {
  const root = await project(apis);
  try {
    const configFile = path.join(root, 'docs.config.yaml');
    const target = path.join(root, 'content/guide.mdx');
    await scaffold(configFile, 'guide', target, { id: 'guide.things', title: 'Things', summary: 'Things.', slug: '/things', operations: ['things.create'] });
    const { header, frontmatter } = split(await readFile(target, 'utf8'));
    assert.deepEqual(frontmatter.operations, ['things.create']);
    assert.match(header, /^# operations: \[payments\.create\]$/m, 'the commented example stays');
    await assert.rejects(scaffold(configFile, 'guide', path.join(root, 'content/bad.mdx'), { id: 'guide.bad', title: 'Bad', summary: 'Bad.', slug: '/bad', operations: ['things.missing'] }), /Unknown scaffold operation/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('retired template names fail with a clear error', async () => {
  const root = await project();
  try {
    for (const name of ['developer-guide', 'unknown-template']) {
      await assert.rejects(scaffold(path.join(root, 'docs.config.yaml'), name, path.join(root, `content/${name}.mdx`), { id: `x.${name}`, title: 'X', summary: 'X.', slug: `/${name}` }), /Unknown template/);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('a project template can carry its own frontmatter, and malformed frontmatter fails before writing', async () => {
  const root = await project();
  try {
    await writeFile(path.join(root, 'docs.config.yaml'), `${config}templates:
  note: { type: note, body: ./templates/note.mdx }
  broken: { type: note, body: ./templates/broken.mdx }
  list: { type: note, body: ./templates/list.mdx }
`);
    await mkdir(path.join(root, 'templates'), { recursive: true });
    await writeFile(path.join(root, 'templates/note.mdx'), '---\n# Project comment.\nid: placeholder # keep me\naccess: { policy: public }\nowner: "[[TODO: Team name.]]"\n---\n\nBody.\n');
    await writeFile(path.join(root, 'templates/broken.mdx'), '---\nid: x\nBody without a closing line.\n');
    await writeFile(path.join(root, 'templates/list.mdx'), '---\n- a\n- b\n---\n\nBody.\n');
    const configFile = path.join(root, 'docs.config.yaml');
    const target = path.join(root, 'content/note.mdx');
    await scaffold(configFile, 'note', target, { id: 'note.one', title: 'One', summary: 'One.', slug: '/one' });
    const { header, frontmatter } = split(await readFile(target, 'utf8'));
    assert.equal(frontmatter.id, 'note.one');
    assert.deepEqual(frontmatter.access, { policy: 'draft' }, 'a template cannot publish a page');
    assert.equal(frontmatter.owner, '[[TODO: Team name.]]');
    assert.match(header, /^# Project comment\.$/m);
    assert.match(header, /^id: note\.one # keep me$/m);
    for (const name of ['broken', 'list']) {
      const file = path.join(root, `content/${name}.mdx`);
      await assert.rejects(scaffold(configFile, name, file, { id: `note.${name}`, title: 'X', summary: 'X.', slug: `/${name}` }), name === 'broken' ? /not closed/ : /must be a mapping/);
      await assert.rejects(readFile(file, 'utf8'), /ENOENT/);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
