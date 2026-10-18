import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requestSamples, type RequestSample } from './code-samples.js';

const sample: RequestSample = {
  method: 'post',
  url: 'https://api.example.test/v1/items/YOUR_ID?filter=YOUR_FILTER',
  headers: [{ name: 'Idempotency-Key', value: 'YOUR_IDEMPOTENCY_KEY' }],
  auth: [{ kind: 'bearer', token: 'YOUR_TOKEN' }],
  contentType: 'application/json',
  body: { mediaType: 'application/json', text: '{"amount":1250}', formFields: [] }
};

test('request samples lead with a stable cURL sample and cover every language', () => {
  const samples = requestSamples(sample);
  assert.equal(samples[0].language, 'curl');
  assert.ok(samples[0].code.startsWith("curl --request POST \\\n  --url 'https://api.example.test/v1/items/YOUR_ID?filter=YOUR_FILTER'"));
  assert.ok(samples[0].code.includes("--header 'Authorization: Bearer YOUR_TOKEN'"));
  assert.ok(samples[0].code.includes("--header 'Idempotency-Key: YOUR_IDEMPOTENCY_KEY'"));
  assert.ok(samples[0].code.includes("--header 'Content-Type: application/json'"));
  assert.ok(samples[0].code.includes("--data-raw '{\"amount\":1250}'"));
  assert.deepEqual(samples.map(s => s.language), ['curl', 'javascript', 'node', 'python', 'go', 'java', 'php', 'ruby', 'csharp']);
  for (const entry of samples) assert.ok(entry.code.includes(sample.url), entry.language);
  for (const entry of samples) assert.ok(entry.code.includes('YOUR_IDEMPOTENCY_KEY'), entry.language);
});

test('multipart requests produce only a cURL sample', () => {
  const samples = requestSamples({ method: 'post', url: 'https://upload.test/upload', headers: [], auth: [], body: { mediaType: 'multipart/form-data', text: '', formFields: ['file'] } });
  assert.deepEqual(samples.map(s => s.language), ['curl']);
  assert.match(samples[0].code, /--form 'file=@YOUR_FILE'/);
  assert.doesNotMatch(samples[0].code, /Content-Type|--data-raw/);
});

test('query API keys and basic auth reach every language', () => {
  const samples = requestSamples({ method: 'get', url: 'https://api.test/items?api_key=YOUR_API_KEY', headers: [], auth: [{ kind: 'basic', user: 'YOUR_USERNAME', pass: 'YOUR_PASSWORD' }] });
  assert.match(samples[0].code, /--user 'YOUR_USERNAME:YOUR_PASSWORD'/);
  for (const entry of samples) assert.ok(entry.code.includes('api_key=YOUR_API_KEY'), entry.language);
  for (const entry of samples.filter(entry => entry.language !== 'curl')) assert.ok(entry.code.includes('Basic <base64 of YOUR_USERNAME:YOUR_PASSWORD>'), entry.language);
});
