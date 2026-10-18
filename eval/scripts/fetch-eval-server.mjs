// Local evaluation instrumentation. No model/provider calls and no source builds.
import { createHash } from 'node:crypto';
import { openSync, writeSync, closeSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createSiteServer } from '../../framework/dist/server.js';
import { evalBuildSnapshot } from '../../framework/dist/docs-eval.js';
import { markdownSize } from '../../framework/dist/markdown-size.js';
const sha = value => createHash('sha256').update(value).digest('hex');

// Bytes submitted to Node's response stream, not proof the client/model read them.
export function recordRequests(server, runId, record) {
  let sequence = 0;
  server.prependListener('request', (request, response) => {
    const requestId = `${runId}:${++sequence}`;
    record({ event: 'request', runId, requestId, method: request.method, url: request.url });
    const chunks = [];
    let sent;
    const writeHead = response.writeHead;
    response.writeHead = function (...args) {
      const result = writeHead.apply(this, args);
      const headers = typeof args[1] === 'string' ? args[2] : args[1];
      const entries = Array.isArray(headers) ? Array.from({length: headers.length / 2}, (_, i) => [headers[2 * i], headers[2 * i + 1]]) : Object.entries(headers ?? {});
      const explicitType = entries.filter(([name]) => String(name).toLowerCase() === 'content-type').at(-1)?.[1];
      sent = { status: args[0], contentType: String(explicitType ?? this.getHeader('content-type') ?? '') };
      return result;
    };
    const capture = (chunk, encoding) => {
      if (typeof chunk === 'string') chunks.push(Buffer.from(chunk, typeof encoding === 'string' ? encoding : 'utf8'));
      else if (chunk instanceof Uint8Array) chunks.push(Buffer.from(chunk));
    };
    const write = response.write, end = response.end;
    response.write = function (...args) { capture(args[0], args[1]); return write.apply(this, args); };
    response.end = function (...args) { capture(args[0], args[1]); return end.apply(this, args); };
    let recorded = false;
    const finish = complete => {
      if (recorded) return;
      recorded = true;
      const status = sent?.status ?? null;
      const noBody = request.method === 'HEAD' || [204, 304].includes(status);
      const body = noBody ? Buffer.alloc(0) : Buffer.concat(chunks);
      const contentType = sent?.contentType ?? '';
      const textual = /^(text\/|application\/(?:json|javascript|xml)|image\/svg\+xml)/i.test(contentType);
      record({ event: 'response', runId, requestId, status, complete,
        contentType, bodyBytes: body.length, bodySha256: sha(body),
        bodyTokens: textual ? markdownSize(body.toString('utf8')).markdownTokens : null,
        tokenEncoding: textual ? 'cl100k_base' : null });
    };
    response.once('finish', () => finish(true));
    response.once('close', () => finish(false));
  });
}

export async function startFetchEvaluation({ site, output, runs, experimentFile }) {
  if (!Array.isArray(runs) || !runs.length || runs.some(run => !/^[a-z0-9-]+$/.test(run.id) || !Number.isInteger(run.port) || run.port < 0 || run.port > 65535) || new Set(runs.map(run => run.id)).size !== runs.length) throw new Error('Invalid runs');
  const before = await evalBuildSnapshot(site);
  const frameworkRequire = createRequire(new URL('../../framework/package.json', import.meta.url));
  const files = ['server.js', 'markdown-size.js', 'docs-eval.js'];
  const dependencies = Object.fromEntries(await Promise.all(files.map(async name => [name, sha(await readFile(new URL(`../../framework/dist/${name}`, import.meta.url)))])));
  dependencies['js-tiktoken-entry'] = sha(await readFile(frameworkRequire.resolve('js-tiktoken')));
  dependencies['framework-lockfile'] = sha(await readFile(new URL('../../framework/package-lock.json', import.meta.url)));
  const experimentDigest = experimentFile ? sha(await readFile(experimentFile)) : null;
  const fd = openSync(output, 'wx'); // Never replace prior evidence.
  const record = item => writeSync(fd, `${JSON.stringify({ ...item, recordedAt: new Date().toISOString() })}\n`);
  record({ event: 'start', schemaVersion: 1, buildDigest: before.buildDigest, runs, nodeVersion: process.version, dependencies, experimentDigest,
    runnerDigest: sha(await readFile(fileURLToPath(import.meta.url))),
    limits: 'Server-observed requests and response-stream bytes, not model-visible content or billed tokens. Pre-HTTP connection failures cannot be observed here. Binary bodies have no token estimate.' });
  const servers = [];
  let closed = false;
  try {
    const endpoints = [];
    for (const run of runs) {
      const server = await createSiteServer(site);
      servers.push(server);
      recordRequests(server, run.id, record);
      await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(run.port, '127.0.0.1', resolve);
      });
      const origin = `http://127.0.0.1:${server.address().port}`;
      endpoints.push({ id: run.id, origin });
    }
    record({ event: 'ready', endpoints });
    return { endpoints, async close() {
      if (closed) return;
      closed = true;
      await Promise.all(servers.map(server => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); })));
      try {
        const after = await evalBuildSnapshot(site);
        const status = before.buildDigest === after.buildDigest ? 'complete' : 'build-changed';
        record({ event: 'stop', status, buildDigest: after.buildDigest });
        return status;
      } catch (error) { record({ event: 'stop', status: 'error', message: error.message }); throw error; }
      finally { closeSync(fd); }
    } };
  } catch (error) {
    await Promise.all(servers.map(server => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); })));
    record({ event: 'stop', status: 'error', message: error.message });
    closeSync(fd);
    throw error;
  }
}

export async function summarizeFetchLog(filename) {
  const raw = await readFile(filename, 'utf8');
  const events = raw.trim().split('\n').map(line => JSON.parse(line));
  const start = events[0], stop = events.at(-1);
  if (start?.event !== 'start' || start.schemaVersion !== 1) throw new Error('Missing log header');
  const requests = new Map(), runs = Object.fromEntries(start.runs.map(run => [run.id, { requests: 0, responses: 0, successfulGets: 0, incompleteResponses: 0, bodyBytes: 0, bodyTokens: 0, uncountedTokenResponses: 0 }]));
  for (const entry of events) {
    if (entry.event === 'request') {
      if (!runs[entry.runId] || requests.has(entry.requestId)) throw new Error('Unknown run or duplicate request');
      requests.set(entry.requestId, { ...entry, response: null });
      runs[entry.runId].requests++;
    } else if (entry.event === 'response') {
      const request = requests.get(entry.requestId);
      if (!request || request.response || request.runId !== entry.runId) throw new Error('Unmatched response');
      request.response = entry;
      const run = runs[entry.runId];
      run.responses++;
      if (!entry.complete) run.incompleteResponses++;
      if (request.method === 'GET' && entry.status === 200 && entry.complete) run.successfulGets++;
      run.bodyBytes += entry.bodyBytes;
      run.bodyTokens += entry.bodyTokens ?? 0;
      if (entry.bodyTokens === null) run.uncountedTokenResponses++;
    }
  }
  const finalized = stop?.event === 'stop' && stop.status === 'complete' && stop.buildDigest === start.buildDigest && [...requests.values()].every(request => request.response);
  return { status: finalized ? 'complete' : 'incomplete', buildDigest: start.buildDigest, logDigest: sha(raw), runs, requests: [...requests.values()] };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === 'report') {
    const report = await summarizeFetchLog(process.argv[3]);
    console.log(JSON.stringify(report, null, 2));
    if (report.status !== 'complete') process.exitCode = 1;
  } else {
    const [site, output, runFile, experimentFile] = process.argv.slice(2);
    if (!site || !output || !runFile) throw new Error('Usage: fetch-eval-server.mjs SITE NEW-LOG.jsonl RUNS.json [EXPERIMENT.json] | report LOG.jsonl');
    const session = await startFetchEvaluation({ site, output, runs: JSON.parse(await readFile(runFile, 'utf8')), experimentFile });
    console.log(JSON.stringify({ endpoints: session.endpoints }));
    const stop = async () => { const status = await session.close(); if (status && status !== 'complete') process.exitCode = 1; };
    process.once('SIGINT', stop); process.once('SIGTERM', stop);
  }
}
