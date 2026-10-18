import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from '../dist/compiler.js';
import { createSiteServer } from '../dist/server.js';
import { checkDeployment } from './check-deployment.mjs';

function fixture(options = {}) {
  const markdown = '# Start\n\nHello.\n';
  const manifest = { sitemap: '/sitemap.xml', documents: [{ url: '/start', markdownUrl: '/start.md', indexable: !options.noindex, updated: '2026-09-27' }] };
  const headers = { '/.well-known/api-catalog': { 'Content-Type': 'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"' } };
  return async (url, init) => {
    const route = new URL(url).pathname;
    const origin = options.badSocialOrigin ? 'https://docs.example.test' : new URL(url).origin;
    const accept = init.headers.Accept;
    const reply = (body, status, headers) => new Response(body, { status, headers });
    if (route === '/__shoalrun/chat.json') return reply(JSON.stringify({ notice: 'Recorded' }), 200, { 'Content-Type': 'application/json' });
    if (route === '/__shoalrun/ask') {
      if (init.method !== 'POST') return reply('{}', 405, { 'Content-Type': 'application/json' });
      if (init.headers.Origin !== new URL(url).origin) return reply('{}', 403, { 'Content-Type': 'application/json' });
      return reply(options.chatPaused ? '{"paused":true}' : '{}', options.chatPaused ? 503 : 400, { 'Content-Type': 'application/json' });
    }
    if (route === '/__shoalrun/search') {
      if (init.method !== 'POST') return reply('{}', 405, { 'Content-Type': 'application/json' });
      if (init.headers.Origin !== new URL(url).origin) return reply('{}', 403, { 'Content-Type': 'application/json' });
      return reply('{}', 400, { 'Content-Type': 'application/json' });
    }
    if (route === '/documents.json') return reply(JSON.stringify(manifest), 200, { 'Content-Type': 'application/json' });
    if (route === '/robots.txt') return reply(`User-agent: *\nAllow: /\nSitemap: ${new URL(url).origin}/sitemap.xml\n`, 200, { 'Content-Type': 'text/plain' });
    if (route === '/sitemap.xml') return reply(`<?xml version="1.0"?><urlset><url><loc>${new URL(url).origin}/${options.badSitemap ? 'elsewhere' : 'start'}</loc><lastmod>2026-09-27</lastmod></url></urlset>`, options.redirectSitemap ? 301 : 200, { 'Content-Type': 'application/xml' });
    if (route === '/resource-headers.json') return reply(JSON.stringify(headers), 200, { 'Content-Type': 'application/json' });
    if (route === '/build-info.json' && !options.missingBuildInfo) return reply(JSON.stringify({ schemaVersion: 1, sourceCommit: options.sourceCommit ?? 'a'.repeat(40) }), 200, { 'Content-Type': 'application/json' });
    if (route === '/llms.txt') return reply('# Docs\n/start.md\n/documents.json\n/.well-known/api-catalog\n', 200, { 'Content-Type': 'text/plain' });
    if (route === '/.well-known/api-catalog') return reply('{}', 200, { 'Content-Type': headers[route]['Content-Type'] });
    if (route === '/start.md') return reply(markdown, 200, { 'Content-Type': 'text/markdown' });
    if (route === '/assets/share/start.png') return reply(options.missingImage ? 'Not found' : 'png', options.missingImage ? 404 : 200, { 'Content-Type': options.badImageType ? 'text/html' : 'image/png' });
    if (route === '/start' && accept === 'text/markdown') return reply(options.badBody ? '# Wrong\n' : markdown, 200, {
      'Content-Type': options.badType ? 'text/html' : 'text/markdown',
      'Content-Location': '/start.md', Vary: 'Accept', Link: '</start.md>; rel="alternate"; type="text/markdown"'
    });
    if (route === '/start') return reply(`<!doctype html><html><head><link rel="canonical" href="${options.badCanonical ? `${origin}/elsewhere` : `${origin}/start`}">${options.noindex ? '<meta name="robots" content="noindex">' : ''}<meta property="og:url" content="${origin}/start"><meta property="og:image" content="${origin}/assets/share/start.png"></head><body><h1>Start</h1></body></html>`, options.redirectPage ? 301 : 200, {
      'Content-Type': 'text/html', Vary: 'Accept', Link: '</start.md>; rel="alternate"; type="text/markdown"'
    });
    return reply('Not found', options.bad404 ? 200 : 404, { 'Content-Type': 'text/plain' });
  };
}

test('checks a deployed site and its discovery resources', async () => {
  const result = await checkDeployment('https://docs.example.com/', { fetch: fixture() });
  assert.equal(result.documents, 1);
  assert.deepEqual(result.failures, []);
});

test('checks a homepage without constructing a protocol-relative slash URL', async () => {
  const fetcher = fixture();
  const result = await checkDeployment('https://docs.example.com/', {
    fetch: async (url, init) => {
      const route = new URL(url).pathname;
      const rewritten = new URL(url);
      if (route === '/') rewritten.pathname = '/start';
      const response = await fetcher(rewritten, init);
      if (!['/documents.json', '/sitemap.xml', '/'].includes(route)) return response;
      const body = (await response.text()).replaceAll('https://docs.example.com/start', 'https://docs.example.com/').replaceAll('"url":"/start"', '"url":"/"');
      return new Response(body, { status: response.status, headers: response.headers });
    },
  });
  assert.equal(result.documents, 1);
  assert.deepEqual(result.failures, []);
});

test('checks a site mounted below /docs using its public manifests', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-deploy-base-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await cp(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../example-configs/minimal'), directory, { recursive: true });
  const config = path.join(directory, 'docs.config.yaml');
  await writeFile(config, (await readFile(config, 'utf8')).replace('  title: Acme handbook', '  title: Acme handbook\n  origin: https://docs.example.test\n  basePath: /docs'));
  const output = path.join(directory, 'dist');
  await compile(config, output);
  const server = await createSiteServer(output);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const address = server.address();
  const local = `http://127.0.0.1:${address.port}`;
  const result = await checkDeployment('https://docs.example.test/docs/', { fetch: (url, init) => fetch(`${local}${new URL(url).pathname}`, init) });
  assert.deepEqual(result.failures, []);
});

test('checks chat without asking a billable question, including an already paused chat', async () => {
  assert.deepEqual((await checkDeployment('https://docs.example.com/', { fetch: fixture(), chat: true })).failures, []);
  assert.deepEqual((await checkDeployment('https://docs.example.com/', { fetch: fixture({ chatPaused: true }), chat: true, chatPaused: true })).failures, []);
  assert.match((await checkDeployment('https://docs.example.com/', { fetch: fixture(), chat: true, chatPaused: true })).failures.join('\n'), /expected HTTP 503/);
});

test('reports representation and missing-route failures', async () => {
  const { failures } = await checkDeployment('https://docs.example.com/', { fetch: fixture({ badType: true, badBody: true, bad404: true }) });
  assert.match(failures.join('\n'), /expected Content-Type text\/markdown/);
  assert.match(failures.join('\n'), /negotiated Markdown differs/);
  assert.match(failures.join('\n'), /expected HTTP 404/);
});

test('checks social preview URLs and a publicly served image', async () => {
  const wrongOrigin = await checkDeployment('https://docs.example.com/', { fetch: fixture({ badSocialOrigin: true }) });
  assert.match(wrongOrigin.failures.join('\n'), /og:url points to https:\/\/docs\.example\.test/);
  assert.match(wrongOrigin.failures.join('\n'), /og:image points to https:\/\/docs\.example\.test/);
  const missingImage = await checkDeployment('https://docs.example.com/', { fetch: fixture({ missingImage: true }) });
  assert.match(missingImage.failures.join('\n'), /assets\/share\/start\.png: expected HTTP 200, got 404/);
  const wrongType = await checkDeployment('https://docs.example.com/', { fetch: fixture({ badImageType: true }) });
  assert.match(wrongType.failures.join('\n'), /expected a social image Content-Type/);
});

test('checks the deployed commit when verifying a branch deployment', async () => {
  const expected = 'a'.repeat(40);
  const matching = await checkDeployment('https://sandbox-docs.example.com/', { fetch: fixture(), sourceCommit: expected.toUpperCase() });
  assert.deepEqual(matching.failures, []);
  const wrongBranch = await checkDeployment('https://sandbox-docs.example.com/', { fetch: fixture({ sourceCommit: 'b'.repeat(40) }), sourceCommit: expected });
  assert.match(wrongBranch.failures.join('\n'), /build-info\.json: expected source commit/);
  const missing = await checkDeployment('https://sandbox-docs.example.com/', { fetch: fixture({ missingBuildInfo: true }), sourceCommit: expected });
  assert.match(missing.failures.join('\n'), /build-info\.json/);
  await assert.rejects(checkDeployment('https://sandbox-docs.example.com/', { fetch: fixture(), sourceCommit: 'sandbox' }), /full 40- or 64-character/);
});

test('reports sitemap, canonical, noindex, and redirect conflicts', async () => {
  for (const [option, pattern] of [
    ['badSitemap', /unexpected URL/], ['redirectSitemap', /sitemap\.xml: expected HTTP 200, got 301/],
    ['badCanonical', /canonical points to/], ['redirectPage', /start: expected HTTP 200, got 301/],
    ['noindex', /unexpected URL/]
  ]) {
    const result = await checkDeployment('https://docs.example.com/', { fetch: fixture({ [option]: true }) });
    assert.match(result.failures.join('\n'), pattern);
  }
});
