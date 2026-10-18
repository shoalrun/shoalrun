import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkEvalCandidate } from './lib/check-eval-candidate.mjs';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const starter = path.join(repo, 'framework/example-configs/minimal/content/welcome.mdx');

test('evaluation renders an unpublished candidate without changing its access or unresolved facts', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-eval-render-')); t.after(() => rm(root, { recursive: true, force: true }));
  const source = (await readFile(starter, 'utf8')).replace('policy: public', 'policy: draft') + '\n[[TODO: confirm retention policy]]\n';
  const file = path.join(root, 'candidate.mdx'); await writeFile(file, source);
  const result = await checkEvalCandidate(repo, file, path.join(root, 'render'), { documentIds: [] });
  assert.equal(result.candidateRendered, true);
  assert.equal(result.validationOnlyPlaceholderMarkersConverted, 1);
  assert.equal(result.publicationPlaceholderGateClear, false);
  assert.equal(await readFile(file, 'utf8'), source);
});

test('unpublished MDX errors and unknown doc links cannot hide behind a passing site build', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-eval-render-')); t.after(() => rm(root, { recursive: true, force: true }));
  const source = (await readFile(starter, 'utf8')).replace('policy: public', 'policy: draft');
  for (const [at, body] of ['\n<RelatedReading />\n</RelatedReading>\n', '\n[Unknown](doc:invented.page)\n'].entries()) {
    const file = path.join(root, `candidate-${at}.mdx`); await writeFile(file, source + body);
    await assert.rejects(checkEvalCandidate(repo, file, path.join(root, `render-${at}`), { documentIds: [] }), /closing slash|unknown|unresolved|link/i);
    assert.equal(await readFile(file, 'utf8'), source + body);
  }
});
