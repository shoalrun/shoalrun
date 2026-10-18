import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { compile } from './compiler.js';

test('authored representation blocks appear only in their selected output', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-representations-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const config = path.join(directory, 'docs.config.yaml');
  const page = path.join(directory, 'content', 'start.mdx');
  const output = path.join(directory, 'dist');
  await mkdir(path.dirname(page));
  await writeFile(config, `schemaVersion: 1
site: { title: Test docs }
publications:
  defaults: { channel: production, version: current, language: en }
  channels: { production: { pathPrefix: "" } }
  versions: { current: { pathPrefix: "" } }
  enabled: [{ channel: production, version: current }]
navigation: [{ id: start, doc: guide.start }]
`);
  const frontmatter = `---
id: guide.start
title: Start
type: guide
summary: Start here.
slug: /
channel: production
version: current
access: { policy: public }
---
`;
  await writeFile(page, `${frontmatter}
Shared paragraph.

<Only format="html">

Browser-only instructions. [Home](doc:guide.start).

</Only>

<Only format="markdown">

Agent-only instructions. [Home](doc:guide.start).

</Only>
`);
  await compile(config, output);
  const html = await readFile(path.join(output, 'index.html'), 'utf8');
  const markdown = await readFile(path.join(output, 'index.md'), 'utf8');
  assert.match(html, /Shared paragraph/);
  assert.match(markdown, /Shared paragraph/);
  assert.match(html, /Browser-only instructions/);
  assert.match(html, /Browser-only instructions\. <a href="\/">Home<\/a>/);
  assert.doesNotMatch(markdown, /Browser-only instructions|<Only/);
  assert.match(markdown, /Agent-only instructions/);
  assert.match(markdown, /\[Home\]\(\/index\.md\)/);
  assert.doesNotMatch(html, /Agent-only instructions|<Only/);

  await writeFile(page, `${frontmatter}
<Only format="html" reason="test">

Unsupported attribute.

</Only>
`);
  await assert.rejects(compile(config, output), /<Only> needs block content and one format attribute/);

  await writeFile(page, `${frontmatter}
<Only format="pdf">

Unsupported format.

</Only>
`);
  await assert.rejects(compile(config, output), /<Only> format must be html or markdown/);
});
