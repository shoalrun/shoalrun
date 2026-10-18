import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test, type TestContext } from 'node:test';
import { compile } from './compiler.js';
import { auditLinks } from './link-audit.js';
import { parsePlainMarkdown } from './semantic-markdown.js';

async function fixture(t: TestContext, body: string, basePath = '') {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-media-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const content = path.join(directory, 'content');
  await mkdir(content);
  const config = path.join(directory, 'docs.config.yaml');
  await writeFile(config, `schemaVersion: 1
site: { title: Media regression, basePath: '${basePath}' }
outputs: { html: { shareImages: false } }
publications:
  defaults: { channel: production, version: current, language: en }
  channels: { production: { pathPrefix: '' } }
  versions: { current: { pathPrefix: '' } }
  enabled: [{ channel: production, version: current }]
navigation: [{ id: start, doc: guide.start }]
`);
  const page = path.join(content, 'start.mdx');
  const frontmatter = `---
id: guide.start
title: Start
summary: Media examples.
type: guide
slug: /
channel: production
version: current
access: { policy: public }
---
`;
  await writeFile(page, frontmatter + '\n' + body + '\n');
  const output = path.join(directory, 'site');
  return { config, content, page, frontmatter, output, built: path.join(output, basePath) };
}

test('HTTPS Image and Hero URLs remain external when the site is mounted', async t => {
  const project = await fixture(t, `<Image src="https://images.example.test/photo.png" alt="Remote image" expand />

<Hero tagline="A remote illustration" image="https://images.example.test/hero.svg" imageAlt="Remote hero">
[Start](doc:guide.start)
</Hero>`, '/docs');
  await writeFile(project.page, (await readFile(project.page, 'utf8')).replace('type: guide', 'type: guide\nlayout: landing'));
  await compile(project.config, project.output);
  const html = await readFile(path.join(project.built, 'index.html'), 'utf8');
  const markdown = await readFile(path.join(project.built, 'index.md'), 'utf8');
  for (const name of ['photo.png', 'hero.svg']) {
    assert.ok(html.includes(`https://images.example.test/${name}`));
    assert.ok(markdown.includes(`https://images.example.test/${name}`));
  }
  assert.doesNotMatch(html + markdown, /\/docshttps:|\/docs\/https:/);
  assert.deepEqual((await auditLinks(project.output)).findings, []);
});

test('relative Markdown images publish their bytes and remain inline where authored', async t => {
  const project = await fixture(t, `Before ![Chart](./assets/chart.svg "Chart title") after.

![Chart again](./assets/chart.svg)

\`\`\`md
![Example only](./missing.svg)
\`\`\`
`, '/docs');
  await mkdir(path.join(project.content, 'assets'));
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" /></svg>';
  await writeFile(path.join(project.content, 'assets/chart.svg'), svg);
  const manifest = await compile(project.config, project.output);
  const html = await readFile(path.join(project.built, 'index.html'), 'utf8');
  const markdown = await readFile(path.join(project.built, 'index.md'), 'utf8');
  const imageURL = /<img[^>]*src="([^"]+)"[^>]*alt="Chart"/.exec(html)?.[1];
  assert.ok(imageURL, html);
  assert.ok(imageURL.startsWith('/docs/assets/pages/'), imageURL);
  assert.equal(await readFile(path.join(project.output, imageURL), 'utf8'), svg);
  assert.match(html, /Before <img[^>]*title="Chart title"[^>]*> after\./);
  assert.ok(markdown.includes(`![Chart](${imageURL} "Chart title")`), markdown);
  assert.ok(manifest.dependencies.some(file => file.endsWith('assets/chart.svg')));
  assert.deepEqual((await auditLinks(project.output)).findings, []);
  assert.equal(parsePlainMarkdown(markdown).find(node => node.type === 'code')?.value, '![Example only](./missing.svg)');
  await writeFile(project.page, project.frontmatter + '\n![Missing](./assets/missing.svg)\n');
  await assert.rejects(compile(project.config, project.output), /image.*not found/i);
});

test('standalone inline Math preserves Markdown block boundaries and inline Math stays inline', async t => {
  const project = await fixture(t, `## Before

A paragraph.

<Math expression="E=mc^2" />

## After

Energy is <Math expression="E=mc^2" />.

<Math display expression="c^2=a^2+b^2" />

\`\`\`sh
echo done
\`\`\`
`);
  await compile(project.config, project.output);
  const html = await readFile(path.join(project.built, 'index.html'), 'utf8');
  const markdown = await readFile(path.join(project.built, 'index.md'), 'utf8');
  const nodes = parsePlainMarkdown(markdown);
  assert.ok(nodes.some(node => node.type === 'heading' && node.children?.[0]?.value === 'After'), markdown);
  assert.match(markdown, /A paragraph\.\n\n`E=mc\^2`\n\n## After/);
  assert.match(markdown, /Energy is `E=mc\^2`\./);
  assert.deepEqual(nodes.filter(node => node.type === 'code').map(node => [node.lang, node.value]), [['latex', 'c^2=a^2+b^2'], ['sh', 'echo done']]);
  assert.match(html, /<p><span class="doc-math-inline">/);
  assert.match(html, /Energy is <span class="doc-math-inline">/);
});

test('Markdown image references, URL suffixes, and matching basenames keep distinct assets', async t => {
  const project = await fixture(t, `![First][chart]

![Second](./two/chart.svg)

![Spaced](./diagram%20one.svg#mark)

[chart]: ./one/chart.svg "First chart"
`, '/docs');
  const first = '<svg xmlns="http://www.w3.org/2000/svg"><text>First</text></svg>';
  const second = '<svg xmlns="http://www.w3.org/2000/svg"><text>Second</text></svg>';
  const spaced = '<svg xmlns="http://www.w3.org/2000/svg"><g id="mark" /></svg>';
  await mkdir(path.join(project.content, 'one'));
  await mkdir(path.join(project.content, 'two'));
  await writeFile(path.join(project.content, 'one/chart.svg'), first);
  await writeFile(path.join(project.content, 'two/chart.svg'), second);
  await writeFile(path.join(project.content, 'diagram one.svg'), spaced);
  await compile(project.config, project.output);
  const html = await readFile(path.join(project.built, 'index.html'), 'utf8');
  const markdown = await readFile(path.join(project.built, 'index.md'), 'utf8');
  const images = [...html.matchAll(/<img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"/g)];
  assert.equal(images.length, 3);
  assert.equal(new Set(images.map(image => image[1])).size, 3);
  for (const [index, expected] of [first, second, spaced].entries()) {
    assert.equal(await readFile(path.join(project.output, images[index][1].split(/[?#]/)[0]), 'utf8'), expected);
    assert.ok(markdown.includes(images[index][1]), markdown);
  }
  assert.ok(images[2][1].endsWith('#mark'));
  assert.deepEqual((await auditLinks(project.output)).findings, []);
});
