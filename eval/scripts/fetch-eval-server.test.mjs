import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, get } from 'node:http';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { recordRequests, startFetchEvaluation, summarizeFetchLog } from './fetch-eval-server.mjs';
import { markdownSize } from '../../framework/dist/markdown-size.js';
const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`)));
const close = server => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });

test('server records every repeated request, redirect, missing response and exact Unicode/binary bodies', async t => {
  const records = [];
  const server = createServer((req, res) => {
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    if (req.url === '/redirect') { res.writeHead(302, { Location: '/page' }); res.end(); }
    else if (req.url === '/missing') { res.writeHead(404); res.end('Missing'); }
    else if (req.url === '/binary') { res.setHeader('Content-Type', 'image/png'); res.end(Buffer.from([0, 255, 1])); }
    else if (req.url === '/cached') { res.writeHead(304); res.end('not transmitted'); }
    else { res.write('Crab '); res.end(Buffer.from('🦀 café')); }
  });
  recordRequests(server, 'test', item => records.push(item));
  const origin = await listen(server); t.after(() => close(server));
  for (const route of ['/page', '/page', '/redirect', '/missing', '/binary', '/cached']) await (await fetch(origin + route, { redirect: 'manual' })).arrayBuffer();
  await fetch(origin + '/page', { method: 'HEAD' });
  const responses = records.filter(r => r.event === 'response');
  assert.equal(records.filter(r => r.event === 'request').length, 7);
  assert.equal(responses.length, 7);
  for (const r of responses.slice(0, 2)) {
    assert.equal(r.bodyBytes, Buffer.byteLength('Crab 🦀 café'));
    assert.equal(r.bodyTokens, markdownSize('Crab 🦀 café').markdownTokens);
    assert.equal(r.bodySha256, createHash('sha256').update('Crab 🦀 café').digest('hex'));
    assert.equal(r.complete, true);
  }
  assert.deepEqual(responses.map(r => r.status), [200, 200, 302, 404, 200, 304, 200]);
  assert.equal(responses[4].bodyBytes, 3); assert.equal(responses[4].bodyTokens, null);
  assert.equal(responses[5].bodyBytes, 0); assert.equal(responses[6].bodyBytes, 0);
});

test('an interrupted stream is recorded once as incomplete', async t => {
  let done;
  const recorded = new Promise(resolve => { done = resolve; });
  const server = createServer((_req, res) => { res.setHeader('Content-Type', 'text/plain'); res.write('partial'); });
  const records = [];
  recordRequests(server, 'aborted', item => { records.push(item); if (item.event === 'response') done(item); });
  const origin = await listen(server); t.after(() => close(server));
  get(origin, res => res.once('data', () => res.destroy()));
  const response = await recorded;
  assert.equal(response.complete, false); assert.equal(response.bodyBytes, 7);
  assert.equal(records.filter(r => r.event === 'response').length, 1);
});

async function fixture(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-fetch-eval-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const site = path.join(dir, 'site'); await mkdir(site);
  await writeFile(path.join(site, 'documents.json'), JSON.stringify({schemaVersion:1,documents:[{id:'home',url:'/',markdownUrl:'/index.md',variant:{channel:'production',version:'current',language:'en'}}]}));
  await writeFile(path.join(site, 'resource-headers.json'), JSON.stringify({'/index.md':{'Content-Type':'text/markdown; charset=utf-8'}}));
  await writeFile(path.join(site, 'index.html'), '<p>Home</p>');
  await writeFile(path.join(site, 'index.md'), '# Home 🦀\n');
  return { site, output: path.join(dir, 'requests.jsonl') };
}

test('sessions isolate runs, refuse overwrite, and require a finalized unchanged build', async t => {
  const options = { ...await fixture(t), runs: [{id:'a',port:0},{id:'b',port:0}] };
  const session = await startFetchEvaluation(options); t.after(() => session.close());
  await assert.rejects(startFetchEvaluation(options), /EEXIST/);
  for (const endpoint of session.endpoints) await (await fetch(endpoint.origin + '/index.md')).text();
  await (await fetch(session.endpoints[0].origin + '/index.md')).text();
  assert.equal((await summarizeFetchLog(options.output)).status, 'incomplete');
  assert.equal(await session.close(), 'complete');
  const summary = await summarizeFetchLog(options.output);
  assert.equal(summary.status, 'complete');
  assert.equal(summary.runs.a.requests, 2); assert.equal(summary.runs.b.requests, 1);
  assert.equal(summary.runs.a.bodyBytes, 2 * Buffer.byteLength('# Home 🦀\n'));
  const text = await readFile(options.output, 'utf8');
  const truncated = options.output + '.truncated';
  await writeFile(truncated, text.trim().split('\n').slice(0,-1).join('\n')+'\n');
  assert.equal((await summarizeFetchLog(truncated)).status, 'incomplete');
});

test('changed build cannot finalize as valid evidence', async t => {
  const options = { ...await fixture(t), runs: [{id:'changed',port:0}] };
  const session = await startFetchEvaluation(options); t.after(() => session.close());
  await writeFile(path.join(options.site, 'index.md'), '# Changed\n');
  assert.equal(await session.close(), 'build-changed');
  assert.equal((await summarizeFetchLog(options.output)).status, 'incomplete');
});

test('writeHead-only headers and sent status are captured, including empty 204 bodies', async t => {
  const records = [];
  const server = createServer((req, res) => {
    if (req.url === '/empty') { res.writeHead(204, {'Content-Type':'text/plain'}); res.end('not transmitted'); }
    else {
      res.writeHead(201, 'Created', ['Content-Type', 'text/markdown; charset=utf-8']);
      res.write('hé'); res.statusCode = 500; res.end('llo');
    }
  });
  recordRequests(server, 'headers', entry => records.push(entry));
  const origin = await listen(server); t.after(() => close(server));
  assert.equal((await fetch(origin + '/text')).status, 201);
  await (await fetch(origin + '/empty')).text();
  const responses = records.filter(r => r.event === 'response');
  assert.equal(responses[0].status, 201);
  assert.equal(responses[0].bodyTokens, markdownSize('héllo').markdownTokens);
  assert.equal(responses[1].bodyBytes, 0);
});

test('session log binds experiment/runtime fingerprints and rejects unmatched responses', async t => {
  const options = { ...await fixture(t), runs: [{id:'bound',port:0}] };
  const experimentFile = options.output + '.experiment';
  await writeFile(experimentFile, '{"task":"example"}');
  const session = await startFetchEvaluation({ ...options, experimentFile }); t.after(() => session.close());
  await session.close();
  const header = JSON.parse((await readFile(options.output, 'utf8')).split('\n')[0]);
  assert.equal(header.experimentDigest, createHash('sha256').update('{"task":"example"}').digest('hex'));
  for (const digest of Object.values(header.dependencies)) assert.match(digest, /^[a-f0-9]{64}$/);
  assert.equal(header.nodeVersion, process.version);
  const report = await summarizeFetchLog(options.output);
  assert.equal(report.status, 'complete');
  // A response with no observed request must not silently enter the evidence.
  const bad = options.output + '.bad';
  const records = (await readFile(options.output, 'utf8')).trim().split('\n').map(JSON.parse);
  records.splice(1,0,{event:'response',runId:'bound',requestId:'unknown',bodyBytes:0,bodyTokens:0});
  await writeFile(bad, records.map(r=>JSON.stringify(r)).join('\n')+'\n');
  await assert.rejects(summarizeFetchLog(bad), /Unmatched response/);
});
