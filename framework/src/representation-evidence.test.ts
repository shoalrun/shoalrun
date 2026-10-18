import { getEncoding } from 'js-tiktoken';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { compile } from './compiler.js';

const framework = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('the published missing-adapter specimen fails check and preserves an earlier build', async t => {
  const directory = await mkdtemp(path.join(tmpdir(), 'shoalrun-evidence-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await cp(path.join(framework, 'example-configs/minimal'), directory, { recursive: true });
  const config = path.join(directory, 'docs.config.yaml');
  const output = path.join(directory, 'output');
  await compile(config, output);
  const previous = await readFile(path.join(output, 'build-info.json'), 'utf8');
  const page = path.join(directory, 'content/install.mdx');
  const proof = await readFile(path.join(framework, 'agent-docs/publish/agent-friendliness.md'), 'utf8');
  const source = proof.split('## What happens to an unsupported component?')[1].match(/```mdx\n([\s\S]*?)\n```/)![1];
  const diagnostic = proof.split('## What happens to an unsupported component?')[1].match(/```text\n([\s\S]*?)\n```/)![1];
  await writeFile(page, `${await readFile(page, 'utf8')}\n${source}\n`);
  await assert.rejects(compile(config, output), (error: Error) => error.message.includes(diagnostic));
  assert.equal(await readFile(path.join(output, 'build-info.json'), 'utf8'), previous);
  const result = spawnSync(process.execPath, [path.join(framework, 'dist/cli.js'), 'check', config], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.ok(result.stdout.includes(diagnostic), result.stdout + result.stderr);
});

test('fictional flags follow slug boundaries across mounted and versioned routes', async t => {
  const directory = await mkdtemp(path.join(tmpdir(), 'shoalrun-demo-flags-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await cp(path.join(framework, 'example-configs/minimal'), directory, { recursive: true });
  const config = path.join(directory, 'docs.config.yaml');
  await writeFile(config, (await readFile(config, 'utf8')).replace('  title: Acme handbook', '  title: Acme handbook\n  basePath: /docs').replace('current: { pathPrefix: "" }', 'current: { pathPrefix: /v1 }') + '\noutputs:\n  llms:\n    fictionalPrefixes: [/examples]\n');
  for (const [index, slug] of ['/examples', '/examples/child', '/examples-other'].entries()) {
    await writeFile(path.join(directory, `content/example-${index}.md`), `---\nid: guide.example${index}\ntitle: Example ${index}\nsummary: Boundary fixture.\nslug: ${slug}\n---\n\nCafé 世界 🐟 \`<|endoftext|>\`.\n`);
  }
  const output = path.join(directory, 'output');
  const manifest = await compile(config, output);
  for (const [index, expected] of [true, true, false].entries()) {
    const doc = manifest.documents.find(doc => doc.id === `guide.example${index}`)!;
    assert.equal(doc.demo, expected);
    const bytes = await readFile(path.join(output, doc.markdownUrl));
    assert.equal(doc.markdownBytes, bytes.length);
    assert.equal(doc.markdownTokens, getEncoding('cl100k_base').encode(bytes.toString('utf8'), [], []).length);
    assert.equal(doc.markdownTokenEncoding, 'cl100k_base');
    assert.equal(doc.digest, createHash('sha256').update(bytes).digest('hex'));
    const html = await readFile(path.join(output, doc.url, 'index.html'), 'utf8');
    assert.ok(html.includes(`href="${doc.markdownUrl}"`));
    assert.match(html, /data-copy-markdown hidden/);
    const compact = JSON.parse(await readFile(path.join(output, 'search-index.min.json'), 'utf8')).documents.find((item: any) => item.markdownUrl === doc.markdownUrl);
    for (const field of ['markdownBytes', 'markdownTokens', 'markdownTokenEncoding'] as const) assert.equal(compact[field], doc[field]);
    assert.ok(doc.url.startsWith('/docs/v1/'));
    for (const file of ['search-index.json', 'search-index.min.json']) {
      const search = JSON.parse(await readFile(path.join(output, file), 'utf8'));
      assert.equal(search.documents.find((record: any) => record.id === doc.id).demo, expected);
    }
  }
});
