import test from 'node:test';
import assert from 'node:assert/strict';
import { boundedDiscovery, compactDiscoveryTokenLimit, type DiscoveryEntry } from './compact-discovery.js';
import { markdownTokens } from './markdown-size.js';
import { parsePlainMarkdown } from './semantic-markdown.js';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { compile } from './compiler.js';

const links = (markdown: string): string[] => {
  const walk = (node: any): string[] => [...(node.type === 'link' ? [node.url] : []), ...(node.children ?? []).flatMap(walk)];
  return parsePlainMarkdown(markdown).flatMap(walk);
};
const options = { route: '/docs/llms.min.txt', directory: '/docs/.well-known/shoalrun/discovery', intro: '# Documentation\n\n[Complete catalog](/docs/llms.txt).', flat: 'Long catalog. '.repeat(1500) };
function fixtures(count: number, topics = 8): DiscoveryEntry[] {
  return Array.from({ length: count }, (_, n) => {
    const id = String(n).padStart(6, '0');
    return { key: `/docs/pages/${id}.md`, title: `Task ${id}`, topic: `topic-${n % topics}`, topicLabel: `Topic ${n % topics}`, markdown: `- [Task ${id}](/docs/pages/${id}.md): Configure this task, verify its outcome, and resolve errors.\n  - Standalone section: [Checks](/docs/pages/${id}.sections/checks.md) — 120 tokens (cl100k_base), 600 UTF-8 bytes. [Full page](/docs/pages/${id}.md).` };
  });
}
function crawl(artifacts: Map<string, string>, route = options.route) {
  const visited = new Set<string>(), pages = new Set<string>();
  const visit = (url: string) => {
    if (visited.has(url)) return;
    visited.add(url);
    const content = artifacts.get(url);
    assert.ok(content !== undefined, `Missing index ${url}`);
    assert.ok(markdownTokens(content) <= compactDiscoveryTokenLimit, `Oversized index ${url}`);
    for (const link of links(content)) {
      if (artifacts.has(link)) visit(link);
      else if (link !== '/docs/llms.txt') pages.add(link);
    }
  };
  visit(route);
  assert.equal(visited.size, artifacts.size, 'no orphaned index files');
  return pages;
}

test('small discovery catalogs retain their existing representation', () => {
  const flat = '# Small site\n\n- [Start](/docs/start.md)\n';
  assert.deepEqual([...boundedDiscovery({ ...options, flat, entries: [] })], [[options.route, flat]]);
});

test('growing catalogs preserve every page and standalone fallback without growing index budgets', () => {
  for (const count of [160, 1600]) {
    const entries = fixtures(count);
    const artifacts = boundedDiscovery({ ...options, entries });
    const pages = crawl(artifacts);
    for (const entry of entries) for (const url of links(entry.markdown)) assert.ok(pages.has(url), url);
    assert.equal(pages.size, count * 2);
    assert.deepEqual([...boundedDiscovery({ ...options, entries: [...entries].reverse() })], [...artifacts], 'input enumeration cannot change output');
  }
});

test('both a single large topic and hundreds of topics split recursively', () => {
  for (const topics of [1, 300]) {
    const entries = fixtures(600, topics);
    const artifacts = boundedDiscovery({ ...options, entries });
    assert.equal(crawl(artifacts).size, 1200);
    assert.ok([...artifacts.values()].some(content => links(content).some(url => url.startsWith(options.directory))));
  }
});

test('unusually large individual metadata fails explicitly rather than silently losing links', () => {
  const [entry] = fixtures(1);
  entry.markdown += ' Oversized metadata.'.repeat(2000);
  assert.throws(() => boundedDiscovery({ ...options, entries: [entry] }), /entry .* exceeds 2000 tokens/);
});

test('compiler publishes mounted bounded indexes with complete public coverage and scoped navigation', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-bounded-discovery-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(path.join(directory, 'content'));
  const ids = Array.from({ length: 80 }, (_, n) => `task-${String(n).padStart(3, '0')}`);
  for (const id of [...ids, 'draft']) {
    await writeFile(path.join(directory, 'content', `${id}.md`), `---\n${JSON.stringify({ id, title: id, slug: `/${id}`, summary: 'Configure the service, validate the configuration, check errors, and verify the published result. '.repeat(3), access: { policy: id === 'draft' ? 'draft' : 'public' }, standaloneSections: ['Check'] })}\n---\n\n## Check\n\nCheck the result.\n\n## Background\n\n${'Background material. '.repeat(500)}\n`);
  }
  const config = {
    schemaVersion: 1, site: { title: 'Growing documentation', origin: 'https://docs.example.test', basePath: '/docs' },
    publications: { defaults: { channel: 'production', version: 'current', language: 'en' }, channels: { production: {} }, versions: { current: {} }, enabled: [{ channel: 'production', version: 'current', language: 'en' }] },
    frontmatter: { defaults: { type: 'reference', channel: 'production', version: 'current', language: 'en', access: { policy: 'public' } } },
    outputs: { html: { shareImages: false } },
    navigation: [{ id: 'guides', label: 'Guides', tab: true, landing: ids[0], items: ids.slice(0, 75).map(id => ({ id, doc: id })) }],
  };
  const file = path.join(directory, 'docs.config.yaml'), site = path.join(directory, 'site');
  await writeFile(file, JSON.stringify(config));
  const manifest = await compile(file, site);
  const headers = JSON.parse(await readFile(path.join(site, 'docs/resource-headers.json'), 'utf8'));
  const read = (url: string) => readFile(path.join(site, new URL(url, 'https://docs.example.test').pathname), 'utf8');
  const indexes = new Map<string, string>();
  async function collect(url: string): Promise<void> {
    if (indexes.has(url)) return;
    const content = await read(url); indexes.set(url, content);
    assert.equal(headers[url]['Content-Type'], 'text/plain; charset=utf-8');
    for (const target of links(content)) if (target.startsWith('/docs/.well-known/shoalrun/') && target.endsWith('.txt')) await collect(target);
  }
  await collect('/docs/llms.min.txt');
  const found = crawl(indexes);
  assert.equal(manifest.documents.length, 80);
  for (const doc of manifest.documents) {
    assert.ok(found.has(doc.markdownUrl), doc.id);
    for (const section of doc.sections.filter(s => s.standalone)) assert.ok(found.has(section.markdownUrl), section.markdownUrl);
  }
  assert.ok(![...found].some(url => url.includes('draft')));
  const full = await read('/docs/llms.txt');
  for (const doc of manifest.documents) assert.ok(full.includes(doc.markdownUrl));
  const tab = manifest.navigationTabs![0];
  indexes.clear(); await collect(tab.indexUrl);
  const scoped = crawl(indexes, tab.indexUrl);
  for (const id of ids.slice(0, 75)) assert.ok(scoped.has(`/docs/${id}.md`));
  for (const id of ids.slice(75)) assert.ok(!scoped.has(`/docs/${id}.md`), 'unlisted pages stay global, not in the tab');
});
