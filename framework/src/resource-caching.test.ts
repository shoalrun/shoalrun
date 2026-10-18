import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import YAML from 'yaml';
import { compile } from './compiler.js';
import { serveSite } from './server.js';
import { buildVercel } from './vercel.js';

const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
test('content-addressed contracts, Markdown record links and validators work on Node and Vercel', async t => {
  const directory = await mkdtemp(path.join(tmpdir(), 'shoalrun-cache-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await cp(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../example-configs/api-docs'), directory, { recursive: true });
  const config = path.join(directory, 'docs.config.yaml');
  const output = path.join(directory, 'output');
  const manifest = await compile(config, output);
  const doc = manifest.documents.find(doc => doc.focusedContractUrl)!;
  const contractUrl = doc.focusedContractUrl!;
  const bytes = await readFile(path.join(output, contractUrl));
  assert.ok(contractUrl.endsWith(`-${sha(bytes)}.json`));
  assert.equal((await compile(config, output)).documents.find(item => item.id === doc.id)!.focusedContractUrl, contractUrl);
  const server = await serveSite(output, '127.0.0.1', 0);
  t.after(() => new Promise<void>(resolve => server.close(() => resolve())));
  const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const contract = await fetch(origin + contractUrl);
  assert.equal(contract.headers.get('cache-control'), 'public, max-age=31536000, immutable');
  assert.equal(contract.headers.get('etag'), `"${sha(bytes)}"`);
  assert.deepEqual(Buffer.from(await contract.arrayBuffer()), bytes);
  for (const method of ['GET', 'HEAD']) {
    const response = await fetch(origin + contractUrl, { method, headers: { 'If-None-Match': `"other", W/"${sha(bytes)}"` } });
    assert.equal(response.status, 304);
    assert.equal(await response.text(), '');
    assert.equal(response.headers.get('etag'), `"${sha(bytes)}"`);
  }
  assert.equal((await fetch(origin + contractUrl, { headers: { 'If-None-Match': '"different"' } })).status, 200);
  for (const url of [doc.markdownUrl, doc.url]) {
    const response = await fetch(origin + url, { headers: { Accept: 'text/markdown' } });
    assert.equal(response.headers.get('etag'), `"${doc.digest}"`);
    assert.equal(response.headers.get('cache-control'), 'public, max-age=0, must-revalidate');
    const link = response.headers.get('link')!;
    const index = Number(/#\/documents\/(\d+)>; rel="describedby"/.exec(link)![1]);
    assert.equal(manifest.documents[index].markdownUrl, doc.markdownUrl);
    assert.equal(sha(Buffer.from(await response.arrayBuffer())), doc.digest);
    const unchanged = await fetch(origin + url, { headers: { Accept: 'text/markdown', 'If-None-Match': `"${doc.digest}"` } });
    assert.equal(unchanged.status, 304);
    if (url === doc.url) assert.equal(unchanged.headers.get('vary'), 'Accept');
  }
  for (const name of ['documents.json', 'documents.sync.json', 'build-info.json', 'search-index.json', 'search-index.min.json']) assert.equal((await fetch(`${origin}/${name}`)).headers.get('cache-control'), 'public, max-age=0, must-revalidate');
  const vercel = path.join(directory, 'vercel');
  await buildVercel(config, vercel);
  const deployment = JSON.parse(await readFile(path.join(vercel, 'config.json'), 'utf8'));
  const contractRule = deployment.routes.find((rule: any) => rule.headers?.ETag === `"${sha(bytes)}"`);
  assert.equal(contractRule.headers['Cache-Control'], 'public, max-age=31536000, immutable');
  assert.ok(new RegExp(contractRule.src).test(contractUrl));
  assert.ok(deployment.routes.some((rule: any) => rule.headers?.['Cache-Control'] === 'public, max-age=0, must-revalidate' && new RegExp(rule.src).test('/documents.sync.json')));
  const source = path.join(directory, 'apis/cedar-parcel.yaml');
  const api = YAML.parse(await readFile(source, 'utf8'));
  api.info.title += ' revised';
  await writeFile(source, YAML.stringify(api));
  const changed = await compile(config, output, {}, { apiReview: 'report' });
  const updated = changed.documents.find(item => item.id === doc.id)!;
  assert.notEqual(updated.focusedContractUrl, contractUrl, 'same operation with changed bytes must have a new URL');
  const newBytes = await readFile(path.join(output, updated.focusedContractUrl!));
  assert.ok(updated.focusedContractUrl!.endsWith(`-${sha(newBytes)}.json`));
});
