import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import test from 'node:test';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderRecipeDraft, writeRecipeDraft } from './recipe-draft.js';

const fixture = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../example-configs/notifications');
const config = path.join(fixture, 'docs.config.yaml');
const spec = path.join(fixture, 'recipe-specs/send-welcome-email.yaml');

test('recipe draft assembles ordered ingredients and remains reviewable', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-recipe-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const output = path.join(directory, 'draft.mdx');
  const first = await renderRecipeDraft(config, spec);
  assert.deepEqual(await renderRecipeDraft(config, spec), first);
  assert.match(first.content, /type: recipe/);
  assert.match(first.content, /policy: draft/);
  assert.match(first.content, /operations:\n  - notifications.send-email/);
  assert.ok(first.content.indexOf('## Queue the welcome email') < first.content.indexOf('## Check delivery for that message'));
  assert.match(first.content, /--request POST/);
  assert.match(first.content, /same message ID you saved/);
  assert.match(first.content, /Use `MESSAGE_ID` from \*\*Queue the welcome email/);
  assert.equal(first.content.match(/Have cURL and Node.js available/g)?.length, 1);
  assert.equal(first.content.match(/## Before you start/g)?.length, 1);
  assert.doesNotMatch(first.content, /\[\[TODO:/);
  assert.equal((await writeRecipeDraft(config, spec, output, true)).status, 'would-create');
  assert.equal((await writeRecipeDraft(config, spec, output)).status, 'created');
  assert.equal(await readFile(output, 'utf8'), first.content);
  assert.equal((await writeRecipeDraft(config, spec, output, true)).status, 'unchanged');
  await writeFile(output, 'human changes');
  assert.equal((await writeRecipeDraft(config, spec, output, true)).status, 'would-change');
  await assert.rejects(writeRecipeDraft(config, spec, output), /EEXIST/);
});

test('recipe draft rejects repeated ingredients and files outside the project', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-recipe-validation-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const specFile = path.join(directory, 'recipe.yaml');
  const ingredient = path.join(fixture, 'ingredient-drafts/queue-welcome-email.mdx');
  const base = `schemaVersion: 1\nid: recipe.check\ntitle: Check\nsummary: Check ingredients.\nslug: /recipes/check\ningredients:\n`;
  await writeFile(specFile, `${base}  - ${ingredient}\n  - ${ingredient}\n`);
  await assert.rejects(renderRecipeDraft(config, specFile), /repeats ingredient/);
  const outside = path.join(directory, 'outside.mdx');
  await writeFile(outside, '---\nid: ingredient.outside\ntitle: Outside\ntype: ingredient\n---\n\nContent\n');
  await writeFile(specFile, `${base}  - ${outside}\n`);
  await assert.rejects(renderRecipeDraft(config, specFile), /inside the project/);
});

test('recipe workflows reject missing inputs, reversed handoffs, and duplicate outputs', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-workflow-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'recipe.yaml');
  const queue = path.join(fixture, 'ingredients/queue-welcome-email.mdx');
  const delivery = path.join(fixture, 'ingredients/check-delivery.mdx');
  const base = 'schemaVersion: 1\nid: recipe.test\ntitle: Test\nsummary: Test.\nslug: /test\n';
  await writeFile(file, `${base}ingredients: [${queue}, ${delivery}]\n`);
  await assert.rejects(renderRecipeDraft(config, file), /needs API_BASE/);
  await writeFile(file, `${base}inputs: { API_BASE: The environment }\ningredients: [${delivery}, ${queue}]\n`);
  await assert.rejects(renderRecipeDraft(config, file), /needs MESSAGE_ID/);
  await writeFile(file, `${base}inputs: { API_BASE: The environment, MESSAGE_ID: An old ID }\ningredients: [${queue}, ${delivery}]\n`);
  await assert.rejects(renderRecipeDraft(config, file), /repeats output MESSAGE_ID/);
});
