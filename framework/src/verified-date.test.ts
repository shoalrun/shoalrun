import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { compile } from './compiler.js';
import { validateFrontmatter } from './frontmatter.js';

test('verified dates remain independent across HTML, Markdown, and manifest with an HTML-only visibility override', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-verified-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(path.join(directory, 'content'));
  const config = {
    schemaVersion: 1, site: { title: 'Dates' },
    frontmatter: { defaults: { type: 'guide', summary: 'Date example', channel: 'production', version: 'current', access: { policy: 'public' }, showVerified: true } },
    publications: { defaults: { channel: 'production', version: 'current', language: 'en' }, channels: { production: {} }, versions: { current: {} }, enabled: [{ channel: 'production', version: 'current' }] },
    outputs: { html: { highlighting: { provider: 'none' } } },
  };
  const cases = [
    { id: 'both', updated: '2026-10-28', verified: '2026-10-27' },
    { id: 'verified-only', verified: '2026-10-27' },
    { id: 'absent', updated: '2026-10-28' },
    { id: 'hidden', updated: '2026-10-28', verified: '2026-10-27', showVerified: false },
    { id: 'explicit', verified: '2026-10-27', showVerified: true },
  ];
  for (const item of cases) await writeFile(path.join(directory, 'content', item.id + '.mdx'), `---\n${JSON.stringify({ title: item.id, slug: '/' + item.id, ...item })}\n---\nTechnical instructions.\n`);
  const file = path.join(directory, 'docs.config.yaml');
  const output = path.join(directory, 'output');
  for (const defaultVisibility of [undefined, false]) {
    if (defaultVisibility === undefined) delete (config.frontmatter.defaults as any).showVerified;
    else config.frontmatter.defaults.showVerified = defaultVisibility;
    await writeFile(file, JSON.stringify(config));
    const manifest = await compile(file, output);
    for (const item of cases) {
      const html = await readFile(path.join(output, item.id, 'index.html'), 'utf8');
      const header = html.split('<header class="page-head">')[1].split('</header>')[0];
      const markdown = await readFile(path.join(output, item.id + '.md'), 'utf8');
      const record = manifest.documents.find(doc => doc.id === item.id)!;
      assert.equal(record.verified, item.verified);
      assert.equal(record.updated, item.updated);
      if (item.verified) assert.match(markdown, /Verified: 2026-10-27/);
      else assert.doesNotMatch(markdown, /Verified:/);
      if (item.updated) {
        assert.match(header, /Updated <time datetime="2026-10-28">2026-10-28<\/time>/);
        assert.match(markdown, /Updated: 2026-10-28/);
      } else assert.doesNotMatch(header, /Updated <time/);
      if (item.verified && (item.showVerified ?? defaultVisibility) !== false) assert.match(header, /Verified <time datetime="2026-10-27">2026-10-27<\/time>/);
      else assert.doesNotMatch(header, /Verified|datetime="2026-10-27"/);
    }
  }
});

test('showVerified accepts only booleans', () => {
  const page = { id: 'dates', title: 'Dates', type: 'guide', summary: 'Dates', slug: '/dates' };
  for (const value of ['false', 0, null, {}]) assert.throws(() => validateFrontmatter({ ...page, showVerified: value } as any, {}, 'dates.mdx'), /showVerified must be true or false/);
  for (const showVerified of [true, false]) assert.doesNotThrow(() => validateFrontmatter({ ...page, showVerified }, {}, 'dates.mdx'));
});
