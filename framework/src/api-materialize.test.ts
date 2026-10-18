import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { materializeApiPages } from './api-materialize.js';
import { compile } from './compiler.js';

test('one-time API MDX drafts are idempotent and can replace generated references in custom navigation order', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-api-materialize-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'content'));
  const config = path.join(root, 'docs.config.yaml');
  const output = path.join(root, 'dist');
  const configText = `schemaVersion: 1
site: { title: Test API }
publications:
  defaults: { channel: production, version: current, language: en }
  channels: { production: { pathPrefix: "" } }
  versions: { current: { pathPrefix: "" } }
  enabled: [{ channel: production, version: current }]
apis:
  widgets:
    source: { kind: file, path: ./widgets.yaml }
    generateReferences: true
navigation:
  - id: widgets
    label: Widgets
    items:
      - { id: query-widgets, operation: widgets.queryWidgets }
      - { id: other-widgets, api: widgets, generated: tags }
`;
  await writeFile(config, configText);
  await writeFile(path.join(root, 'widgets.yaml'), `openapi: 3.1.0
info: { title: Widgets, version: '1' }
paths:
  /widgets:
    get:
      operationId: listWidgets
      tags: [Widgets]
      summary: List widgets
      responses: { '200': { description: Listed. } }
  /Query/widgets:
    get:
      operationId: queryWidgets
      tags: [Query]
      summary: Query widgets
      responses: { '200': { description: Queried. } }
`);
  const first = await materializeApiPages(config, 'widgets', { routes: ['GET /Query/widgets'] });
  assert.equal(first.written.length, 1);
  const file = first.written[0];
  const draft = await readFile(file, 'utf8');
  assert.match(draft, /id: reference\.widgets\.queryWidgets/);
  assert.match(draft, /operations:\n  - widgets\.queryWidgets/);
  assert.match(draft, /policy: draft/);
  const again = await materializeApiPages(config, 'widgets', { routes: ['GET /Query/widgets'] });
  assert.deepEqual(again.written, []);
  assert.deepEqual(again.skipped, [file]);
  assert.equal(await readFile(file, 'utf8'), draft);
  await assert.rejects(materializeApiPages(config, 'widgets', { routes: ['GET /missing'] }), /Unknown API route/);
  const initial = await compile(config, output, {}, { apiReview: 'report' });
  assert.equal(initial.documents.filter(doc => doc.id === 'reference.widgets.queryWidgets').length, 1);
  await writeFile(file, draft.replace('policy: draft', 'policy: public').replace(/\[\[TODO:[^\]]+\]\]/, 'Use this route to query widgets by filter.'));
  const published = await compile(config, output, {}, { apiReview: 'report' });
  assert.equal(published.documents.filter(doc => doc.id === 'reference.widgets.queryWidgets').length, 1);
  const queryRoute = published.documents.find(doc => doc.id === 'reference.widgets.queryWidgets')?.url;
  assert.ok(queryRoute);
  const html = await readFile(path.join(output, queryRoute.slice(1), 'index.html'), 'utf8');
  assert.match(html, /Use this route to query widgets by filter/);
  assert.ok(html.indexOf('Query widgets') < html.indexOf('List widgets'), 'explicit Query placement stays ahead of generated Widgets group');
  assert.equal(html.match(/href="\/reference\/widgets\/query-widgets-[a-f0-9]{8}"/g)?.length, 1);
  await writeFile(config, configText.replace('    generateReferences: true\n', ''));
  const authoredOnly = await compile(config, output, {}, { apiReview: 'report' });
  assert.equal(authoredOnly.documents.filter(doc => doc.type === 'api-reference').length, 1);
  const all = await materializeApiPages(config, 'widgets', { all: true });
  assert.equal(all.written.length, 1);
  assert.equal(all.skipped.length, 1);
});
