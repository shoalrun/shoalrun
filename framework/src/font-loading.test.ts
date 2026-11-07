import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { resolveFonts, prepareFontAssets, customFontPreloads, fontsCss } from './fonts.js';
import { compile } from './compiler.js';
import { buildVercel } from './vercel.js';

test('primary custom font preloads select normal body and heading faces with correct types', () => {
  const file = '/project/docs.config.yaml';
  const fonts = resolveFonts({
    body: { family: 'Body', files: [{ file: 'italic.woff2', style: 'italic' }, { file: 'bold.woff2', weight: 700 }, { file: 'regular.woff', weight: 400 }] },
    headings: { family: 'Heading', files: [{ file: 'heading.ttf', weight: 700 }] },
    code: { family: 'Code', files: ['code.woff2'] }
  }, 'shoal', file);
  assert.equal(fonts.preload, undefined);
  assert.deepEqual(customFontPreloads(fonts), [
    { href: '/assets/fonts/project/regular.woff', type: 'font/woff' },
    { href: '/assets/fonts/project/heading.ttf', type: 'font/ttf' }
  ]);
  const shared = resolveFonts({ body: { family: 'Shared', files: ['shared.woff2'] }, headings: { family: 'Shared', files: ['shared.woff2'] } }, 'shoal', file);
  assert.equal(customFontPreloads(shared).length, 1);
  assert.equal(resolveFonts(undefined, 'shoal', file).preload, 'inter.woff2');
  assert.equal(resolveFonts({ headings: { family: 'Heading', files: ['heading.otf'] } }, 'shoal', file).preload, 'inter.woff2');
  assert.deepEqual(customFontPreloads(resolveFonts('system', 'shoal', file)), []);
  assert.deepEqual(customFontPreloads(resolveFonts({ body: 'Local System Font' }, 'shoal', file)), []);
});

test('custom font URLs track emitted bytes and invalidate when a font is edited', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-font-cache-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const font = path.join(root, 'body.woff2');
  await writeFile(font, 'font bytes one');
  const settings = { body: { family: 'Custom', files: ['body.woff2'] }, headings: { family: 'Custom', files: ['body.woff2'] } };
  const first = resolveFonts(settings, 'shoal', path.join(root, 'docs.config.yaml'));
  const assets = await prepareFontAssets(first);
  assert.equal(assets.size, 1);
  const href = customFontPreloads(first)[0].href;
  assert.match(href, /body-[a-f0-9]{64}\.woff2$/);
  assert.equal(assets.get(href)!.toString(), 'font bytes one');
  assert.ok(fontsCss(first)!.includes(href));
  assert.equal(customFontPreloads(first).length, 1);
  await writeFile(font, 'font bytes two');
  const next = resolveFonts(settings, 'shoal', path.join(root, 'docs.config.yaml'));
  await prepareFontAssets(next);
  assert.notEqual(customFontPreloads(next)[0].href, href);
});

test('builds preload custom fonts under base paths and publish cache policy for Node and Vercel', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-font-build-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'content'));
  await writeFile(path.join(root, 'body.woff2'), 'custom body bytes');
  await writeFile(path.join(root, 'heading.otf'), 'custom heading bytes');
  await writeFile(path.join(root, 'content/start.mdx'), '---\nid: guide.start\ntitle: Start\nsummary: Font loading example.\ntype: guide\nchannel: production\nversion: current\nlanguage: en\nslug: /start\naccess: { policy: public }\naudiences: [authors]\nupdated: 2026-11-06\n---\n\nA readable page.\n');
  const config = path.join(root, 'docs.config.yaml');
  await writeFile(config, JSON.stringify({ schemaVersion: 1, site: { title: 'Font loading', basePath: '/help', contentDir: './content' }, publications: { defaults: { channel: 'production', version: 'current', language: 'en' }, channels: { production: {} }, versions: { current: {} }, enabled: [{ channel: 'production', version: 'current', language: 'en' }] }, theme: { fonts: { body: { family: 'Body', files: ['body.woff2'] }, headings: { family: 'Heading', files: ['heading.otf'] } } }, outputs: { html: { shareImages: false } } }));
  const output = path.join(root, 'site');
  await compile(config, output);
  const html = await readFile(path.join(output, 'help/start/index.html'), 'utf8');
  const preloads = [...html.matchAll(/<link rel="preload" href="([^"]+)" as="font" type="([^"]+)" crossorigin>/g)];
  assert.equal(preloads.length, 2);
  assert.deepEqual(preloads.map(match => match[2]), ['font/woff2', 'font/otf']);
  const css = await readFile(path.join(output, 'help/assets/fonts.css'), 'utf8');
  const headers = JSON.parse(await readFile(path.join(output, 'resource-headers.json'), 'utf8'));
  for (const [, href] of preloads) {
    assert.ok(href.startsWith('/help/assets/fonts/project/'));
    assert.ok(css.includes(href));
    assert.match(headers[href]['Cache-Control'], /max-age=31536000, immutable/);
    assert.match(headers[href].ETag, /^"[a-f0-9]{64}"$/);
    assert.ok((await readFile(path.join(output, href))).length);
  }
  assert.equal(headers['/help/assets/fonts/inter.woff2']['Cache-Control'], 'public, max-age=0, must-revalidate');
  const vercel = path.join(root, 'vercel');
  await buildVercel(config, vercel);
  const routes = JSON.parse(await readFile(path.join(vercel, 'config.json'), 'utf8')).routes;
  for (const [, href] of preloads) assert.ok(routes.some((route: any) => new RegExp(route.src).test(href) && route.headers?.['Cache-Control'] === headers[href]['Cache-Control']));
});

test('preload weights, styles and overlapping registrations follow the emitted CSS', () => {
  const resolve = (value: unknown, preset = 'shoal') => customFontPreloads(resolveFonts(value, preset, '/project/docs.config.yaml')).map(face => path.basename(face.href));
  assert.deepEqual(resolve({ headings: { family: 'Display', files: [{ file: 'w600.woff2', weight: 600 }, { file: 'w900.woff2', weight: 900 }] } }), ['w900.woff2']);
  assert.deepEqual(resolve({ body: { family: 'Text', files: [{ file: 'w300.woff2', weight: 300 }, { file: 'w500.woff2', weight: 500 }] } }), ['w500.woff2']);
  assert.deepEqual(resolve({ body: { family: 'Text', files: [{ file: 'first.woff2', weight: 400 }, { file: 'last.ttf', weight: 400 }] } }), ['last.ttf']);
  assert.deepEqual(resolve({ body: { family: 'Shared', files: [{ file: 'first.woff2', weight: 400 }] }, code: { family: 'Shared', files: [{ file: 'last.woff', weight: 400 }] } }), ['last.woff']);
  assert.deepEqual(resolve({ headings: { family: 'Display', files: [{ file: 'regular.woff2', weight: 700 }, { file: 'italic.woff2', weight: 800, style: 'italic' }] } }, 'vice'), ['italic.woff2']);
  assert.deepEqual(resolve({ body: { family: 'Text', files: [{ file: 'low.woff2', weight: '100 500' }, { file: 'overlap.woff2', weight: '300 900' }] } }), ['overlap.woff2']);
});
