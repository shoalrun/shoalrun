import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readShoalrunDoc, searchShoalrunDocs } from './docs-tool.js';

test('bundled documentation can be searched and read without a project build', async () => {
  const search = await searchShoalrunDocs('navigation');
  assert.equal(search.status, 'ok');
  assert.ok(search.results.some(result => result.id === 'guide.navigation-lifecycle'));
  assert.match(await readShoalrunDoc('guide.navigation-lifecycle'), /# Organize site navigation/);
  await assert.rejects(readShoalrunDoc('guide.does-not-exist'), /No document with ID/);
  const cli = path.join(path.dirname(fileURLToPath(import.meta.url)), 'cli.js');
  const result = spawnSync(process.execPath, [cli, 'docs', 'search', 'navigation'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.ok(JSON.parse(result.stdout).results.length > 0);
});
