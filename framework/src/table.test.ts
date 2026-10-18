import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { compile } from './compiler.js';

test('optional table controls preserve the full Markdown table', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-table-'));
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
<Table filter sticky>

| Name | Value |
| --- | --- |
| Alpha | One |
| Beta | Two |

</Table>
`);
  await compile(config, output);
  const html = await readFile(path.join(output, 'index.html'), 'utf8');
  const markdown = await readFile(path.join(output, 'index.md'), 'utf8');
  assert.match(html, /class="doc-table" data-table-filter/);
  assert.match(html, /class="doc-table-scroll doc-table-sticky" tabindex="0"/);
  assert.match(html, /<input type="search"/);
  assert.match(html, /src="\/assets\/table-filter\.js"/);
  assert.match(html, /<td>Alpha<\/td>/);
  assert.match(markdown, /\| Alpha\s+\| One\s+\|/);
  assert.match(markdown, /\| Beta\s+\| Two\s+\|/);
  assert.doesNotMatch(markdown, /<Table|Filter rows|Showing \d/);

  await writeFile(page, `${frontmatter}
<Table filter="true">

| Name | Value |
| --- | --- |
| Alpha | One |

</Table>
`);
  await assert.rejects(compile(config, output), /<Table> only accepts bare filter and sticky attributes/);
});
