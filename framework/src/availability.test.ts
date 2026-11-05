import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Ajv2020 } from 'ajv/dist/2020.js';
import { compile } from './compiler.js';
import { frontmatterSchema, validateFrontmatter, frontmatterLayers } from './frontmatter.js';

test('availability labels survive HTML, Markdown projections, and manifests without selecting publications', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-availability-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(path.join(directory, 'content'));
  const cases = [
    { id: 'since', availability: { since: '0.1.0-alpha.18' }, updated: '2026-11-04' },
    { id: 'through', availability: { through: 'v2' } },
    { id: 'range', availability: { since: 'v1', through: 'v3' } },
    { id: 'absent' },
    { id: 'escaped', availability: { since: '<img src=x onerror=alert(1)>' } },
  ];
  for (const item of cases) await writeFile(path.join(directory, 'content', `${item.id}.mdx`), `---\n${JSON.stringify({ title: item.id, slug: '/' + item.id, ...item })}\n---\nInstructions.\n`);
  const config = {
    schemaVersion: 1, site: { title: 'Availability' },
    frontmatter: { defaults: { type: 'guide', channel: 'production', version: 'current', summary: 'Support labels', access: { policy: 'public' } } },
    publications: { defaults: { channel: 'production', version: 'current', language: 'en' }, channels: { production: {} }, versions: { current: {} }, enabled: [{ channel: 'production', version: 'current' }] },
    outputs: { html: { highlighting: { provider: 'none' } }, markdown: { metadata: { format: 'yaml-frontmatter', fields: { title: 'frontmatter.title' } } } },
  };
  const file = path.join(directory, 'docs.config.yaml');
  const output = path.join(directory, 'output');
  await writeFile(file, JSON.stringify(config));
  const manifest = await compile(file, output);
  assert.equal(manifest.documents.length, cases.length);
  for (const item of cases) {
    const html = await readFile(path.join(output, item.id, 'index.html'), 'utf8');
    const markdown = await readFile(path.join(output, item.id + '.md'), 'utf8');
    const record = manifest.documents.find(doc => doc.id === item.id)!;
    assert.deepEqual(record.availability, item.availability);
    assert.equal(record.variant.version, 'current');
    if (!item.availability) {
      assert.doesNotMatch(html, /data-availability=/);
      assert.doesNotMatch(markdown, /Available since:|Available through:/);
      continue;
    }
    if (item.id === 'escaped') {
      assert.doesNotMatch(html, /<img src=x/);
      assert.match(html, /Since &lt;img src=x onerror=alert\(1\)>/);
      continue;
    }
    for (const boundary of ['since', 'through'] as const) {
      const version = item.availability[boundary];
      if (version) {
        assert.ok(html.includes(`<span class="page-version" data-availability="${boundary}">${boundary === 'since' ? 'Since' : 'Through'} ${version}</span>`));
        assert.ok(markdown.includes(`Available ${boundary}: ${version}`));
      }
    }
  }
});

test('availability validates labels consistently and remains page-specific', () => {
  const page = { id: 'support', title: 'Support', summary: 'Support', type: 'guide', slug: '/support' };
  const validateSchema = new Ajv2020({ strict: false, validateFormats: false }).compile(frontmatterSchema({}));
  for (const availability of [null, '', [], {}, { since: '' }, { through: ' ' }, { since: 18 }, { until: 'v2' }, { since: 'v1', typo: 'v3' }]) {
    assert.throws(() => validateFrontmatter({ ...page, availability } as any, {}, 'support.mdx'), /availability/);
    assert.equal(validateSchema({ ...page, availability }), false);
  }
  for (const availability of [{ since: 'v1' }, { through: 'v2' }, { since: 'release-blue', through: 'release-green' }]) {
    assert.doesNotThrow(() => validateFrontmatter({ ...page, availability }, {}, 'support.mdx'));
    assert.equal(validateSchema({ ...page, availability }), true, JSON.stringify(validateSchema.errors));
  }
  for (const layer of ['defaults', 'enforced']) assert.throws(() => frontmatterLayers({ [layer]: { availability: { since: 'v1' } } }), /must stay page-specific/);
});
