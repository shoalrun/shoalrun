import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createChatProvider, fallbackChat, openAIChatProvider, type ChatProvider } from './chat.js';

type Call = { url: string; headers: Record<string, string>; body: { model: string; messages: Array<{ role: string; content: string }>; max_tokens?: number; temperature?: number } };

function fakeChat(respond: (call: Call, attempt: number) => Response = () => Response.json({ model: 'served-model', choices: [{ finish_reason: 'stop', message: { content: '  The answer [1].  ' } }], usage: { prompt_tokens: 120, completion_tokens: 12 } })) {
  const calls: Call[] = [];
  const send = (async (url: string, init: RequestInit) => {
    const call = { url, headers: init.headers as Record<string, string>, body: JSON.parse(init.body as string) } as Call;
    calls.push(call);
    return respond(call, calls.length);
  }) as unknown as typeof fetch;
  return { calls, send };
}

const messages = [{ role: 'system' as const, content: 'Be brief.' }, { role: 'user' as const, content: 'Hi' }];

test('the chat provider sends the standard request to the configured base URL and returns text and usage', async () => {
  const { calls, send } = fakeChat();
  const provider = openAIChatProvider({ model: 'some/model', apiKey: 'test-key', baseUrl: 'https://openrouter.ai/api/v1/', maxTokens: 500, temperature: 0.2, fetch: send });
  const result = await provider.complete(messages);
  assert.deepEqual({ name: provider.name, model: provider.model }, { name: 'openai', model: 'some/model' });
  assert.equal(calls[0].url, 'https://openrouter.ai/api/v1/chat/completions');
  assert.equal(calls[0].headers.authorization, 'Bearer test-key');
  assert.deepEqual(calls[0].body, { model: 'some/model', messages, max_tokens: 500, temperature: 0.2 });
  assert.deepEqual(result, { text: 'The answer [1].', finishReason: 'stop', model: 'served-model', promptTokens: 120, completionTokens: 12 });
  await provider.complete(messages, { maxTokens: 50 });
  assert.equal(calls[1].body.max_tokens, 50);
  await openAIChatProvider({ model: 'm', apiKey: 'k', fetch: send }).complete(messages);
  assert.equal('max_tokens' in calls[2].body, false);
  assert.equal('temperature' in calls[2].body, false);
});

test('the chat provider reads the key from the named variable, and a local server needs none', async () => {
  const { calls, send } = fakeChat();
  const saved = { openai: process.env.OPENAI_API_KEY, router: process.env.MY_ROUTER_KEY };
  try {
    delete process.env.OPENAI_API_KEY; delete process.env.MY_ROUTER_KEY;
    await assert.rejects(openAIChatProvider({ model: 'm', fetch: send }).complete(messages), /Set OPENAI_API_KEY to generate answers/);
    await assert.rejects(openAIChatProvider({ model: 'm', baseUrl: 'https://openrouter.ai/api/v1', keyEnv: 'MY_ROUTER_KEY', fetch: send }).complete(messages), /Set MY_ROUTER_KEY/);
    process.env.MY_ROUTER_KEY = 'router-key';
    await openAIChatProvider({ model: 'm', baseUrl: 'https://openrouter.ai/api/v1', keyEnv: 'MY_ROUTER_KEY', fetch: send }).complete(messages);
    assert.equal(calls.at(-1)?.headers.authorization, 'Bearer router-key');
    await openAIChatProvider({ model: 'llama3', baseUrl: 'http://localhost:11434/v1', fetch: send }).complete(messages);
    assert.equal(calls.at(-1)?.headers.authorization, undefined);
  } finally {
    delete process.env.MY_ROUTER_KEY;
    if (saved.openai !== undefined) process.env.OPENAI_API_KEY = saved.openai;
  }
});

test('the chat provider reports unusable replies clearly and never leaks the key', async () => {
  const parts = fakeChat(() => Response.json({ choices: [{ message: { content: [{ type: 'text', text: 'Part one. ' }, { type: 'text', text: 'Part two.' }] } }] }));
  assert.equal((await openAIChatProvider({ model: 'm', apiKey: 'k', fetch: parts.send }).complete(messages)).text, 'Part one. Part two.');
  const upstream = fakeChat(() => Response.json({ error: { message: 'Provider returned error' } }));
  await assert.rejects(openAIChatProvider({ model: 'm', apiKey: 'k', fetch: upstream.send }).complete(messages), /Chat API returned an error: Provider returned error/);
  const truncated = fakeChat(() => Response.json({ choices: [{ finish_reason: 'length', message: { content: '' } }] }));
  await assert.rejects(openAIChatProvider({ model: 'm', apiKey: 'k', fetch: truncated.send }).complete(messages), /no answer text \(finish reason: length\); a reasoning model may need a larger chat\.maxTokens/);
  const denied = fakeChat(() => Response.json({ error: { message: 'No auth credentials found' } }, { status: 401 }));
  await assert.rejects(openAIChatProvider({ model: 'm', apiKey: 'sk-or-secret-value', fetch: denied.send, retryDelayMs: 0 }).complete(messages), (error: Error) => { assert.match(error.message, /401: No auth credentials found/); assert.doesNotMatch(error.message, /sk-or-secret-value/); return true; });
  let attempts = 0;
  const flaky = fakeChat((call, attempt) => { attempts = attempt; return attempt < 3 ? new Response('busy', { status: attempt === 1 ? 429 : 502 }) : Response.json({ choices: [{ message: { content: 'ok' } }] }); });
  assert.equal((await openAIChatProvider({ model: 'm', apiKey: 'k', fetch: flaky.send, retryDelayMs: 0 }).complete(messages)).text, 'ok');
  assert.equal(attempts, 3);
});

test('chat providers redact an echoed credential in both HTTP and successful error responses', async () => {
  const key = 'FAKE_REVIEW_KEY';
  const provider = (status: number) => openAIChatProvider({ model: 'm', apiKey: key, retries: 0, fetch: async () => Response.json({ error: { message: `Invalid token ${key}` } }, { status }) });
  for (const status of [200, 401]) await assert.rejects(provider(status).complete(messages), (error: Error) => {
    assert.match(error.message, /Invalid token \[redacted\]/);
    assert.doesNotMatch(error.message, /FAKE_REVIEW_KEY/);
    return true;
  });
});

test('a cancelled provider retry does not start a fallback model', async () => {
  const controller = new AbortController();
  let first = 0;
  let fallback = 0;
  const chat = fallbackChat([
    openAIChatProvider({ model: 'first', apiKey: 'k', retryDelayMs: 1000, fetch: async () => { first++; controller.abort(new Error('deadline')); return new Response('busy', { status: 429 }); } }),
    { name: 'stub', model: 'second', complete: async () => { fallback++; return { text: 'late' }; } }
  ]);
  await assert.rejects(chat.complete(messages, { signal: controller.signal }), /deadline/);
  assert.equal(first, 1);
  assert.equal(fallback, 0);
});

test('there is no default chat provider or model', () => {
  assert.throws(() => createChatProvider(), /Choose a chat provider/);
  assert.throws(() => createChatProvider({ provider: 'openai' }), /Choose a chat model for openai/);
  assert.throws(() => createChatProvider({ provider: 'anthropic', model: 'x' }), /Unknown chat provider anthropic/);
  assert.equal(createChatProvider({ provider: 'openai', model: 'm' }).model, 'm');
  assert.throws(() => openAIChatProvider({} as never), /Choose a chat model/);
});

test('an empty reply that stopped normally is retried once, but one that hit the token limit is not', async () => {
  const empty = () => Response.json({ choices: [{ finish_reason: 'stop', message: { content: '' } }] });
  const ok = () => Response.json({ choices: [{ finish_reason: 'stop', message: { content: 'Second try.' } }] });
  const once = fakeChat((_call, attempt) => attempt === 1 ? empty() : ok());
  assert.equal((await openAIChatProvider({ model: 'm', apiKey: 'k', fetch: once.send }).complete(messages)).text, 'Second try.');
  assert.equal(once.calls.length, 2);
  const twice = fakeChat(empty);
  await assert.rejects(openAIChatProvider({ model: 'm', apiKey: 'k', fetch: twice.send }).complete(messages), /no answer text \(finish reason: stop\)/);
  assert.equal(twice.calls.length, 2);
  const limit = fakeChat(() => Response.json({ choices: [{ finish_reason: 'length', message: { content: '' } }] }));
  await assert.rejects(openAIChatProvider({ model: 'm', apiKey: 'k', fetch: limit.send }).complete(messages), /finish reason: length/);
  assert.equal(limit.calls.length, 1);
});

const stub = (model: string, behave: () => string | Error): ChatProvider & { calls: number } => { const item = { calls: 0, name: 'openai', model, async complete() { item.calls++; const reply = behave(); if (reply instanceof Error) throw reply; return { text: reply }; } }; return item; };

test('fallback tries models in order, and says which answered and which failed', async () => {
  const main = stub('main/model', () => 'from main');
  const backup = stub('backup/model', () => 'from backup');
  const fine = await fallbackChat([main, backup]).complete(messages);
  assert.deepEqual({ text: fine.text, route: fine.route, backupCalls: backup.calls }, { text: 'from main', route: { model: 'main/model', failed: [] }, backupCalls: 0 });
  const down = stub('main/model', () => new Error('Chat API returned 503'));
  const recovered = await fallbackChat([down, backup]).complete(messages);
  assert.deepEqual({ text: recovered.text, route: recovered.route }, { text: 'from backup', route: { model: 'backup/model', failed: [{ model: 'main/model', error: 'Chat API returned 503' }] } });
  const both = fallbackChat([down, stub('backup/model', () => new Error('Chat API returned no answer text'))]);
  await assert.rejects(both.complete(messages), /Every model failed: main\/model: Chat API returned 503; backup\/model: Chat API returned no answer text/);
  const only = stub('only/model', () => 'x');
  assert.equal(fallbackChat([only]), only);
  assert.throws(() => fallbackChat([]), /at least one provider/);
});

test('extra body fields are sent with every request but never replace what the tool owns', async () => {
  const { calls, send } = fakeChat();
  const provider = openAIChatProvider({ model: 'real/model', apiKey: 'k', maxTokens: 300, temperature: 0.1, fetch: send, body: { reasoning: { enabled: false }, provider: { order: ['DeepInfra'] }, model: 'sneaky/model', messages: [], max_tokens: 1, temperature: 2 } });
  await provider.complete(messages);
  const body = calls[0].body as unknown as Record<string, unknown>;
  assert.deepEqual({ reasoning: body.reasoning, provider: body.provider, model: body.model, max_tokens: body.max_tokens, temperature: body.temperature, sameMessages: JSON.stringify(body.messages) === JSON.stringify(messages) }, { reasoning: { enabled: false }, provider: { order: ['DeepInfra'] }, model: 'real/model', max_tokens: 300, temperature: 0.1, sameMessages: true });
  const plain = fakeChat();
  await openAIChatProvider({ model: 'm', apiKey: 'k', fetch: plain.send }).complete(messages);
  assert.equal('reasoning' in (plain.calls[0].body as unknown as Record<string, unknown>), false);
});
