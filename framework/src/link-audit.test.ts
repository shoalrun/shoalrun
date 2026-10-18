import assert from 'node:assert/strict';
import test from 'node:test';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from './compiler.js';
import { auditLinks } from './link-audit.js';

test('published link checks resolve base paths, redirects, escaped anchors, assets, and Markdown reference links', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-links-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await cp(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../example-configs/minimal'), directory, { recursive: true });
  const config = path.join(directory, 'docs.config.yaml');
  await writeFile(config, (await readFile(config, 'utf8')).replace('  title: Acme handbook', '  title: Acme handbook\n  origin: https://docs.example.com\n  basePath: /docs') + '\nredirects:\n  - from: /old\n    to: { doc: guide.install, channel: production, version: current, language: en }\n');
  const output = path.join(directory, 'output');
  await compile(config, output);
  const home = path.join(output, 'docs/index.html');
  const install = path.join(output, 'docs/install/index.html');
  await writeFile(install, (await readFile(install, 'utf8')) + '<h2 id="checks&amp;results">Checks</h2>');
  await mkdir(path.join(output, 'docs/assets'), { recursive: true });
  await writeFile(path.join(output, 'docs/assets/logo x.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
  const original = await readFile(home, 'utf8');
  await writeFile(home, original + '<a href="/docs/old#checks%26results">Redirect</a><img src="/docs/assets/logo%20x.svg"><a href="https://external.invalid/unreachable">External</a><pre>&lt;a href="/fictional"&gt;Code&lt;/a&gt;</pre>');
  const markdown = path.join(output, 'docs/index.md');
  await writeFile(markdown, (await readFile(markdown, 'utf8')) + '\n[Install][guide]\n\n[guide]: https://docs.example.com/docs/old.md\n\n```md\n[Example](/fictional)\n```\n');
  const good = await auditLinks(output, 'https://docs.example.com');
  assert.equal(good.status, 'ok', JSON.stringify(good.findings));
  assert.equal(good.pages, 2);
  assert.ok(good.checked > 0);

  await writeFile(home, original + '<a href="/docs/install#absent">Bad anchor</a><a href="https://docs.example.com/docs/missing">Bad page</a><img src="/docs/assets/missing.png">');
  await writeFile(markdown, '[Missing][bad]\n\n[bad]: /docs/missing.md\n');
  const bad = await auditLinks(output, 'https://docs.example.com');
  assert.equal(bad.status, 'error');
  assert.equal(bad.findings.length, 4);
  assert.ok(bad.findings.some(f => f.target === '/docs' && f.message.includes('Missing fragment #absent')));
  assert.ok(bad.findings.some(f => f.target === '/docs/index.md' && f.message.includes('/docs/missing.md')));
});

test('published link checks report redirect cycles rather than hanging', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-links-cycle-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(path.join(directory, 'documents.json'), JSON.stringify({ documents: [{ url: '/', markdownUrl: '/index.md' }], redirects: [{ from: '/a', to: '/b' }, { from: '/b', to: '/a' }] }));
  await writeFile(path.join(directory, 'index.html'), '<a href="/a">Cycle</a>');
  await writeFile(path.join(directory, 'index.md'), '# Home');
  const result = await auditLinks(directory);
  assert.equal(result.status, 'error');
  assert.match(result.findings[0].message, /Redirect cycle/);
});
