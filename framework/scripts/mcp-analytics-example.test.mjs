import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { normalizeMcpClient, safeMcpModelName } from '../dist/mcp-client-metadata.js';

test('PostHog example exports only fixed intent categories and normalized labels', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'mcp-example-safeguards-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const module = path.join(directory, 'node_modules/@posthog/mcp');
  await mkdir(module, { recursive: true });
  await writeFile(path.join(module, 'package.json'), JSON.stringify({ type: 'module', exports: './index.js' }));
  await writeFile(path.join(module, 'index.js'), 'export class PostHogMCP { captureToolCall(event) { globalThis.exampleBasicEvent = event; } } export function instrument(server,client,options) { globalThis.exampleOptions = options; }');
  const source = await readFile(new URL('../examples/mcp-analytics/posthog.mjs', import.meta.url), 'utf8');
  await writeFile(path.join(directory, 'adapter.mjs'), source);
  const old = process.env.POSTHOG_PROJECT_TOKEN;
  process.env.POSTHOG_PROJECT_TOKEN = 'phc_test_only';
  t.after(() => { if (old === undefined) delete process.env.POSTHOG_PROJECT_TOKEN; else process.env.POSTHOG_PROJECT_TOKEN = old; delete globalThis.exampleOptions; delete globalThis.exampleBasicEvent; });
  const adapter = await import(pathToFileURL(path.join(directory, 'adapter.mjs')).href);
  adapter.instrument({ server: {} }, { intent: true, clientMetadata: true, conversationIds: true, buildId: 'public-build', publication: { channel: 'production', version: 'current', language: 'en' }, client: normalizeMcpClient, modelName: safeMcpModelName });
  const options = globalThis.exampleOptions;
  assert.equal(options.enableExceptionAutocapture, false);
  assert.match(options.context.description, /Send only the category/);
  const makeEvent = (intent, model = 'deepseek-chat') => ({ event: '$mcp_tool_call', distinct_id: 'PRIVATE_USER', privateField: 'PRIVATE_TOP_LEVEL', properties: { $mcp_tool_name: 'get_page', $mcp_intent: intent, $mcp_intent_source: 'context_parameter', $mcp_llm_model: model, $mcp_client_name: 'OpenCode', $mcp_client_version: '2.0.29', $mcp_duration_ms: 12, $mcp_error_message: 'PRIVATE_ERROR', arguments: { query: 'PRIVATE_QUERY' }, result: 'PRIVATE_RESULT', headers: { authorization: 'PRIVATE_HEADER' }, $ip: 'PRIVATE_IP', email: 'PRIVATE_EMAIL', $session_id: 'PRIVATE_SESSION' } });
  for (const category of ['discovery', 'setup', 'troubleshooting', 'configuration', 'reference_lookup', 'comparison', 'migration', 'other']) {
    const output = options.beforeSend(makeEvent(category));
    assert.equal(output.properties.$mcp_intent, category);
    assert.equal(output.properties.$mcp_intent_source, 'context_parameter');
    assert.equal(output.properties.$mcp_client_name, 'opencode');
    assert.equal(output.properties.$mcp_llm_model, 'deepseek-chat');
    assert.equal(output.properties.model_identity_verified, false);
    assert.equal(output.properties.$geoip_disable, true);
    assert.equal(output.properties.$process_person_profile, false);
    assert.ok(!JSON.stringify(output).includes('PRIVATE_'));
  }
  for (const intent of ['Find Jane Smith at Acme', 'configuration for PRIVATE_CUSTOMER', 'jane@example.com', 'sk-private-key', 'https://private.example', '', null, {}, 'x'.repeat(500)]) {
    const output = options.beforeSend(makeEvent(intent, 'gpt-PRIVATE_CUSTOMER'));
    assert.equal(output.properties.$mcp_intent, 'reference_lookup');
    assert.equal(output.properties.$mcp_intent_source, 'inferred');
    assert.equal(output.properties.$mcp_llm_model, undefined);
    assert.ok(!JSON.stringify(output).includes('PRIVATE_'));
  }
  const versioned = options.beforeSend(makeEvent('setup', 'deepseek/deepseek-v4.1-flash'));
  assert.equal(versioned.properties.$mcp_llm_model, 'deepseek-v4.1-flash');
  assert.equal(versioned.properties.$mcp_client_name, 'opencode');
  assert.equal(options.beforeSend({ event: '$exception' }), null);
  adapter.capture({ tool: 'get_page', durationMs: 1, isError: false, publication: { channel: 'production', version: 'current', language: 'en' } });
  assert.equal(globalThis.exampleBasicEvent.properties.$geoip_disable, true);
  assert.equal(globalThis.exampleBasicEvent.properties.$process_person_profile, false);
});
