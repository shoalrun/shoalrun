import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { buildChunkIndex, chunkMarkdown, embeddingInput, splitBlocks } from './index-build.js';
import { createHash } from 'node:crypto';

const document = { id: 'guide.demo', title: 'Demo guide', type: 'guide', url: '/demo', markdownUrl: '/demo.md', variant: 'production|current|en' };
const filler = (label: string, size = 260) => `${label} ${'word '.repeat(Math.ceil(size / 5))}`.trim();

test('chunks split at h2 and h3 with a heading path, anchors from the search index, and stable ids', () => {
  const markdown = `---\ntitle: Demo\n---\n\n# Demo guide\n\n${filler('Intro.')}\n\n## Install it\n\n${filler('Install text.')}\n\n### Check the version\n\n${filler('Version text.')}\n\n## Configure\n\n${filler('Config text.')}\n`;
  const anchors = [{ id: 'install-it', title: 'Install it' }, { id: 'check-the-version', title: 'Check the version' }, { id: 'configure', title: 'Configure' }];
  const chunks = chunkMarkdown(markdown, document, anchors);
  assert.deepEqual(chunks.map(chunk => chunk.id), ['guide.demo#intro', 'guide.demo#install-it', 'guide.demo#install-it-check-the-version', 'guide.demo#configure']);
  assert.deepEqual(chunks.map(chunk => chunk.headingPath), [[], ['Install it'], ['Install it', 'Check the version'], ['Configure']]);
  assert.deepEqual(chunks.map(chunk => chunk.url), ['/demo', '/demo#install-it', '/demo#check-the-version', '/demo#configure']);
  assert.ok(chunks.every(chunk => !chunk.text.includes('title: Demo') && chunk.variant === 'production|current|en' && chunk.markdownUrl === '/demo.md'));
  assert.deepEqual(chunkMarkdown(markdown, document, anchors).map(chunk => chunk.id), chunks.map(chunk => chunk.id));
});

test('heading-like lines inside fenced code do not start sections', () => {
  const markdown = `# Demo\n\n## Example\n\n\`\`\`sh\n# a comment\n## not a heading\n\n\`\`\`\n\n${filler('After the fence.')}\n`;
  const chunks = chunkMarkdown(markdown, document);
  assert.equal(chunks.length, 1);
  assert.match(chunks[0].text, /## not a heading/);
  assert.match(chunks[0].text, /After the fence/);
});

test('a short section rides along with its first child instead of standing alone', () => {
  const markdown = `# Demo\n\n## Options\n\nPick one.\n\n### First\n\n${filler('First text.')}\n\n### Second\n\n${filler('Second text.')}\n`;
  const chunks = chunkMarkdown(markdown, document);
  assert.deepEqual(chunks.map(chunk => chunk.headingPath), [['Options', 'First'], ['Options', 'Second']]);
  assert.match(chunks[0].text, /^Pick one\./);
});

test('long sections split between blocks, and a large table splits between rows with its header repeated', () => {
  const rows = Array.from({ length: 30 }, (_, at) => `| term${at} | ${'definition '.repeat(12).trim()} |`);
  const table = ['| Term | Meaning |', '| --- | --- |', ...rows].join('\n');
  const chunks = chunkMarkdown(`# Demo\n\n## Terms\n\n${table}\n`, document, [], { maxChars: 600 });
  assert.ok(chunks.length > 2);
  assert.ok(chunks.every(chunk => chunk.text.startsWith('| Term | Meaning |\n| --- | --- |')));
  assert.ok(chunks.every(chunk => chunk.text.length <= 600));
  assert.equal(chunks.flatMap(chunk => chunk.text.split('\n').slice(2)).length, 30);
  assert.deepEqual(chunks.map(chunk => chunk.id), ['guide.demo#terms', 'guide.demo#terms~2', ...chunks.slice(2).map((_, at) => `guide.demo#terms~${at + 3}`)]);
  const paragraphs = Array.from({ length: 6 }, (_, at) => filler(`Paragraph ${at}.`, 300)).join('\n\n');
  assert.ok(chunkMarkdown(`# Demo\n\n## Long\n\n${paragraphs}\n`, document, [], { maxChars: 700 }).length >= 3);
});

test('a code sample larger than the limit stays whole', () => {
  const code = `\`\`\`yaml\n${'key: value\n'.repeat(200)}\`\`\``;
  const chunks = chunkMarkdown(`# Demo\n\n## Sample\n\n${code}\n`, document, [], { maxChars: 500 });
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].text, code);
});

test('digests follow the embedded text and repeated headings get distinct ids', () => {
  const one = chunkMarkdown(`# Demo\n\n## Notes\n\n${filler('One.')}\n\n## Notes\n\n${filler('Two.')}\n`, document);
  assert.equal(new Set(one.map(chunk => chunk.id)).size, 2);
  const changed = chunkMarkdown(`# Demo\n\n## Notes\n\n${filler('One.')} edited\n\n## Notes\n\n${filler('Two.')}\n`, document);
  assert.notEqual(changed[0].digest, one[0].digest);
  assert.equal(changed[1].digest, one[1].digest);
  assert.match(embeddingInput(one[0]), /^Demo guide > Notes\n\nOne\./);
});

test('chunk builds prepare search evidence without changing embedding inputs or digests', () => {
  const markdown = '# Demo\n\nAn explanation.\n\n| Token | Meaning |\n| --- | --- |\n| `--color-header-muted` | Publication label text. |\n\n```sh\nnpm run build\n```\n';
  const [chunk] = chunkMarkdown(markdown, document);
  assert.deepEqual(chunk.search, { schemaVersion: 1, paragraphs: ['An explanation.'], literalLines: ['Token — Meaning', '--color-header-muted — Publication label text.', 'npm run build'] });
  assert.equal(chunk.digest, createHash('sha256').update(embeddingInput(chunk)).digest('hex'));
  assert.equal(embeddingInput(chunk), embeddingInput({ ...chunk, search: undefined } as typeof chunk));
  const [links] = chunkMarkdown('# Demo\n\n- [Diagrams](/diagrams) — Draw charts and graphs.\n', document);
  assert.deepEqual(links.search?.paragraphs, []);
});

async function site(documents: unknown[], files: Record<string, string>, searchIndex?: unknown): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-index-'));
  await writeFile(path.join(directory, 'documents.json'), JSON.stringify({ documents }));
  if (searchIndex) await writeFile(path.join(directory, 'search-index.json'), JSON.stringify(searchIndex));
  for (const [file, content] of Object.entries(files)) { await mkdir(path.dirname(path.join(directory, file)), { recursive: true }); await writeFile(path.join(directory, file), content); }
  return directory;
}

const entry = (markdownUrl: string) => ({ id: 'guide.demo', type: 'guide', title: 'Demo guide', url: '/demo', markdownUrl, digest: 'abc', variant: { channel: 'production', version: 'current', language: 'en' } });

test('buildChunkIndex writes ai/chunks.json from the built Markdown twins', async () => {
  const directory = await site([entry('/demo.md')], { 'demo.md': `# Demo\n\n## Install\n\n${filler('Install.')}\n` }, { schemaVersion: 1, documents: [{ url: '/demo', headings: [{ id: 'install', title: 'Install' }] }] });
  const result = await buildChunkIndex(directory);
  assert.equal(result.documents, 1);
  const written = JSON.parse(await readFile(path.join(directory, 'ai', 'chunks.json'), 'utf8'));
  assert.equal(written.schemaVersion, 1);
  assert.equal(written.chunks[0].url, '/demo#install');
  assert.match(written.sourceDigest, /^[0-9a-f]{64}$/);
});

test('buildChunkIndex works without a search index and refuses paths outside the site', async () => {
  const directory = await site([entry('/demo.md')], { 'demo.md': `# Demo\n\n## Install\n\n${filler('Install.')}\n` });
  assert.equal((await buildChunkIndex(directory)).index.chunks[0].url, '/demo');
  const escaping = await site([entry('/../secret.md')], { 'demo.md': '# Demo\n' });
  await assert.rejects(buildChunkIndex(escaping), /leaves the site directory/);
  await assert.rejects(buildChunkIndex(await mkdtemp(path.join(os.tmpdir(), 'shoalrun-empty-'))), /No documents\.json/);
});

test('buildChunkIndex refuses a page symlinked outside the site and an ai directory symlinked outside', async () => {
  const outside = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-outside-'));
  await writeFile(path.join(outside, 'secret.md'), `# Secret\n\n## Private\n\n${filler('Outside the site.')}\n`);
  const linkedPage = await site([entry('/demo.md')], {});
  await symlink(path.join(outside, 'secret.md'), path.join(linkedPage, 'demo.md'));
  await assert.rejects(buildChunkIndex(linkedPage), /leaves the site directory/);
  const linkedOutput = await site([entry('/demo.md')], { 'demo.md': `# Demo\n\n## Install\n\n${filler('Install.')}\n` });
  await symlink(outside, path.join(linkedOutput, 'ai'));
  await assert.rejects(buildChunkIndex(linkedOutput), /ai directory leaves the site directory/);
  await assert.rejects(readFile(path.join(outside, 'chunks.json')));
});

test('buildChunkIndex rejects a page without a markdownUrl', async () => {
  await assert.rejects(buildChunkIndex(await site([{ ...entry('/demo.md'), markdownUrl: undefined }], {})), /without a markdownUrl/);
});

test('passages carry their page\'s reader marks, and marks do not change a passage\'s digest', async () => {
  const body = `# Demo\n\n## Install\n\n${filler('Install.')}\n`;
  const withMarks = await site([{ ...entry('/demo.md'), readerFilters: { audience: ['maintainers'] } }], { 'demo.md': body });
  const without = await site([entry('/demo.md')], { 'demo.md': body });
  const marked = (await buildChunkIndex(withMarks)).index.chunks;
  const plain = (await buildChunkIndex(without)).index.chunks;
  assert.deepEqual(marked.map(chunk => chunk.readerFilters), [{ audience: ['maintainers'] }]);
  assert.equal('readerFilters' in plain[0], false);
  assert.equal(marked[0].digest, plain[0].digest);
  const empty = await site([{ ...entry('/demo.md'), readerFilters: {} }], { 'demo.md': body });
  assert.equal('readerFilters' in (await buildChunkIndex(empty)).index.chunks[0], false);
});

test('blocks are paragraphs, lists, tables, and whole fences, in order', () => {
  const text = ['First paragraph', 'continues here.', '', '- one', '- two', '', '| A | B |', '| - | - |', '| 1 | 2 |', '', '```yaml', 'a: 1', '', 'b: 2', '```', '', '~~~', 'tilde fence', '', 'with a gap', '~~~', 'Last one'].join('\n');
  assert.deepEqual(splitBlocks(text), ['First paragraph\ncontinues here.', '- one\n- two', '| A | B |\n| - | - |\n| 1 | 2 |', '```yaml\na: 1\n\nb: 2\n```', '~~~\ntilde fence\n\nwith a gap\n~~~', 'Last one']);
  assert.deepEqual(splitBlocks(''), []);
  assert.deepEqual(splitBlocks('   \n\n  '), []);
});
