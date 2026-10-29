import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { requestSamples } from './code-samples.js';
const execute = promisify(execFile);
const samples = (url: string, method = 'get') => requestSamples({ method, url, headers: [], auth: [] });

async function stub(t: any) {
  const server = createServer((request, response) => {
    const variants: Record<string, [string, string]> = {
      '/html': ['text/html; charset=utf-8', '<p>Refund instructions.</p>'],
      '/markdown': ['text/markdown', '## Refunds\n\nRequest within 30 days.'],
      '/json': ['application/json', '{"days":30}'],
      '/problem': ['application/problem+json; charset=utf-8', '{"detail":"Expired"}'],
      '/empty': ['application/json', ''],
    };
    const [mediaType, body] = variants[request.url!] ?? variants['/json'];
    response.writeHead(200, { 'Content-Type': mediaType, 'Content-Length': Buffer.byteLength(body), ETag: '"reviewed"' });
    response.end(request.method === 'HEAD' ? undefined : body);
  });
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  t.after(async () => { server.closeAllConnections(); await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); });
  return `http://127.0.0.1:${(server.address() as { port: number }).port}`;
}

test('copied JavaScript and Node samples decode JSON, text and empty bodies and inspect HEAD headers', async t => {
  const base = await stub(t);
  for (const language of ['javascript', 'node']) {
    for (const [route, expected] of [['/html', '<p>Refund instructions.</p>'], ['/markdown', '## Refunds\n\nRequest within 30 days.'], ['/json', { days: 30 }], ['/problem', { detail: 'Expired' }], ['/empty', '']] as const) {
      const code = samples(base + route).find(item => item.language === language)!.code;
      const logs: unknown[][] = [];
      await new Function('fetch', 'console', `return (async () => {${code}\n})()`)(fetch, { log: (...values: unknown[]) => logs.push(values) });
      assert.deepEqual(logs, [[expected]], `${language} ${route}`);
    }
    const code = samples(base + '/json', 'HEAD').find(item => item.language === language)!.code;
    const logs: any[][] = [];
    await new Function('fetch', 'console', `return (async () => {${code}\n})()`)(fetch, { log: (...values: unknown[]) => logs.push(values) });
    assert.equal(logs[0][0], 200);
    assert.equal(logs[0][1].etag, '"reviewed"');
    assert.equal(logs[0][1]['content-length'], '11');
  }
});

test('copied curl HEAD sample completes despite nonzero Content-Length and GET retains text', async t => {
  const base = await stub(t);
  const head = samples(base + '/json', 'head')[0].code;
  const result = await execute('/bin/sh', ['-c', head], { timeout: 3000 });
  assert.match(result.stdout, /HTTP\/1\.1 200/);
  assert.match(result.stdout, /content-length: 11/i);
  assert.match(result.stdout, /etag: "reviewed"/i);
  assert.doesNotMatch(result.stdout, /"days":30/);
  const get = await execute('/bin/sh', ['-c', samples(base + '/html')[0].code], { timeout: 3000 });
  assert.equal(get.stdout, '<p>Refund instructions.</p>');
});

test('copied Python samples preserve JSON values and avoid parsing text or HEAD bodies', async t => {
  try { await execute('python3', ['--version']); } catch (error: any) { if (error.code === 'ENOENT') { t.skip('Python is unavailable'); return; } throw error; }
  for (const [method, mediaType, body, expected] of [
    ['get', 'text/html', '<p>Refunds</p>', '<p>Refunds</p>'],
    ['get', 'text/markdown', '# Refunds', '# Refunds'],
    ['get', 'application/json', '{"days":30}', "{'days': 30}"],
    ['get', 'application/problem+json; charset=utf-8', '{"detail":"Expired"}', "{'detail': 'Expired'}"],
    ['get', 'application/json', '', ''],
    ['head', 'application/json', '', "200 {'Content-Type': 'application/json', 'ETag': '\"reviewed\"'}"],
  ]) {
    const code = samples('https://api.example.test/resource', method).find(item => item.language === 'python')!.code;
    const bootstrap = `import sys, types, json\nresponse = types.SimpleNamespace(text=${JSON.stringify(body)}, headers={'Content-Type': ${JSON.stringify(mediaType)}, 'ETag': '\"reviewed\"'}, status_code=200)\nresponse.json = lambda: json.loads(response.text)\nsys.modules['requests'] = types.SimpleNamespace(get=lambda *a, **kw: response, head=lambda *a, **kw: response)\n`;
    const result = await execute('python3', ['-c', bootstrap + code]);
    assert.equal(result.stdout.trimEnd(), expected, `${method} ${mediaType}`);
  }
});

test('copied Ruby HEAD sample reports headers over a local HTTP origin', async t => {
  try { await execute('ruby', ['--version']); } catch (error: any) { if (error.code === 'ENOENT') { t.skip('Ruby is unavailable'); return; } throw error; }
  const base = await stub(t);
  const code = samples(base + '/json', 'HEAD').find(item => item.language === 'ruby')!.code;
  const result = await execute('ruby', ['-e', code], { timeout: 3000 });
  assert.match(result.stdout, /^200\n/);
  assert.match(result.stdout, /reviewed/);
  assert.doesNotMatch(result.stdout, /days/);
});
