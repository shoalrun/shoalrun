import assert from 'node:assert/strict';
import test from 'node:test';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseYaml } from './yaml-value.js';
import { loadConfig } from './config.js';
import { readDocument } from './content-source.js';
import { ApiReader } from './api.js';

test('YAML parsing accepts shared anchors but rejects cycles, duplicate keys, and excessive alias expansion with the source file', () => {
  const shared = parseYaml('base: &base { enabled: true }\nfirst: *base\nsecond: *base\n', 'settings.yaml');
  assert.deepEqual(shared.first, { enabled: true });
  assert.equal(shared.first, shared.second);
  for (const source of ['root: &root { child: *root }', 'key: first\nkey: second']) {
    assert.throws(() => parseYaml(source, 'settings.yaml'), /settings.yaml:/);
  }
  assert.throws(() => parseYaml('root: &root { child: *root }', 'settings.yaml'), /Cyclic YAML alias.*finite values/);
  const bomb = ['a: &a [x, x, x, x, x, x, x, x, x, x]', 'b: &b [*a, *a, *a, *a, *a, *a, *a, *a, *a, *a]', 'c: &c [*b, *b, *b, *b, *b, *b, *b, *b, *b, *b]', 'd: [*c, *c, *c, *c, *c, *c, *c, *c, *c, *c]'].join('\n');
  assert.throws(() => parseYaml(bomb, 'large.yaml'), /large.yaml:.*alias count/);
});

test('cyclic aliases are rejected at config, frontmatter, and OpenAPI input boundaries', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-yaml-boundary-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await cp(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../example-configs/minimal'), directory, { recursive: true });
  const config = path.join(directory, 'docs.config.yaml');
  await writeFile(config, (await readFile(config, 'utf8')) + '\nvariables: &vars { nested: *vars }\n');
  await assert.rejects(loadConfig(config), /docs.config.yaml: Cyclic YAML alias/);
  const page = path.join(directory, 'content/welcome.mdx');
  await writeFile(page, (await readFile(page, 'utf8')).replace('id: guide.welcome', 'id: guide.welcome\nextra: &extra { nested: *extra }'));
  await assert.rejects(readDocument(page), /welcome.mdx: Cyclic YAML alias/);
  const api = path.join(directory, 'api.yaml');
  await writeFile(api, 'openapi: 3.1.0\ninfo: { title: Test, version: "1" }\nexample: &example { nested: *example }\n');
  await assert.rejects(new ApiReader().load(api), /api.yaml: Cyclic YAML alias/);
});
