import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import type { AddressInfo } from 'node:net';
import { ApiReader } from './api.js';
import { compile } from './compiler.js';
import { createSiteServer } from './server.js';
import { renderHtml, renderMarkdown, root, parsePlainMarkdown } from './content.js';
import { resolveCalloutTypes } from './callouts.js';

test('hostile imported prose stays inert in HTML, Markdown, and discovery output', async t => {
  const directory = await mkdtemp(path.join(tmpdir(), 'shoalrun-hostile-prose-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(path.join(directory, 'content'));
  const attack = '<img src=x onerror="globalThis.__shoalrunAttack=1">';
  const sourceFile = path.join(directory, 'openapi.yaml');
  const source = `openapi: 3.1.0
info: { title: Hostile fixture, version: '1' }
paths:
  /items:
    get:
      operationId: listItems
      summary: ${JSON.stringify(attack)}
      description: |
        <script>globalThis.__shoalrunAttack=1</script>
        Safe **description**.
      responses:
        '200':
          description: Items returned.
          content:
            application/json:
              examples:
                hostile:
                  value: { message: ${JSON.stringify(attack)} }
`;
  await writeFile(sourceFile, source);
  await writeFile(path.join(directory, 'content/hostile.mdx'), `---
id: guide.hostile
title: ${JSON.stringify(attack)}
summary: An authored page with hostile metadata.
type: guide
slug: /hostile
channel: production
version: current
language: en
releaseVersion: ${JSON.stringify(attack)}
access: { policy: public }
---

Safe authored body.
`);
  const configFile = path.join(directory, 'docs.config.yaml');
  await writeFile(configFile, JSON.stringify({
    schemaVersion: 1,
    site: { title: attack, contentDir: 'content' },
    publications: { defaults: { channel: 'production', version: 'current', language: 'en' }, channels: { production: { pathPrefix: '' } }, versions: { current: { pathPrefix: '' } }, enabled: [{ channel: 'production', version: 'current', language: 'en' }] },
    apis: { demo: { source: { kind: 'file', path: './openapi.yaml' }, generateReferences: { include: ['listItems'] } } }
  }));
  const output = path.join(directory, 'site');
  const result = await compile(configFile, output, {}, { apiReview: 'report' });
  const page = result.documents.find((item: any) => item.type === 'api-reference')!;
  const html = await readFile(path.join(output, page.url, 'index.html'), 'utf8');
  const markdown = await readFile(path.join(output, page.markdownUrl), 'utf8');
  const discovery = await readFile(path.join(output, 'llms.txt'), 'utf8');
  const authoredMarkdown = await readFile(path.join(output, 'hostile.md'), 'utf8');
  assert.doesNotMatch(html, /<img[^>]*onerror|<script>globalThis\.__shoalrunAttack/);
  assert.match(html, /&lt;img src=x onerror=/);
  assert.doesNotMatch(markdown.replace(/```[^\n]*\n[\s\S]*?```/g, ''), /<script>|(?<!\\)<img src=x/);
  assert.match(markdown, /\\<img src=x onerror=/);
  assert.doesNotMatch(discovery, /(?<!\\)<img src=x/);
  assert.match(discovery, /\\<img src=x onerror=/);
  assert.doesNotMatch(authoredMarkdown, /(?<!\\)<img src=x/);
  assert.match(authoredMarkdown, /\*\*Version: \\<img src=x/);
  assert.match(markdown, /Safe \*\*description\*\*/);
  assert.equal(renderHtml(root(parsePlainMarkdown('<style>body{background:url(javascript:alert(1))}</style>\n\nSafe'))), '<p>Safe</p>');
  assert.doesNotMatch(renderMarkdown(root(parsePlainMarkdown('<script>alert(1)</script>'))), /<script>/);
  assert.throws(() => resolveCalloutTypes({ tones: { hostile: { line: 'url(javascript:alert(1))', background: '#fff', text: '#000' } } }, configFile), /must be a hex color/);

  await writeFile(sourceFile, source.replace('Safe **description**.', '[unsafe](javascript:alert(1))'));
  await assert.rejects(compile(configFile, output, {}, { apiReview: 'report' }), /Unsafe URL/);
  await writeFile(sourceFile, source);
  await writeFile(path.join(directory, 'content/hostile.mdx'), `---\nid: guide.hostile\ntitle: Hostile\nsummary: Raw HTML test.\ntype: guide\nslug: /hostile\nchannel: production\nversion: current\nlanguage: en\naccess: { policy: public }\n---\n\n<script>globalThis.__shoalrunAttack=1</script>\n`);
  await assert.rejects(compile(configFile, output, {}, { apiReview: 'report' }), /no semantic\/Markdown adapter/);
});

test('local OpenAPI references stay inside the source directory or configured project', async t => {
  const directory = await mkdtemp(path.join(tmpdir(), 'shoalrun-ref-boundary-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const sourceDirectory = path.join(directory, 'source');
  await mkdir(sourceDirectory);
  const sourceFile = path.join(sourceDirectory, 'openapi.yaml');
  const insideFile = path.join(sourceDirectory, 'model.yaml');
  const dottedFile = path.join(sourceDirectory, '..model.yaml');
  const outsideFile = path.join(directory, 'private.yaml');
  await writeFile(sourceFile, 'openapi: 3.1.0\n');
  await writeFile(insideFile, 'type: string\n');
  await writeFile(dottedFile, 'type: number\n');
  await writeFile(outsideFile, 'private: true\n');
  await symlink(outsideFile, path.join(sourceDirectory, 'linked.yaml'));

  const reader = new ApiReader();
  const source = await reader.load(sourceFile);
  assert.equal((await reader.ref(source, './model.yaml')).value.type, 'string');
  assert.equal((await reader.ref(source, './..model.yaml')).value.type, 'number');
  await assert.rejects(reader.ref(source, '../private.yaml'), /Local \$ref escapes/);
  await assert.rejects(reader.ref(source, './linked.yaml'), /Local \$ref escapes/);
  await assert.rejects(reader.ref(source, outsideFile), /Absolute local \$ref/);

  const projectReader = new ApiReader(directory);
  const projectSource = await projectReader.load(sourceFile);
  assert.equal((await projectReader.ref(projectSource, '../private.yaml')).value.private, true);
});

test('local site server cannot serve a symlink outside the built site', async t => {
  const directory = await mkdtemp(path.join(tmpdir(), 'shoalrun-server-boundary-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const site = path.join(directory, 'site');
  await mkdir(site);
  await writeFile(path.join(site, 'documents.json'), '{"documents":[]}');
  await writeFile(path.join(site, 'resource-headers.json'), '{}');
  await writeFile(path.join(directory, 'private.txt'), 'private data');
  await symlink(path.join(directory, 'private.txt'), path.join(site, 'leak.txt'));
  await writeFile(path.join(site, 'hostile.svg'), '<svg xmlns="http://www.w3.org/2000/svg"><script>globalThis.__shoalrunAttack=1</script></svg>');
  const server = await createSiteServer(site);
  t.after(() => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => { server.off('error', reject); resolve(); });
  });
  const response = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/leak.txt`);
  assert.equal(response.status, 404);
  assert.doesNotMatch(await response.text(), /private data/);
  const svg = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/hostile.svg`);
  assert.equal(svg.status, 200);
  assert.equal(svg.headers.get('content-security-policy'), 'sandbox');
  assert.equal(svg.headers.get('x-content-type-options'), 'nosniff');
});

test('public API output needs a digest pinned to its source and selected pages', async t => {
  const directory = await mkdtemp(path.join(tmpdir(), 'shoalrun-api-review-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const content = path.join(directory, 'content');
  await mkdir(content);
  const sourceFile = path.join(directory, 'openapi.yaml');
  const source = `openapi: 3.1.0
info: { title: Review fixture, version: '1' }
paths:
  /items:
    get:
      operationId: listItems
      description: Imported description.
      responses: { '200': { description: Items returned. } }
  /items/{id}:
    get:
      operationId: getItem
      responses: { '200': { description: Item returned. } }
`;
  await writeFile(sourceFile, source);
  const configFile = path.join(directory, 'docs.config.yaml');
  const config: any = {
    schemaVersion: 1,
    site: { title: 'Review fixture', contentDir: 'content' },
    publications: { defaults: { channel: 'production', version: 'current', language: 'en' }, channels: { production: { pathPrefix: '' } }, versions: { current: { pathPrefix: '' } }, enabled: [{ channel: 'production', version: 'current', language: 'en' }] },
    apis: { demo: { source: { kind: 'file', path: './openapi.yaml', focused: true }, generateReferences: { include: ['listItems'] } } }
  };
  const saveConfig = () => writeFile(configFile, JSON.stringify(config));
  await saveConfig();
  const output = path.join(directory, 'site');
  await assert.rejects(compile(configFile, output), /publicReview.digest is missing/);
  const reviewed = await compile(configFile, output, {}, { apiReview: 'report' });
  assert.equal(reviewed.apiPublicationReview[0].pages.length, 1);
  assert.equal(reviewed.apiPublicationReview[0].focusedContracts.length, 1);
  assert.equal(reviewed.apiPublicationReview[0].fullSources.length, 0);
  config.apis.demo.publicReview = { digest: reviewed.apiPublicationReview[0].digest };
  await saveConfig();
  await compile(configFile, output);

  await writeFile(sourceFile, source.replace('Imported description.', 'Changed imported description.'));
  await assert.rejects(compile(configFile, output), /publicReview.digest is stale/);
  await writeFile(sourceFile, source);
  config.apis.demo.generateReferences.include = ['listItems', 'getItem'];
  await saveConfig();
  await assert.rejects(compile(configFile, output), /publicReview.digest is stale/);
});
