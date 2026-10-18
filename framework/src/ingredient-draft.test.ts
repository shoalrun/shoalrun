import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderIngredientDraft, writeIngredientDraft } from './ingredient-draft.js';

const fixture = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../example-configs/notifications');
const config = path.join(fixture, 'docs.config.yaml');
const spec = path.join(fixture, 'ingredient-specs/queue-welcome-email.yaml');

test('ingredient draft copies an exact configured API example and is deterministic', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-recipe-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const output = path.join(directory, 'draft.mdx');
  const first = await renderIngredientDraft(config, spec);
  assert.deepEqual(await renderIngredientDraft(config, spec), first);
  assert.match(first.content, /curl --request POST/);
  assert.match(first.content, /"status": "queued"/);
  assert.match(first.content, /policy: draft/);
  assert.match(first.content, /TODO: Give a concrete check/);
  assert.match(first.content, /type: ingredient/);
  assert.equal((await writeIngredientDraft(config, spec, output, true)).status, 'would-create');
  assert.equal((await writeIngredientDraft(config, spec, output)).status, 'created');
  assert.equal(await readFile(output, 'utf8'), first.content);
  assert.equal((await writeIngredientDraft(config, spec, output, true)).status, 'unchanged');
  await writeFile(output, 'human changes');
  assert.equal((await writeIngredientDraft(config, spec, output, true)).status, 'would-change');
  await assert.rejects(writeIngredientDraft(config, spec, output), /EEXIST/);
});

test('ingredient specs preserve declared handoffs and reject incomplete workflows', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-ingredient-workflow-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'spec.yaml');
  const original = await readFile(spec, 'utf8');
  await writeFile(file, `${original}\nworkflow:\n  inputs: { API_BASE: Environment }\n  outputs: { MESSAGE_ID: Returned ID }\n  check: The response says queued.\n`);
  const result = await renderIngredientDraft(config, file);
  assert.match(result.content, /MESSAGE_ID: Returned ID/);
  await writeFile(file, `${original}\nworkflow: { inputs: { API_BASE: Environment } }\n`);
  await assert.rejects(renderIngredientDraft(config, file), /observable success condition/);
  await writeFile(file, `${original}\nworkflow: null\n`);
  await assert.rejects(renderIngredientDraft(config, file), /must be a mapping/);
});
