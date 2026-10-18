import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { appendFile, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { embeddingProviderConfig, queryProviderConfig, validateRetrieval } from './retrieval-config.js';

const cli = path.join(path.dirname(fileURLToPath(import.meta.url)), 'cli.js');
const run = (cwd: string, ...args: string[]) => spawnSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8', env: { ...process.env, VOYAGE_API_KEY: '', OPENAI_API_KEY: '' } });

test('retrieval config accepts a provider and model, and nothing else is required', () => {
  assert.equal(validateRetrieval(undefined), undefined);
  assert.deepEqual(validateRetrieval({}), {});
  assert.deepEqual(validateRetrieval({ embeddings: { provider: 'voyage', model: 'voyage-4-large', dimension: 1024, queryModel: 'voyage-4-lite', keyEnv: 'MY_VOYAGE_KEY' } }), { embeddings: { provider: 'voyage', model: 'voyage-4-large', dimension: 1024, queryModel: 'voyage-4-lite', keyEnv: 'MY_VOYAGE_KEY' } });
  assert.deepEqual(validateRetrieval({ embeddings: { provider: 'openai', model: ' text-embedding-3-small ', baseUrl: 'http://localhost:11434/v1', keyEnv: 'OPENAI_API_KEY' } }), { embeddings: { provider: 'openai', model: 'text-embedding-3-small', baseUrl: 'http://localhost:11434/v1', keyEnv: 'OPENAI_API_KEY' } });
});

test('retrieval config rejects bad shapes with a message that names the setting', () => {
  const bad = (value: unknown, pattern: RegExp) => assert.throws(() => validateRetrieval(value), pattern);
  bad('voyage', /retrieval must be a mapping/);
  bad({ chat: {} }, /unknown setting chat/);
  bad({ embeddings: 'voyage' }, /retrieval\.embeddings must be a mapping/);
  bad({ embeddings: { model: 'x' } }, /provider must be a nonempty string/);
  bad({ embeddings: { provider: 'cohere', model: 'x' } }, /provider must be one of voyage, openai/);
  bad({ embeddings: { provider: 'voyage' } }, /model must be a nonempty string/);
  bad({ embeddings: { provider: 'voyage', model: 'x', dimension: 0 } }, /dimension must be a positive integer/);
  bad({ embeddings: { provider: 'voyage', model: 'x', dimension: '1024' } }, /dimension must be a positive integer/);
  bad({ embeddings: { provider: 'voyage', model: 'x', flavor: 'y' } }, /unknown setting flavor/);
  bad({ embeddings: { provider: 'voyage', model: 'x', baseUrl: 'https://example.com' } }, /baseUrl applies only to the openai provider/);
  bad({ embeddings: { provider: 'openai', model: 'x', baseUrl: 'not a url' } }, /must be an http or https URL/);
  bad({ embeddings: { provider: 'openai', model: 'x', baseUrl: 'ftp://example.com' } }, /must be an http or https URL/);
  bad({ embeddings: { provider: 'openai', model: 'x', baseUrl: 'https://user:pass@example.com' } }, /must not contain credentials/);
});

test('retrieval config never holds a key', () => {
  for (const name of ['apiKey', 'api_key', 'secret', 'token', 'password']) assert.throws(() => validateRetrieval({ embeddings: { provider: 'voyage', model: 'x', [name]: 'pa-abcdef' } }), /never holds a key; name the environment variable that does with keyEnv/);
  for (const pasted of ['pa-abcdef123456', 'sk-proj-abc123', 'has space', '1STARTSWITHDIGIT']) assert.throws(() => validateRetrieval({ embeddings: { provider: 'voyage', model: 'x', keyEnv: pasted } }), /names an environment variable/);
});

test('flags override the config, and a different provider does not inherit the config provider\'s settings', () => {
  const config = validateRetrieval({ embeddings: { provider: 'openai', model: 'text-embedding-3-small', dimension: 512, baseUrl: 'http://localhost:11434/v1', keyEnv: 'LOCAL_KEY', queryModel: 'q' } });
  assert.throws(() => embeddingProviderConfig(undefined), /Choose an embedding provider and model/);
  assert.throws(() => embeddingProviderConfig(undefined, { provider: 'voyage' }), /Choose an embedding provider and model/);
  assert.deepEqual(embeddingProviderConfig(config), { provider: 'openai', model: 'text-embedding-3-small', dimension: 512, baseUrl: 'http://localhost:11434/v1', keyEnv: 'LOCAL_KEY' });
  assert.deepEqual(embeddingProviderConfig(config, { model: 'text-embedding-3-large', dimension: 256 }), { provider: 'openai', model: 'text-embedding-3-large', dimension: 256, baseUrl: 'http://localhost:11434/v1', keyEnv: 'LOCAL_KEY' });
  assert.deepEqual(embeddingProviderConfig(config, { provider: 'voyage', model: 'voyage-4-lite' }), { provider: 'voyage', model: 'voyage-4-lite', dimension: undefined, baseUrl: undefined, keyEnv: undefined });
  assert.deepEqual(embeddingProviderConfig(undefined, { provider: 'openai', model: 'm', dimension: 8, baseUrl: 'http://x', keyEnv: 'K' }), { provider: 'openai', model: 'm', dimension: 8, baseUrl: 'http://x', keyEnv: 'K' });
});

test('queries use the flag, then the config queryModel, then the model that embedded the passages', () => {
  const stored = { provider: 'voyage', model: 'voyage-4-large', dimension: 1024 };
  const config = validateRetrieval({ embeddings: { provider: 'voyage', model: 'voyage-4-large', queryModel: 'voyage-4-lite', keyEnv: 'K' } });
  assert.equal(queryProviderConfig(config, stored).model, 'voyage-4-lite');
  assert.equal(queryProviderConfig(config, stored).keyEnv, 'K');
  assert.equal(queryProviderConfig(config, stored, { model: 'voyage-4' }).model, 'voyage-4');
  assert.equal(queryProviderConfig(undefined, stored).model, 'voyage-4-large');
  assert.equal(queryProviderConfig(config, { ...stored, provider: 'openai', model: 'text-embedding-3-small' }).model, 'text-embedding-3-small');
  assert.equal(queryProviderConfig(config, stored).dimension, 1024);
});

async function project(retrieval?: string): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-retrieval-config-'));
  assert.equal(run(root, 'init').status, 0);
  if (retrieval) await appendFile(path.join(root, 'docs.config.yaml'), `\n${retrieval}\n`);
  return root;
}

test('the build and config validate reject a bad retrieval section and accept a good one', async () => {
  const bad = await project('retrieval:\n  embeddings:\n    provider: cohere\n    model: x');
  for (const args of [['build', 'docs.config.yaml', 'site-dist'], ['config', 'validate', 'docs.config.yaml']]) {
    const result = run(bad, ...args);
    assert.equal(result.status, 1, args.join(' '));
    assert.match(result.stderr, /retrieval\.embeddings\.provider must be one of voyage, openai/);
  }
  const good = await project('retrieval:\n  embeddings:\n    provider: voyage\n    model: voyage-4-large\n    dimension: 1024');
  assert.equal(run(good, 'config', 'validate', 'docs.config.yaml').status, 0);
  const build = run(good, 'build', 'docs.config.yaml', 'site-dist');
  assert.equal(build.status, 0, build.stderr);
  assert.equal(JSON.parse(await readFile(path.join(good, 'site-dist', 'documents.json'), 'utf8')).documents.length > 0, true);
});

test('index --embed takes the provider from the project config, with flags as overrides, and never defaults one', async () => {
  const none = await project();
  const site = path.join(none, 'site-dist');
  assert.equal(run(none, 'build', 'docs.config.yaml', 'site-dist').status, 0);
  const missing = run(none, 'index', site, '--embed');
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /Choose an embedding provider and model: set retrieval\.embeddings in docs\.config\.yaml, or pass --provider and --model/);
  assert.match(run(none, 'index', site, '--embed', '--provider', 'voyage').stderr, /Choose an embedding provider and model/);
  assert.match(run(none, 'index', site, '--model', 'x').stderr, /Embedding options need --embed/);
  assert.match(run(none, 'index', site, '--embed', '--config', 'missing.yaml', '--provider', 'voyage', '--model', 'm').stderr, /missing\.yaml/);

  const configured = await project('retrieval:\n  embeddings:\n    provider: voyage\n    model: voyage-4-large');
  assert.equal(run(configured, 'build', 'docs.config.yaml', 'site-dist').status, 0);
  const noKey = run(configured, 'index', 'site-dist', '--embed');
  assert.equal(noKey.status, 1);
  assert.match(noKey.stderr, /Set VOYAGE_API_KEY to embed text/);
  const renamed = spawnSync(process.execPath, [cli, 'index', 'site-dist', '--embed', '--key-env', 'MY_EMBED_KEY'], { cwd: configured, encoding: 'utf8', env: { ...process.env, VOYAGE_API_KEY: '', MY_EMBED_KEY: '' } });
  assert.match(renamed.stderr, /Set MY_EMBED_KEY to embed text/);
  assert.match(run(configured, 'index', 'site-dist', '--embed', '--provider', 'voyage', '--model', 'voyage-4-large', '--base-url', 'https://x.example').stderr, /baseUrl applies only to the openai provider/);
});
