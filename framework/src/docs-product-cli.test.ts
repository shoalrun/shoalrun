import assert from 'node:assert/strict';
import { execFile as execFileCallback } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import test from 'node:test';
import { parseDocsReadOptions } from './docs-command.js';

const execFile = promisify(execFileCallback);
const cli = fileURLToPath(new URL('./cli.js', import.meta.url));
const hash = (value: string) => createHash('sha256').update(value).digest('hex');

test('offline docs CLI selects a product for search, page, outline and section reads', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-docs-product-cli-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const documents = [];
  const searchDocuments = [];
  const publication = { channel: 'production', version: 'v1', language: 'en' };
  for (const product of ['alpha', 'beta']) {
    await mkdir(path.join(directory, product));
    const content = `# Start guide\n\n${product.toUpperCase()}-ONLY-PAGE\n`;
    const sectionContent = `## Configure\n\n${product.toUpperCase()}-ONLY-SECTION\n`;
    const markdownUrl = `/${product}/start.md`;
    const sectionUrl = `/${product}/configure.md`;
    await writeFile(path.join(directory, markdownUrl), content);
    await writeFile(path.join(directory, sectionUrl), sectionContent);
    const doc = { id: 'guide.start', title: 'Start guide', summary: 'Shared product instructions.', type: 'guide', url: `/${product}/start`, markdownUrl, variant: { ...publication, product }, digest: hash(content), sections: [{ id: 'configure', title: 'Configure', markdownUrl: sectionUrl, digest: hash(sectionContent), parentDigest: hash(content), parentMarkdownUrl: markdownUrl }] };
    documents.push(doc);
    searchDocuments.push({ ...doc, variant: `production|v1|en|${product}`, headings: [{ id: 'configure', title: 'Configure' }], text: 'Shared product instructions.' });
  }
  await writeFile(path.join(directory, 'documents.json'), JSON.stringify({ schemaVersion: 1, documents }));
  await writeFile(path.join(directory, 'search-index.json'), JSON.stringify({ schemaVersion: 1, documents: searchDocuments }));
  const commands = [['search', 'Start guide'], ['read', 'guide.start'], ['outline', 'guide.start'], ['section', 'guide.start', 'configure']];
  const flags = ['--site', directory, '--channel', 'production', '--version', 'v1', '--language', 'en', '--json'];
  for (const command of commands) {
    for (const product of ['alpha', 'beta']) {
      const { stdout } = await execFile(process.execPath, [cli, 'docs', ...command, ...flags, '--product', product]);
      const result = JSON.parse(stdout);
      assert.equal(result.status, 'ok', stdout);
      assert.equal(result.publication.product, product, stdout);
      assert.doesNotMatch(stdout, new RegExp(`${product === 'alpha' ? 'BETA' : 'ALPHA'}-ONLY`));
      if (command[0] === 'search') assert.equal(result.results[0].read.arguments.product, product);
      if (command[0] === 'read') assert.match(result.content, new RegExp(`${product.toUpperCase()}-ONLY-PAGE`));
      if (command[0] === 'section') assert.match(result.content, new RegExp(`${product.toUpperCase()}-ONLY-SECTION`));
      if (command[0] === 'outline') assert.equal(result.sections[0].id, 'configure');
    }
    await assert.rejects(execFile(process.execPath, [cli, 'docs', ...command, ...flags]), error => {
      const failure = error as Error & { code: number; stdout: string };
      assert.equal(failure.code, 1);
      assert.equal(JSON.parse(failure.stdout).error.code, 'invalid_input');
      return true;
    });
  }
  // A stdio server serves a built catalog; --product is a tool argument, not a
  // way to silently fix its entire process to a publication.
  assert.throws(() => parseDocsReadOptions(['--product', 'alpha'], true), /Unknown option/);
});
