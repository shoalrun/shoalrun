import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { compile } from './compiler.js';
import { loadConfig } from './config.js';
import { buildChunkIndex } from './index-build.js';
import { Retriever } from './retrieval.js';
import { queryBuiltSite } from './search-query.js';

const fixture = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../example-configs/minimal');

test('project YAML synonyms reach browser, CLI, and chat indexes', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-synonyms-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(fixture, root, { recursive: true });
  await mkdir(path.join(root, 'config'));
  const mapping = path.join(root, 'config/synonyms.yaml');
  await writeFile(mapping, '- [walkthrough, "walk through", "code tutorial", tutorial]\n');
  const config = path.join(root, 'docs.config.yaml');
  await writeFile(config, (await readFile(config, 'utf8')) + '\nsearch:\n  synonyms: { $include: ./config/synonyms.yaml }\n');
  const welcome = path.join(root, 'content/welcome.mdx');
  const install = path.join(root, 'content/install.mdx');
  await writeFile(welcome, (await readFile(welcome, 'utf8')) + '\nA code walkthrough.\n');
  await writeFile(install, (await readFile(install, 'utf8')) + '\nA short tutorial.\n');
  const output = path.join(root, 'site-dist');
  await compile(config, output);
  const index = JSON.parse(await readFile(path.join(output, 'search-index.json'), 'utf8'));
  assert.deepEqual(index.synonyms, [['walkthrough', 'walk through', 'code tutorial', 'tutorial']]);
  assert.deepEqual(JSON.parse(await readFile(path.join(output, 'documents.json'), 'utf8')).searchSynonyms, index.synonyms);
  const cli = await queryBuiltSite(output, 'walkthrough');
  assert.equal(cli.results[0].id, 'guide.welcome');
  assert.ok(cli.results.some(result => result.id === 'guide.install'));
  assert.equal((await queryBuiltSite(output, 'tutorial')).results[0].id, 'guide.install');
  assert.ok((await queryBuiltSite(output, 'walk through')).results.some(result => result.id === 'guide.welcome'));
  assert.ok((await queryBuiltSite(output, 'code tutorial')).results.some(result => result.id === 'guide.welcome'));
  const { index: chunks } = await buildChunkIndex(output);
  assert.deepEqual(chunks.synonyms, index.synonyms);
  assert.ok(new Retriever(chunks).lexical('walkthrough').some(hit => hit.chunk.docId === 'guide.install'));
  assert.ok(new Retriever(chunks).lexical('walk through').some(hit => hit.chunk.docId === 'guide.welcome'));
  assert.ok(new Retriever(chunks).lexical('code tutorial').some(hit => hit.chunk.docId === 'guide.welcome'));
  const fetchBefore = globalThis.fetch;
  globalThis.fetch = (async () => Response.json(index)) as typeof fetch;
  t.after(() => { globalThis.fetch = fetchBefore; });
  const provider = await import(`${pathToFileURL(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../assets/search-lexical.js')).href}?test=${Date.now()}`);
  const browser = await provider.search('walkthrough', { variant: 'production|current|en', indexUrl: '/search-index.json', limit: 8 });
  assert.ok(browser.some((result: any) => result.url === '/install'));
  assert.ok((await provider.search('walk through', { variant: 'production|current|en', indexUrl: '/search-index.json', limit: 8 })).some((result: any) => result.url === '/'));
  assert.ok((await provider.search('code tutorial', { variant: 'production|current|en', indexUrl: '/search-index.json', limit: 8 })).some((result: any) => result.url === '/'));
  await writeFile(mapping, '- [guide, handbook]\n');
  await compile(config, output);
  assert.ok(!(await queryBuiltSite(output, 'walkthrough')).results.some(result => result.id === 'guide.install'));
});

test('invalid or overlapping synonym groups fail config loading', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-synonyms-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(fixture, root, { recursive: true });
  const config = path.join(root, 'docs.config.yaml');
  const original = await readFile(config, 'utf8');
  for (const [value, message] of [
    ['synonyms: [[tutorial]]', /at least two/],
    ['synonyms: [[tutorial, walkthrough], [walkthrough, guide]]', /Duplicate search synonym/],
    ['synonyms: [["code.tutorial", walkthrough]]', /words or phrases/],
    ['synonyms: [["code tutorial", "code  tutorial"]]', /Duplicate search synonym/]
  ] as const) {
    await writeFile(config, original + `\nsearch:\n  ${value}\n`);
    await assert.rejects(loadConfig(config), message);
  }
});
