import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { startDev } from './dev.js';

test('dev server closes with a live reload connection open', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-dev-close-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const example = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../example/docs.config.yaml');
  const server = await startDev(example, path.join(directory, 'site'), '127.0.0.1', 0);
  const port = (server.address() as { port: number }).port;
  const response = await fetch(`http://127.0.0.1:${port}/__shoalrun/reload`);
  assert.equal(response.headers.get('content-type'), 'text/event-stream');
  const reader = response.body!.getReader();
  assert.match(new TextDecoder().decode((await reader.read()).value), /connected/);

  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())),
      new Promise<never>((_resolve, reject) => { timeout = setTimeout(() => reject(new Error('Dev server did not close with a live reload client')), 2000); }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
  assert.equal((await reader.read()).done, true);
});

test('dev rebuilds when an included file outside the project changes', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-dev-external-'));
  const project = path.join(directory, 'project');
  const fixture = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../example-configs/minimal');
  await cp(fixture, project, { recursive: true });
  const config = path.join(project, 'docs.config.yaml');
  const original = await readFile(config, 'utf8');
  await writeFile(config, original.replace('site:\n  title: Acme handbook', 'site:\n  $include: ../site.yaml'));
  const shared = path.join(directory, 'site.yaml');
  await writeFile(shared, 'title: First handbook\n');
  const server = await startDev(config, path.join(project, 'dist'), '127.0.0.1', 0);
  t.after(async () => { await new Promise<void>(resolve => server.close(() => resolve())); await rm(directory, { recursive: true, force: true }); });
  const port = (server.address() as { port: number }).port;
  const page = async () => (await fetch(`http://127.0.0.1:${port}/`)).text();
  assert.match(await page(), /First handbook/);
  await writeFile(shared, 'title: Second handbook\n');
  for (const deadline = Date.now() + 8000; Date.now() < deadline; await new Promise(resolve => setTimeout(resolve, 100))) {
    if ((await page()).includes('Second handbook')) return;
  }
  assert.fail('External config change did not rebuild the site');
});
