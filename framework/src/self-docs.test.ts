import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getEncoding } from 'js-tiktoken';
import { getDocumentationPage, searchDocumentation } from './documentation-core.js';
const bundle = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../agent-docs');
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
test('pinned documentation snapshot has complete verified pages, sections, metadata and lookup', async () => {
  const snapshot = JSON.parse(await readFile(path.join(bundle, 'SNAPSHOT.json'), 'utf8'));
  const manifestBytes = await readFile(path.join(bundle, 'documents.json'));
  const indexBytes = await readFile(path.join(bundle, 'search-index.json'));
  assert.equal(hash(manifestBytes), snapshot.manifestDigest);
  assert.equal(hash(indexBytes), snapshot.indexDigest);
  assert.match(snapshot.sourceCommit, /^[a-f0-9]{40}$/);
  assert.equal(snapshot.sourceRepository, 'https://github.com/shoalrun/docs');
  const manifest = JSON.parse(manifestBytes.toString());
  const index = JSON.parse(indexBytes.toString());
  assert.equal(manifest.buildId, undefined, 'Markdown subset does not claim the full site identity');
  assert.ok(manifest.documents.length > 0);
  assert.equal(index.documents.length, manifest.documents.length);
  const tokenizer = getEncoding('cl100k_base');
  for (const doc of manifest.documents) {
    const bytes = await readFile(path.join(bundle, doc.markdownUrl));
    assert.equal(hash(bytes), doc.digest, doc.id);
    assert.equal(bytes.length, doc.markdownBytes);
    assert.equal(tokenizer.encode(bytes.toString(), [], []).length, doc.markdownTokens);
    const record = index.documents.find((item: any) => item.id === doc.id && item.markdownUrl === doc.markdownUrl);
    assert.ok(record, doc.id);
    assert.equal(record.demo, doc.demo);
    for (const section of doc.sections) {
      const content = await readFile(path.join(bundle, section.markdownUrl));
      assert.equal(hash(content), section.digest);
      assert.equal(content.length, section.markdownBytes);
      assert.equal(section.parentDigest, doc.digest);
      assert.equal(tokenizer.encode(content.toString(), [], []).length, section.markdownTokens);
    }
  }
  const page = await getDocumentationPage(bundle, 'guide.custom-components', { maxTokens: 30000 });
  assert.match(page.content, /content\(\)/);
  assert.equal(page.content, await readFile(path.join(bundle, 'author/components/custom.md'), 'utf8'));
  const results = await searchDocumentation(bundle, 'getting started');
  assert.ok(results.results.some(item => item.id === 'guide.overview'));
});
