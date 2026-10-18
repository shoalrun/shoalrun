import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { appendFile, mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { parseReaderView } from './ask-setup.js';
import { chatProviderConfig, chatRoutes, validateChat } from './chat-config.js';
import { validateReaderFilters } from './reader-filters.js';

const cli = path.join(path.dirname(fileURLToPath(import.meta.url)), 'cli.js');
const run = (cwd: string, ...args: string[]) => spawnSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8', env: { ...process.env, OPENROUTER_API_KEY: '', JEV_API_KEY: '', TYPESAFE_API_KEY: '', VOYAGE_API_KEY: '' } });

const full = { provider: 'openai', model: 'deepseek/deepseek-v4-flash', baseUrl: 'https://openrouter.ai/api/v1', keyEnv: 'OPENROUTER_API_KEY', maxTokens: 800, temperature: 0.1, passages: 5, rerank: 'jev', gate: { decline: 0.4, hedge: 0.7 } };

test('chat config accepts a provider and model, and every other setting is optional', () => {
  assert.equal(validateChat(undefined), undefined);
  assert.deepEqual(validateChat({ provider: 'openai', model: ' some/model ' }), { provider: 'openai', model: 'some/model' });
  assert.deepEqual(validateChat(full), { ...full, rerank: { provider: 'jev' } });
});

test('rerank names the scoring service in config, and plain jev still works', () => {
  const named = { provider: 'jev', endpoint: 'https://api.laya.studio', model: 'laya-1', keyEnv: 'LAYA_API_KEY' };
  assert.deepEqual(validateChat({ provider: 'openai', model: 'x', rerank: named, gate: { decline: 0.4, hedge: 0.7 } })?.rerank, named);
  assert.deepEqual(validateChat({ provider: 'openai', model: 'x', rerank: { provider: 'jev', endpoint: 'http://localhost:8080/v1/systemone' } })?.rerank, { provider: 'jev', endpoint: 'http://localhost:8080/v1/systemone' });
  assert.deepEqual(validateChat({ provider: 'openai', model: 'x', rerank: 'jev', cards: {} })?.rerank, { provider: 'jev' });
  assert.equal(validateChat({ provider: 'openai', model: 'x', rerank: { provider: 'jev', stateFormat: 'string' } })?.rerank?.stateFormat, 'string');
  assert.throws(() => validateChat({ provider: 'openai', model: 'x', rerank: { provider: 'jev', stateFormat: 'xml' } }), /stateFormat must be object or string/);
  assert.equal(validateChat({ provider: 'openai', model: 'x', rerank: { provider: 'jev', onError: 'answer' } })?.rerank?.onError, 'answer');
  assert.throws(() => validateChat({ provider: 'openai', model: 'x', rerank: { provider: 'jev', onError: 'ignore' } }), /onError must be search or answer/);
  assert.throws(() => validateChat({ provider: 'openai', model: 'x', verify: { threshold: 0.5 } }), /verify needs chat\.rerank/);
});

test('chat.budget sets daily caps and is checked', () => {
  assert.deepEqual(validateChat({ provider: 'openai', model: 'x', budget: { perCaller: 30, perDay: 500 } })?.budget, { perCaller: 30, perDay: 500 });
  const bad = (budget: unknown, pattern: RegExp) => assert.throws(() => validateChat({ provider: 'openai', model: 'x', budget }), pattern);
  bad(5, /budget must be a mapping/);
  bad({ perCaller: 30 }, /perDay must be an integer/);
  bad({ perCaller: 0, perDay: 10 }, /perCaller must be an integer/);
  bad({ perCaller: 30, perDay: 10 }, /perCaller can not be more than/);
  bad({ perCaller: 3, perDay: 10, perHour: 1 }, /unknown setting perHour/);
});

test('chat.budget.store names environment variables and never holds an address or token', () => {
  const store = { provider: 'upstash', urlEnv: 'KV_REST_API_URL', tokenEnv: 'KV_REST_API_TOKEN' };
  assert.deepEqual(validateChat({ provider: 'openai', model: 'x', budget: { perCaller: 3, perDay: 9, store } })?.budget?.store, store);
  const bad = (value: unknown, pattern: RegExp) => assert.throws(() => validateChat({ provider: 'openai', model: 'x', budget: { perCaller: 3, perDay: 9, store: value } }), pattern);
  bad('redis', /store must be a mapping/);
  bad({ ...store, provider: 'redis' }, /provider must be upstash/);
  bad({ ...store, urlEnv: 'https://x.upstash.io' }, /urlEnv names an environment variable/);
  bad({ ...store, tokenEnv: undefined }, /tokenEnv names an environment variable/);
  bad({ ...store, token: 'abc' }, /token is not a setting. The config never holds an address or token/);
  bad({ ...store, url: 'https://x' }, /url is not a setting/);
  bad({ ...store, region: 'eu' }, /unknown setting region/);
});

test('chat.panel changes the words on the panel, each one optional, and rejects anything else', () => {
  const base = { provider: 'openai', model: 'x' };
  assert.equal(validateChat(base)?.panel, undefined);
  assert.equal(validateChat({ ...base, panel: {} })?.panel, undefined);
  assert.deepEqual(validateChat({ ...base, panel: { title: ' Ask Shoalrun ', placeholder: 'Ask about Shoalrun', intro: 'Ask a question.' } })?.panel, { title: 'Ask Shoalrun', placeholder: 'Ask about Shoalrun', intro: 'Ask a question.' });
  const bad = (panel: unknown, pattern: RegExp) => assert.throws(() => validateChat({ ...base, panel }), pattern);
  bad('Ask about Shoalrun', /must be a mapping/);
  bad({ placeholder: '' }, /placeholder must be text/);
  bad({ title: 3 }, /title must be text/);
  bad({ intro: 'x'.repeat(151) }, /intro must be text of 150 characters or fewer/);
  bad({ label: 'Ask' }, /unknown setting label; it accepts title, placeholder, and intro/);
});

test('chat.log records questions in the budget store, with a notice, and needs that store', () => {
  const budget = { perCaller: 3, perDay: 9, store: { provider: 'upstash', urlEnv: 'KV_REST_API_URL', tokenEnv: 'KV_REST_API_TOKEN' } };
  const base = { provider: 'openai', model: 'x', budget };
  assert.deepEqual(validateChat({ ...base, log: {} })?.log, { retentionDays: 30, maxPerDay: 2000, answers: true, notice: 'Questions are recorded, with personal details removed, to improve these docs.' });
  assert.deepEqual(validateChat({ ...base, log: { retentionDays: 7, maxPerDay: 500, answers: false, notice: ' We keep questions for a week. ' } })?.log, { retentionDays: 7, maxPerDay: 500, answers: false, notice: 'We keep questions for a week.' });
  const bad = (log: unknown, pattern: RegExp, config: object = base) => assert.throws(() => validateChat({ ...config, log }), pattern);
  bad({}, /chat\.log needs chat\.budget\.store/, { provider: 'openai', model: 'x' });
  bad({}, /chat\.log needs chat\.budget\.store/, { provider: 'openai', model: 'x', budget: { perCaller: 1, perDay: 2 } });
  bad('yes', /chat\.log must be a mapping/);
  bad({ retentionDays: 0 }, /retentionDays must be an integer/);
  bad({ maxPerDay: 'many' }, /maxPerDay must be an integer/);
  bad({ answers: 'no' }, /answers must be true or false/);
  bad({ notice: '' }, /notice must be text/);
  bad({ notice: 'x'.repeat(301) }, /notice must be text/);
  bad({ store: 'kv' }, /unknown setting store/);
});

test('chat.challenge names the check, checks nobody until it is needed by default, and never holds a secret', () => {
  const base = { provider: 'openai', model: 'x' };
  const challenge = { provider: 'turnstile', siteKey: '0x4AAAAAAFEqp0VO0aJ5DcUi', secretEnv: 'TURNSTILE_SECRET_KEY' };
  assert.deepEqual(validateChat({ ...base, challenge })?.challenge, { ...challenge, when: 'adaptive', freeQuestions: 3, busyShare: 0.5 });
  assert.deepEqual(validateChat({ ...base, challenge: { ...challenge, when: 'always', freeQuestions: 0, busyShare: 1 } })?.challenge, { ...challenge, when: 'always', freeQuestions: 0, busyShare: 1 });
  const bad = (value: unknown, pattern: RegExp) => assert.throws(() => validateChat({ ...base, challenge: value }), pattern);
  bad('turnstile', /challenge must be a mapping/);
  bad({ ...challenge, provider: 'recaptcha' }, /provider must be turnstile/);
  bad({ ...challenge, siteKey: 'short' }, /siteKey must be the public site key/);
  bad({ ...challenge, secretEnv: '0x4SECRETVALUE' }, /names an environment variable/);
  bad({ ...challenge, secret: 'abc' }, /secret is not a setting. The config never holds a secret/);
  bad({ ...challenge, when: 'sometimes' }, /when must be adaptive or always/);
  bad({ ...challenge, busyShare: 0 }, /busyShare must be a number above 0/);
  bad({ ...challenge, freeQuestions: -1 }, /freeQuestions must be an integer/);
});

test('chat config rejects bad shapes and never holds a key', () => {
  const bad = (value: unknown, pattern: RegExp) => assert.throws(() => validateChat(value), pattern);
  bad('openai', /chat must be a mapping/);
  bad({ model: 'x' }, /chat\.provider must be a nonempty string/);
  bad({ provider: 'anthropic', model: 'x' }, /chat\.provider must be openai/);
  bad({ provider: 'openai' }, /chat\.model must be a nonempty string/);
  bad({ provider: 'openai', model: 'x', flavor: 1 }, /unknown setting flavor/);
  bad({ provider: 'openai', model: 'x', maxTokens: 0 }, /maxTokens must be an integer from 1 to 100000/);
  bad({ provider: 'openai', model: 'x', passages: 50 }, /passages must be an integer from 1 to 20/);
  bad({ provider: 'openai', model: 'x', temperature: 3 }, /temperature must be a number from 0 to 2/);
  bad({ provider: 'openai', model: 'x', baseUrl: 'ftp://host' }, /http or https URL/);
  bad({ provider: 'openai', model: 'x', baseUrl: 'https://u:p@host' }, /must not contain credentials/);
  bad({ provider: 'openai', model: 'x', rerank: 'cohere' }, /rerank must be jev/);
  bad({ provider: 'openai', model: 'x', rerank: { provider: 'cohere' } }, /rerank\.provider must be jev/);
  bad({ provider: 'openai', model: 'x', rerank: { provider: 'jev', apiKey: 'sk-1' } }, /rerank\.apiKey is not a setting. The config never holds a key/);
  bad({ provider: 'openai', model: 'x', rerank: { provider: 'jev', speed: 1 } }, /rerank has an unknown setting speed/);
  bad({ provider: 'openai', model: 'x', rerank: { provider: 'jev', endpoint: 'not a url' } }, /rerank\.endpoint must be a full URL/);
  bad({ provider: 'openai', model: 'x', rerank: { provider: 'jev', endpoint: 'http://scorer.example.com' } }, /must use https, except for localhost/);
  bad({ provider: 'openai', model: 'x', rerank: { provider: 'jev', endpoint: 'https://u:p@scorer.example.com' } }, /must not contain credentials/);
  bad({ provider: 'openai', model: 'x', rerank: { provider: 'jev', endpoint: 'https://scorer.example.com/?key=abc' } }, /must not contain credentials, a query/);
  bad({ provider: 'openai', model: 'x', rerank: { provider: 'jev', keyEnv: 'sk-live 1' } }, /names an environment variable/);
  bad({ provider: 'openai', model: 'x', rerank: 'jev', gate: 0.5 }, /gate must be a mapping/);
  bad({ provider: 'openai', model: 'x', rerank: 'jev', gate: { decline: 0.7, hedge: 0.4 } }, /decline < hedge/);
  bad({ provider: 'openai', model: 'x', rerank: 'jev', gate: { decline: 0.4, hedge: 0.7, extra: 1 } }, /gate has an unknown setting extra/);
  bad({ provider: 'openai', model: 'x', gate: { decline: 0.4, hedge: 0.7 } }, /gate needs chat\.rerank: jev/);
  for (const name of ['apiKey', 'secret', 'token', 'password']) bad({ provider: 'openai', model: 'x', [name]: 'sk-or-abc' }, /never holds a key/);
  for (const pasted of ['sk-or-v1-abc123', 'has space']) bad({ provider: 'openai', model: 'x', keyEnv: pasted }, /names an environment variable/);
});

test('flags override the chat model, and a missing chat section is an error', () => {
  const config = validateChat(full);
  assert.deepEqual(chatProviderConfig(config), { provider: 'openai', model: 'deepseek/deepseek-v4-flash', baseUrl: 'https://openrouter.ai/api/v1', keyEnv: 'OPENROUTER_API_KEY', maxTokens: 800, temperature: 0.1 });
  assert.equal(chatProviderConfig(config, { model: 'qwen/qwen3.7-flash' }).model, 'qwen/qwen3.7-flash');
  assert.equal(chatProviderConfig(config, { keyEnv: 'OTHER' }).keyEnv, 'OTHER');
  assert.throws(() => chatProviderConfig(undefined), /Choose a chat provider and model/);
  assert.throws(() => chatProviderConfig(undefined, { model: 'x' }), /Choose a chat provider and model/);
});

async function project(section?: string): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-chat-config-'));
  assert.equal(run(root, 'init').status, 0);
  if (section) await appendFile(path.join(root, 'docs.config.yaml'), `\n${section}\n`);
  return root;
}

test('the build and config validate check the chat section', async () => {
  const bad = await project('chat:\n  provider: anthropic\n  model: x');
  for (const args of [['build', 'docs.config.yaml', 'site-dist'], ['config', 'validate', 'docs.config.yaml']]) {
    const result = run(bad, ...args);
    assert.equal(result.status, 1, args.join(' '));
    assert.match(result.stderr, /chat\.provider must be openai/);
  }
  const good = await project('chat:\n  provider: openai\n  model: some/model\n  baseUrl: https://openrouter.ai/api/v1\n  keyEnv: OPENROUTER_API_KEY');
  assert.equal(run(good, 'config', 'validate', 'docs.config.yaml').status, 0);
  assert.equal(run(good, 'build', 'docs.config.yaml', 'site-dist').status, 0);
});

test('ask explains what is missing instead of choosing for you', async () => {
  const none = await project();
  assert.equal(run(none, 'build', 'docs.config.yaml', 'site-dist').status, 0);
  assert.match(run(none, 'ask').stderr, /Usage: shoalrun ask/);
  assert.match(run(none, 'ask', 'site-dist', 'How do I install?').stderr, /Choose a chat provider and model/);
  const configured = await project('chat:\n  provider: openai\n  model: some/model\n  baseUrl: https://openrouter.ai/api/v1\n  keyEnv: OPENROUTER_API_KEY');
  assert.equal(run(configured, 'build', 'docs.config.yaml', 'site-dist').status, 0);
  assert.match(run(configured, 'ask', 'site-dist', 'How do I install?').stderr, /No ai\/chunks\.json in site-dist; run shoalrun index first/);
  assert.equal(run(configured, 'index', 'site-dist').status, 0);
  assert.match(run(configured, 'ask', 'site-dist', 'How do I install?').stderr, /Set OPENROUTER_API_KEY to generate answers/);
  assert.match(run(configured, 'ask', 'site-dist', 'q', '--bogus', 'x').stderr, /Usage: shoalrun ask/);
});

const facets = validateReaderFilters({ facets: { audience: { label: 'Audience', options: { authors: 'Authors', maintainers: 'Maintainers' } } } });

test('chat.readerView names who the chat answers for, using the site\'s reader filters', () => {
  const base = { provider: 'openai', model: 'm' };
  assert.deepEqual(validateChat({ ...base, readerView: { audience: ['authors'] } }, facets)?.readerView, { audience: ['authors'] });
  assert.throws(() => validateChat({ ...base, readerView: { audience: ['authors'] } }), /chat\.readerView needs readerFilters\.facets/);
  assert.throws(() => validateChat({ ...base, readerView: { region: ['eu'] } }, facets), /chat\.readerView\.region is not a configured reader filter/);
  assert.throws(() => validateChat({ ...base, readerView: { audience: ['staff'] } }, facets), /chat\.readerView\.audience must be a unique list of configured choices/);
  assert.throws(() => validateChat({ ...base, readerView: { audience: [] } }, facets), /at least one choice/);
  assert.throws(() => validateChat({ ...base, readerView: ['authors'] }, facets), /must be a mapping/);
});

test('--reader-view parses facet=choice lists and rejects anything else', () => {
  assert.equal(parseReaderView([]), undefined);
  assert.deepEqual(parseReaderView(['audience=authors,maintainers', 'persona=ui']), { audience: ['authors', 'maintainers'], persona: ['ui'] });
  assert.throws(() => parseReaderView(['authors']), /needs facet=choice/);
  assert.throws(() => parseReaderView(['audience=']), /needs facet=choice/);
  assert.throws(() => parseReaderView(['audience=a', 'audience=b']), /names audience twice/);
});

test('chat.verify needs Jev and a sensible threshold', () => {
  const base = { provider: 'openai', model: 'm', rerank: 'jev' };
  assert.deepEqual(validateChat({ ...base, verify: { threshold: 0.5 } })?.verify, { threshold: 0.5, onUnsupported: 'flag' });
  assert.deepEqual(validateChat({ ...base, verify: { threshold: 0.4, onUnsupported: 'remove' } })?.verify, { threshold: 0.4, onUnsupported: 'remove' });
  assert.throws(() => validateChat({ provider: 'openai', model: 'm', verify: { threshold: 0.5 } }), /chat\.verify needs chat\.rerank: jev/);
  assert.throws(() => validateChat({ ...base, verify: {} }), /threshold must be a number above 0 and below 1/);
  assert.throws(() => validateChat({ ...base, verify: { threshold: 1 } }), /threshold must be a number above 0 and below 1/);
  assert.throws(() => validateChat({ ...base, verify: { threshold: 0.5, onUnsupported: 'ignore' } }), /onUnsupported must be flag or remove/);
  assert.throws(() => validateChat({ ...base, verify: { threshold: 0.5, extra: 1 } }), /chat\.verify has an unknown setting extra/);
  assert.throws(() => validateChat({ ...base, verify: 0.5 }), /chat\.verify must be a mapping/);
});

test('chat.direct shows the docs word for word, and needs Jev and a threshold at least as high as the gate', () => {
  const base = { provider: 'openai', model: 'm', rerank: 'jev' };
  assert.deepEqual(validateChat({ ...base, direct: { threshold: 0.9 } })?.direct, { threshold: 0.9, maxChars: 1200, margin: 0.1, others: 1 });
  assert.deepEqual(validateChat({ ...base, gate: { decline: 0.4, hedge: 0.7 }, direct: { threshold: 0.7, maxChars: 800, margin: 0.05, others: 0 } })?.direct, { threshold: 0.7, maxChars: 800, margin: 0.05, others: 0 });
  assert.throws(() => validateChat({ provider: 'openai', model: 'm', direct: { threshold: 0.9 } }), /chat\.direct needs chat\.rerank: jev/);
  assert.throws(() => validateChat({ ...base, gate: { decline: 0.4, hedge: 0.7 }, direct: { threshold: 0.6 } }), /at least chat\.gate\.hedge/);
  assert.throws(() => validateChat({ ...base, direct: {} }), /threshold must be a number above 0 and at most 1/);
  assert.throws(() => validateChat({ ...base, direct: { threshold: 1.5 } }), /threshold must be a number/);
  assert.throws(() => validateChat({ ...base, direct: { threshold: 0.9, maxChars: 50 } }), /maxChars must be an integer from 200 to 6000/);
  assert.throws(() => validateChat({ ...base, direct: { threshold: 0.9, extra: 1 } }), /chat\.direct has an unknown setting extra/);
  assert.throws(() => validateChat({ ...base, direct: 0.9 }), /chat\.direct must be a mapping/);
});

test('fallback and escalation models inherit the main settings and override only what they name', () => {
  const config = validateChat({ provider: 'openai', model: 'main/model', baseUrl: 'https://openrouter.ai/api/v1', keyEnv: 'OPENROUTER_API_KEY', maxTokens: 900, rerank: 'jev', verify: { threshold: 0.5 }, fallback: [{ model: 'backup/model' }, { model: 'local/llama', baseUrl: 'http://localhost:11434/v1', keyEnv: 'LOCAL_KEY' }], escalate: { model: 'second/model' } });
  assert.deepEqual(config?.fallback, [{ model: 'backup/model' }, { model: 'local/llama', baseUrl: 'http://localhost:11434/v1', keyEnv: 'LOCAL_KEY' }]);
  assert.deepEqual(config?.escalate, { model: 'second/model', when: ['unsupported-code', 'uncited', 'unsupported-claim'] });
  const routes = chatRoutes(config, chatProviderConfig(config));
  assert.deepEqual(routes.fallbacks.map(item => [item.model, item.baseUrl, item.keyEnv, item.maxTokens]), [['backup/model', 'https://openrouter.ai/api/v1', 'OPENROUTER_API_KEY', 900], ['local/llama', 'http://localhost:11434/v1', 'LOCAL_KEY', 900]]);
  assert.equal(routes.escalate?.config.model, 'second/model');
  assert.deepEqual(chatRoutes(undefined, {}), { fallbacks: [] });
  const noVerify = validateChat({ provider: 'openai', model: 'm', escalate: { model: 'second' } });
  assert.deepEqual(noVerify?.escalate?.when, ['unsupported-code', 'uncited']);
});

test('fallback and escalation reject bad shapes, keys, and triggers', () => {
  const base = { provider: 'openai', model: 'm' };
  const bad = (value: unknown, pattern: RegExp) => assert.throws(() => validateChat({ ...base, ...(value as object) }), pattern);
  bad({ fallback: 'x' }, /chat\.fallback must be a list of one to five models/);
  bad({ fallback: [] }, /one to five models/);
  bad({ fallback: Array(6).fill({ model: 'x' }) }, /one to five models/);
  bad({ fallback: ['x'] }, /chat\.fallback\[0\] must be a mapping/);
  bad({ fallback: [{}] }, /chat\.fallback\[0\]\.model must be a nonempty string/);
  bad({ fallback: [{ model: 'x', apiKey: 'sk-1' }] }, /never holds a key/);
  bad({ fallback: [{ model: 'x', keyEnv: 'sk-or-abc' }] }, /chat\.fallback\[0\]\.keyEnv names an environment variable/);
  bad({ fallback: [{ model: 'x', baseUrl: 'ftp://h' }] }, /baseUrl must be an http or https URL/);
  bad({ fallback: [{ model: 'x', provider: 'anthropic' }] }, /provider must be openai/);
  bad({ fallback: [{ model: 'x', flavor: 1 }] }, /unknown setting flavor/);
  bad({ escalate: {} }, /chat\.escalate\.model must be a nonempty string/);
  bad({ escalate: { model: 'x', when: ['made-up'] } }, /chat\.escalate\.when must be a unique list of unsupported-claim, unsupported-code, uncited/);
  bad({ escalate: { model: 'x', when: [] } }, /unique list/);
  bad({ escalate: { model: 'x', when: ['uncited', 'uncited'] } }, /unique list/);
  bad({ escalate: { model: 'x', when: ['unsupported-claim'] } }, /needs chat\.verify/);
  assert.deepEqual(validateChat({ ...base, rerank: 'jev', verify: { threshold: 0.5 }, escalate: { model: 'x', when: ['unsupported-claim'] } })?.escalate?.when, ['unsupported-claim']);
});

test('chat.cache sets how many answers to keep and for how long', () => {
  const base = { provider: 'openai', model: 'm' };
  assert.deepEqual(validateChat({ ...base, cache: {} })?.cache, { maxEntries: 500, ttlMinutes: 1440 });
  assert.deepEqual(validateChat({ ...base, cache: { maxEntries: 50, ttlMinutes: 60 } })?.cache, { maxEntries: 50, ttlMinutes: 60 });
  assert.throws(() => validateChat({ ...base, cache: 5 }), /chat\.cache must be a mapping/);
  assert.throws(() => validateChat({ ...base, cache: { maxEntries: 0 } }), /maxEntries must be an integer from 1 to 100000/);
  assert.throws(() => validateChat({ ...base, cache: { ttlMinutes: 0 } }), /ttlMinutes must be an integer from 1 to 525600/);
  assert.throws(() => validateChat({ ...base, cache: { size: 3 } }), /chat\.cache has an unknown setting size/);
});

test('chat.cards sets how close a question must be to a card, and needs Jev to confirm', () => {
  const base = { provider: 'openai', model: 'm', rerank: 'jev' };
  assert.deepEqual(validateChat({ ...base, cards: {} })?.cards, { threshold: 0.75, confirm: 0.9 });
  assert.deepEqual(validateChat({ ...base, cards: { threshold: 0.95, confirm: 0.8 } })?.cards, { threshold: 0.95, confirm: 0.8 });
  assert.throws(() => validateChat({ provider: 'openai', model: 'm', cards: {} }), /chat\.cards needs chat\.rerank: jev/);
  assert.throws(() => validateChat({ ...base, cards: { threshold: 0 } }), /threshold must be a number above 0 and at most 1/);
  assert.throws(() => validateChat({ ...base, cards: { confirm: 2 } }), /confirm must be a number/);
  assert.throws(() => validateChat({ ...base, cards: { extra: 1 } }), /chat\.cards has an unknown setting extra/);
  assert.throws(() => validateChat({ ...base, cards: 0.9 }), /chat\.cards must be a mapping/);
});

test('chat.body adds request fields, refuses secrets and owned fields, and each extra model may set its own', () => {
  const base = { provider: 'openai', model: 'm' };
  const config = validateChat({ ...base, body: { reasoning: { enabled: false } }, fallback: [{ model: 'backup' }, { model: 'other', body: { reasoning: { effort: 'high' } } }], escalate: { model: 'second', body: {} } });
  assert.deepEqual(config?.body, { reasoning: { enabled: false } });
  const routes = chatRoutes(config, chatProviderConfig(config));
  assert.deepEqual(routes.fallbacks.map(item => item.body), [{ reasoning: { enabled: false } }, { reasoning: { effort: 'high' } }]);
  assert.deepEqual(routes.escalate?.config.body, {});
  assert.deepEqual(chatProviderConfig(config).body, { reasoning: { enabled: false } });
  const bad = (value: unknown, pattern: RegExp) => assert.throws(() => validateChat({ ...base, ...(value as object) }), pattern);
  bad({ body: 'x' }, /chat\.body must be a mapping of request fields/);
  bad({ body: { model: 'other' } }, /chat\.body\.model is set by Shoalrun and can't be replaced; use chat\.model/);
  bad({ body: { max_tokens: 5 } }, /use chat\.maxTokens/);
  bad({ body: { temperature: 1 } }, /use chat\.temperature/);
  bad({ body: { messages: [] } }, /chat\.body\.messages is set by Shoalrun/);
  bad({ body: { apiKey: 'x' } }, /chat\.body\.apiKey looks like a secret/);
  bad({ body: { provider: { auth_token: 'x' } } }, /chat\.body\.provider\.auth_token looks like a secret/);
  bad({ body: { Authorization: 'Bearer x' } }, /looks like a secret/);
  bad({ body: { a: { b: { c: { d: { e: { f: 1 } } } } } } }, /nests too deeply/);
  bad({ body: { big: 'x'.repeat(2500) } }, /too large; keep it under 2,000 characters/);
  bad({ fallback: [{ model: 'x', body: { secret: 1 } }] }, /chat\.fallback\[0\]\.body\.secret looks like a secret/);
  bad({ escalate: { model: 'x', body: { max_tokens: 1 } } }, /chat\.escalate\.body\.max_tokens is set by Shoalrun/);
});
