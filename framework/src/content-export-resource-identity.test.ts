import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import YAML from 'yaml';
import { exportContent } from './content-export.js';

test('page and section share source identity while a same-ID snippet keeps independent anchors and assets', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-resource-identity-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await cp(new URL('../examples/content-delivery', import.meta.url), directory, { recursive: true });
  const configFile = path.join(directory, 'docs.config.yaml');
  const config = YAML.parse(await readFile(configFile, 'utf8'));
  config.exports['app-help'].assetRoots = ['./snippets'];
  config.exports['app-help'].resources[2].id = 'guide.billing';
  await writeFile(configFile, YAML.stringify(config));
  // Matching routes and image basenames exercise document-scoped asset keys too.
  await writeFile(path.join(directory, 'content/billing.mdx'), `---
id: guide.billing
title: Billing
summary: Billing help.
slug: /__content_snippets/guide.billing
standaloneSections: [{ id: refunds, context: section }]
---
## Overview

<Collapsible title="Evidence">

Overview evidence.

</Collapsible>

## Refunds

<Collapsible title="Evidence">

Refund evidence.

</Collapsible>

<Image src="./identity.svg" alt="Page diagram" />
`);
  await writeFile(path.join(directory, 'snippets/refund-window.mdx'), '<Collapsible title="Snippet evidence">\n\nIndependent evidence.\n\n</Collapsible>\n\n<Image src="./identity.svg" alt="Snippet diagram" />\n');
  await writeFile(path.join(directory, 'content/identity.svg'), '<svg xmlns="http://www.w3.org/2000/svg"><title>Page asset</title></svg>');
  await writeFile(path.join(directory, 'snippets/identity.svg'), '<svg xmlns="http://www.w3.org/2000/svg"><title>Snippet asset</title></svg>');
  const output = path.join(directory, 'out');
  await exportContent(configFile, output, { target: 'app-help' });
  const manifest = JSON.parse(await readFile(path.join(output, 'manifest.json'), 'utf8'));
  assert.equal(manifest.resources.length, 3);
  const page = manifest.resources.find((resource: any) => resource.ref.kind === 'page');
  const section = manifest.resources.find((resource: any) => resource.ref.kind === 'section');
  const snippet = manifest.resources.find((resource: any) => resource.ref.kind === 'snippet');
  assert.ok(page.representations.html.anchors.some((anchor: any) => anchor.id === 'evidence-2'));
  assert.ok(section.representations.html.anchors.some((anchor: any) => anchor.id === 'evidence-2'));
  assert.deepEqual(snippet.representations.html.anchors.map((anchor: any) => anchor.id), ['snippet-evidence']);
  for (const format of ['html', 'markdown']) {
    assert.equal(new Set(manifest.resources.map((resource: any) => resource.representations[format].path)).size, 3);
    const sectionText = await readFile(path.join(output, section.representations[format].path), 'utf8');
    const snippetText = await readFile(path.join(output, snippet.representations[format].path), 'utf8');
    assert.match(sectionText, /Refund evidence/); assert.doesNotMatch(sectionText, /Overview evidence|Independent evidence/);
    assert.match(snippetText, /Independent evidence/); assert.doesNotMatch(snippetText, /Refund evidence|Overview evidence/);
  }
  assert.deepEqual(page.assets, section.assets); assert.equal(page.assets.length, 1); assert.equal(snippet.assets.length, 1);
  assert.notEqual(page.assets[0], snippet.assets[0]);
  assert.match(await readFile(path.join(output, page.assets[0]), 'utf8'), /Page asset/);
  assert.match(await readFile(path.join(output, snippet.assets[0]), 'utf8'), /Snippet asset/);
});
