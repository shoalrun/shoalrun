import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import test from 'node:test';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateCookbooks } from './cookbook-chooser.js';
import { compile } from './compiler.js';

const fixture = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../example-configs/notifications');

test('cookbook configuration requires distinct reviewed recipe options', () => {
  const base = { 'notify-users': { title: 'Notify users', options: [{ id: 'email', label: 'Email', doc: 'recipe.email' }, { id: 'push', label: 'Push', doc: 'recipe.push' }] } };
  assert.equal(validateCookbooks(base, 'config')['notify-users'].options.length, 2);
  assert.throws(() => validateCookbooks({ 'notify-users': { ...base['notify-users'], options: [...base['notify-users'].options, { id: 'email', label: 'SMS', doc: 'recipe.sms' }] } }, 'config'), /repeats an ID/);
  assert.throws(() => validateCookbooks({ 'notify-users': { ...base['notify-users'], options: [{ id: 'email', label: 'Email', doc: 'recipe.email' }, { id: 'push', label: 'email', doc: 'recipe.push' }] } }, 'config'), /repeats a label/);
  assert.throws(() => validateCookbooks({ 'notify-users': { ...base['notify-users'], options: [{ id: 'email', label: 'Email', doc: 'recipe.email' }, { id: 'push', label: 'Push', doc: 'recipe.email' }] } }, 'config'), /repeats a recipe target/);
  assert.throws(() => validateCookbooks({ 'notify-users': { ...base['notify-users'], options: [{ id: 'email', label: 'Email' }] } }, 'config'), /needs an ID, label, and recipe document ID/);
});

test('cookbook chooser publishes ordered recipe sources in HTML and Markdown', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-cookbook-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const result = await compile(path.join(fixture, 'docs.config.yaml'), directory);
  const cookbook = result.documents.find(doc => doc.id === 'cookbook.notify-users');
  assert.ok(cookbook);
  assert.deepEqual(cookbook.cardTargets, ['recipe.queue-email', 'recipe.queue-push', 'recipe.queue-sms']);
  const markdown = await readFile(path.join(directory, 'cookbooks/notify-users.md'), 'utf8');
  const html = await readFile(path.join(directory, 'cookbooks/notify-users/index.html'), 'utf8');
  assert.match(markdown, /Email — Queue a welcome email/);
  assert.match(markdown, /Push — Queue a welcome push notification/);
  assert.doesNotMatch(markdown, /queue-email-push/);
  assert.doesNotMatch(markdown, /<CookbookChooser|<input/);
  assert.match(html, /data-cookbook-chooser=/);
  assert.match(html, /cookbook-chooser\.js/);
  assert.match(html, /data-cookbook-chooser="\{&#x22;options&#x22;:/);
  assert.doesNotMatch(html, /queue-email-push/);
});

test('single-choice cookbooks validate choice guidance and keep it in both formats', async t => {
  const options = [{ id: 'delivery', label: 'Delivery', doc: 'recipe.delivery', when: 'You need delivery confirmation', needs: 'A message ID', outcome: 'A terminal status' }];
  assert.equal(validateCookbooks({ welcome: { title: 'Welcome', mode: 'single', options } }, 'config').welcome.mode, 'single');
  assert.throws(() => validateCookbooks({ welcome: { title: 'Welcome', mode: 'automatic', options } }, 'config'), /mode must be/);
  assert.throws(() => validateCookbooks({ welcome: { title: 'Welcome', options: [{ ...options[0], needs: [] }] } }, 'config'), /must be nonempty text/);
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-cookbook-single-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await compile(path.join(fixture, 'docs.config.yaml'), directory);
  const markdown = await readFile(path.join(directory, 'cookbooks/welcome-email.md'), 'utf8');
  const html = await readFile(path.join(directory, 'cookbooks/welcome-email/index.html'), 'utf8');
  assert.match(markdown, /Choose one recipe/);
  assert.match(markdown, /You will have: A delivery status tied to the message/);
  assert.match(html, /type="radio"/);
  assert.match(html, /Download Markdown/);
});
