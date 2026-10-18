import test from 'node:test';
import assert from 'node:assert/strict';
import { CLIENT_INFO_META_KEY, type ServerContext } from '@modelcontextprotocol/server';
import { mcpClientMetadata } from './mcp-client-metadata.js';
import { resolveMcp } from './mcp-config.js';
const context = (metadata: Record<string, unknown> = {}, headers: Record<string, string> = {}, client?: unknown): ServerContext => ({
  mcpReq: { _meta: metadata, ...(client ? { envelope: { [CLIENT_INFO_META_KEY]: client } } : {}) },
  http: { req: new Request('https://docs.example/mcp', { headers }) },
}) as ServerContext;

test('metadata captures only known bounded client/model labels and marks claims unverified', () => {
  assert.deepEqual(mcpClientMetadata(context({ 'x-codex-turn-metadata': { model: 'gpt-6.1', prompt: 'PRIVATE_PROMPT', arbitrary: 'SECRET' } }, {}, { name: 'codex', version: '0.99.1', title: 'private workstation' })), {
    client: { name: 'codex', version: '0.99.1', source: 'client_metadata', verified: false },
    model: { name: 'gpt-6.1', source: 'client_metadata', verified: false },
  });
  assert.deepEqual(mcpClientMetadata(context()), {});
  assert.deepEqual(mcpClientMetadata(context({}, {}, { name: 'private-user@example.com', version: 'API_TOKEN' })), {});
  assert.equal(mcpClientMetadata(context({}, {}, { name: 'Cursor', version: '1.2.3-private-name' })).client?.version, undefined);
});

test('header fallbacks normalize harness labels without exporting raw headers or forwarding identities', () => {
  const output = mcpClientMetadata(context({}, { 'user-agent': 'codex/0.99.1 (private-host; /Users/private)', authorization: 'Bearer secret', 'x-forwarded-for': '10.0.0.1' }));
  assert.deepEqual(output, { client: { name: 'codex', source: 'user_agent', verified: false } });
  assert.deepEqual(mcpClientMetadata(context({}, { 'user-agent': 'private-user@example.com', 'x-anthropic-client': 'claude-code/1.2.3' })), { client: { name: 'claude-code', source: 'vendor_header', verified: false } });
  assert.deepEqual(mcpClientMetadata(context({}, { 'user-agent': 'a'.repeat(513) + ' codex/1', 'x-client-name': 'cursor' })), {});
  assert.deepEqual(mcpClientMetadata(context({}, { 'user-agent': 'private-codex/1.2' })), {});
});

test('malformed model metadata, credentials, paths, and unrelated fields are dropped', () => {
  for (const model of [null, 5, {}, ['gpt-6.1'], 'unknown', 'https://private.example/model', 'gpt-user@example.com', 'gpt-'+ 'a'.repeat(100), 'gpt-sk-private', 'gpt-secret', 'gpt-phc_private', '/Users/private/model', 'some-private-value', 'gpt-6.1\nprivate', 'gpt-jane-smith', 'gpt-6.1-acme-private', 'claude-sonnet-jane', 'deepseek-customer-name']) assert.equal(mcpClientMetadata(context({ 'x-codex-turn-metadata': { model } })).model, undefined);
  assert.deepEqual(mcpClientMetadata(context({ model: 'gpt-6.1', llm_model: 'gpt-6.1', context: 'private intent' })), {});
});

test('client metadata is separately opt-in and strictly validates its switch', () => {
  const base = { enabled: true, access: 'public', publication: { channel: 'production', version: 'current', language: 'en' } };
  assert.equal(resolveMcp({ ...base, analytics: { module: './adapter.mjs' } })?.analytics?.clientMetadata, undefined);
  assert.equal(resolveMcp({ ...base, analytics: { module: './adapter.mjs', clientMetadata: false } })?.analytics?.clientMetadata, undefined);
  assert.equal(resolveMcp({ ...base, analytics: { module: './adapter.mjs', clientMetadata: true } })?.analytics?.clientMetadata, true);
  for (const key of ['intent', 'conversationIds']) {
    assert.equal((resolveMcp({ ...base, analytics: { module: './adapter.mjs', [key]: true } })?.analytics as any)[key], true);
    assert.throws(() => resolveMcp({ ...base, analytics: { module: './adapter.mjs', [key]: 'true' } }), /boolean/);
  }
  for (const value of ['true', {}, 1, null]) assert.throws(() => resolveMcp({ ...base, analytics: { module: './adapter.mjs', clientMetadata: value } }), /boolean/);
});

test('OpenCode session markers identify the client without retaining a session identifier', () => {
  const marker = 'ses_PRIVATESESSION123';
  const labels = mcpClientMetadata(context({ 'ai.opencode/sessionID': marker }));
  assert.deepEqual(labels, { client: { name: 'opencode', source: 'client_marker', verified: false } });
  assert.ok(!JSON.stringify(labels).includes(marker));
  for (const value of [null, {}, 'private-user@example.com', 'ses_'+ 'a'.repeat(129)]) assert.deepEqual(mcpClientMetadata(context({ 'ai.opencode/sessionID': value })), {});
});

test('model registry preserves supported labels and drops arbitrary family-prefixed strings', () => {
  for (const model of ['deepseek-chat', 'gpt-6.1', 'claude-sonnet-4-6']) assert.equal(mcpClientMetadata(context({ 'x-codex-turn-metadata': { model } })).model?.name, model);
  assert.equal(mcpClientMetadata(context({ 'x-codex-turn-metadata': { model: 'openai/gpt-6.1' } })).model?.name, 'gpt-6.1');
  assert.equal(mcpClientMetadata(context({ 'x-codex-turn-metadata': { model: 'deepseek/deepseek-v4.1-flash' } })).model?.name, 'deepseek-v4.1-flash');
});
