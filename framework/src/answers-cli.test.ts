import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { publicationKey } from './publication-identity.js';

test('answers CLI forwards every publication selector before checking semantic prerequisites', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-answers-scope-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const target = { product: 'analytics', channel: 'production', version: 'v3', language: 'en' };
  const variants = [target, { ...target, product: 'billing' }, { ...target, channel: 'preview' }, { ...target, version: 'v2' }, { ...target, language: 'fr' }];
  await mkdir(path.join(root, 'ai'));
  await writeFile(path.join(root, 'ai/chunks.json'), JSON.stringify({ schemaVersion: 1, sourceDigest: 'fixture', chunks: variants.map((variant, at) => ({
    id: `${encodeURIComponent(publicationKey(variant))}:guide.start#intro`, docId: 'guide.start', type: 'guide', title: 'Start', variant: publicationKey(variant),
    url: `/${at}`, markdownUrl: `/${at}.md`, headingPath: [], text: 'Start here.', digest: `fixture-${at}`,
  })) }));
  const config = path.join(root, 'docs.config.yaml');
  await writeFile(config, JSON.stringify({ schemaVersion: 1, chat: { provider: 'openai', model: 'fixture', baseUrl: 'https://unused.invalid/v1' } }));
  const questions = path.join(root, 'questions.json');
  await writeFile(questions, JSON.stringify(['Where do I start?']));
  const cli = fileURLToPath(new URL('./cli.js', import.meta.url));
  const flags = Object.entries(target).flatMap(([key, value]) => [`--${key}`, value]);
  const run = (selection: string[]) => spawnSync(process.execPath, [cli, 'answers', root, '--questions', questions, '--config', config, ...selection], {
    encoding: 'utf8', timeout: 15_000, env: { ...process.env, OPENAI_API_KEY: '', VOYAGE_API_KEY: '' },
  });
  // No embeddings or provider calls: reaching this next-stage check proves that
  // all four selectors resolved exactly one publication rather than broadening it.
  const selected = run(flags);
  assert.equal(selected.status, 1);
  assert.match(selected.stderr, /Answer cards need semantic search/);
  assert.doesNotMatch(selected.stderr, /Select one publication/);
  for (let at = 0; at < flags.length; at += 2) {
    const ambiguous = run(flags.filter((_, index) => index !== at && index !== at + 1));
    assert.equal(ambiguous.status, 1);
    assert.match(ambiguous.stderr, /Select one publication/, `Omitting ${flags[at]} must remain ambiguous`);
  }
});
