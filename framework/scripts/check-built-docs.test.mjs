import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, appendFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { compile } from '../dist/compiler.js';
import { checkBuiltDocs } from './check-built-docs.mjs';

test('built-site CI checks retain the output and catch broken links without running project hooks', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-built-check-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(fileURLToPath(new URL('../example-configs/minimal/', import.meta.url)), root, { recursive: true });
  const config = path.join(root, 'docs.config.yaml');
  const site = path.join(root, 'site');
  await appendFile(config, '\naudit:\n  evals:\n    tasks: ./tasks.json\n    report: ./report.json\n    run: [node, -e, "throw new Error(\'Do not execute an evaluator in this check\')"]\n');
  await compile(config, site);
  const before = await readFile(path.join(site, 'index.html'), 'utf8');
  const valid = await checkBuiltDocs(config, site);
  assert.equal(valid.status, 'ok');
  assert.deepEqual(valid.results.map(result => result.id), ['links', 'focused-contracts', 'output-contract']);
  assert.equal(await readFile(path.join(site, 'index.html'), 'utf8'), before, 'the existing build is retained');
  await appendFile(path.join(site, 'index.html'), '<a href="/missing-page">Broken link</a>');
  const broken = await checkBuiltDocs(config, site);
  assert.equal(broken.status, 'error');
  assert.ok(broken.results.find(result => result.id === 'links').findings.some(finding => finding.message.includes('/missing-page')));
});
