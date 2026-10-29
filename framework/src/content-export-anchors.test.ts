import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { exportContent } from './content-export.js';

async function fixture(t: any, body: string, resources = '[{ kind: section, documentId: guide.billing, sectionId: refunds }]') {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-anchor-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await cp(fileURLToPath(new URL('../examples/content-delivery', import.meta.url)), directory, { recursive: true });
  const config = path.join(directory, 'docs.config.yaml');
  const original = await readFile(config, 'utf8');
  await writeFile(config, original.slice(0, original.indexOf('    resources:')) + `    resources: ${resources}\n`);
  await writeFile(path.join(directory, 'content/billing.mdx'), `---\nid: guide.billing\ntitle: Billing\nsummary: Billing help.\nslug: /billing\nstandaloneSections: [{ id: refunds, context: section }]\n---\n${body}\n`);
  const output = path.join(directory, 'out');
  return { config, output, async run() { await exportContent(config, output, { target: 'app-help' }); return JSON.parse(await readFile(path.join(output, 'manifest.json'), 'utf8')); } };
}
const duplicate = '## Overview\n\n### Evidence\n\nOriginal evidence.\n\n## Refunds\n\n### Evidence\n\nDifferent evidence.\n\n';

test('section keeps full-source duplicate heading IDs and never retargets an omitted fragment', async t => {
  const f = await fixture(t, duplicate + '[Original](#evidence). [This evidence](#evidence-2).');
  const data = await f.run();
  const section = data.resources[0];
  for (const format of ['html', 'markdown']) {
    const links = section.representations[format].links;
    assert.equal(links[0].kind, 'canonical');
    assert.equal(links[0].href, 'https://docs.example.com/billing#evidence');
    assert.equal(links[1].kind, 'resource');
    assert.equal(links[1].fragment, 'evidence-2');
    assert.match(links[1].href, format === 'html' ? /-evidence-2$/ : /#evidence$/);
  }
  const html = await readFile(path.join(f.output, section.representations.html.path), 'utf8');
  assert.match(html, /id="[^"]+-evidence-2"/);
  assert.doesNotMatch(html, /data-export-source-key/);
});

test('nonexistent source fragments fail before canonical fallback', async t => {
  const f = await fixture(t, duplicate + '[Missing](#does-not-exist).');
  await assert.rejects(f.run(), /Missing source anchor does-not-exist/);
});

test('generated headings retain full-source provenance with page and section selected', async t => {
  const f = await fixture(t, '## Overview\n\n<Collapsible title="Evidence">\n\nOriginal.\n\n</Collapsible>\n\n[Details](#evidence-2).\n\n## Refunds\n\n<Collapsible title="Evidence">\n\nRefund evidence.\n\n</Collapsible>', '[{ kind: page, documentId: guide.billing }, { kind: section, documentId: guide.billing, sectionId: refunds }]');
  const data = await f.run();
  const section = data.resources.find((item: any) => item.ref.kind === 'section');
  assert.ok(section.representations.html.anchors.some((anchor: any) => anchor.id === 'evidence-2'));
});

test('resource file identity is independent of publication mapping order', async t => {
  const f = await fixture(t, '## Refunds\n\nRefund help.');
  const original = await readFile(f.config, 'utf8');
  const paths = [];
  for (const declaration of ['{channel: production, version: current, language: en}', '{language: en, version: current, channel: production}']) {
    await writeFile(f.config, original + `    publication: ${declaration}\n`);
    paths.push((await f.run()).resources[0].representations.html.path);
  }
  assert.equal(paths[0], paths[1]);
});

test('portable-only generated heading cannot become a fabricated canonical target', async t => {
  const f = await fixture(t, '## Overview\n\n<Collapsible title="Evidence">\n\nOriginal.\n\n</Collapsible>\n\n## Refunds\n\n[Evidence](#evidence).');
  await assert.rejects(f.run(), /Cannot verify canonical anchor evidence/);
});

test('website shell anchor collisions fail clearly instead of changing canonical target', async t => {
  const f = await fixture(t, '## Main\n\nOverview.\n\n## Refunds\n\n[Overview](#main).');
  await assert.rejects(f.run(), /Cannot verify canonical anchor main/);
});


test('page, section, and named instance isolate shared snippet provenance and repeated headings', async t => {
  const f = await fixture(t, '## Find an invoice\n\nInvoice help.\n\n## Refunds\n\n<Snippet id="shared.refund-window" />\n\n<Snippet id="shared.refund-window" />', '[{ kind: page, documentId: guide.billing }, { kind: section, documentId: guide.billing, sectionId: refunds }, { kind: snippet, id: refund-help, snippetId: shared.refund-window, title: Refund window, summary: Refund help. }]');
  await writeFile(path.join(path.dirname(f.config), 'snippets/refund-window.mdx'), '<Collapsible title="Evidence">\n\nRefund evidence.[^review]\n\n</Collapsible>\n\n[^review]: Reviewed evidence.\n');
  const data = await f.run();
  assert.equal(data.resources.length, 3);
  for (const resource of data.resources) {
    const ids = resource.representations.html.anchors.map((anchor: any) => anchor.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(ids.includes('evidence'));
    if (resource.ref.kind !== 'snippet') assert.ok(ids.includes('evidence-2'));
  }
});
