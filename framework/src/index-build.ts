import { createHash } from 'node:crypto';
import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { validateSearchSynonyms } from './search-synonyms.js';
import { prepareSearchPassage, type PreparedSearchPassage } from './search-snippet.js';

export type Chunk = { id: string; docId: string; title: string; type: string; variant: string; headingPath: string[]; url: string; markdownUrl: string; text: string; digest: string; readerFilters?: Record<string, string[]>; search?: PreparedSearchPassage };
export type ChunkIndex = { schemaVersion: 1; sourceDigest: string; chunks: Chunk[]; synonyms?: string[][] };
export type ChunkOptions = { maxChars?: number; minChars?: number };

type ChunkSource = Pick<ManifestDocument, 'id' | 'title' | 'type' | 'url' | 'markdownUrl' | 'readerFilters'> & { variant: string };

type ManifestDocument = { id: string; type: string; title: string; url: string; markdownUrl: string; digest: string; readerFilters?: Record<string, string[]>; variant: { channel: string; version: string; language: string } };
type Section = { level: number; title: string; path: string[]; blocks: string[] };

const fence = /^\s{0,3}(`{3,}|~{3,})/;
const heading = /^(#{1,6})\s+(.+?)\s*#*\s*$/;

const sha = (value: string) => createHash('sha256').update(value).digest('hex');
const slug = (value: string) => value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');
// Headings in the Markdown twin keep inline formatting; the search index stores plain text.
const plain = (value: string) => value.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[`*_]/g, '').replace(/\s+/g, ' ').trim().toLocaleLowerCase();

// The text a chunk is embedded and lexically scored as: page title and heading path give a passage its context.
export function embeddingInput(chunk: Pick<Chunk, 'title' | 'headingPath' | 'text'>): string {
  return `${chunk.title}${chunk.headingPath.length ? ` > ${chunk.headingPath.join(' > ')}` : ''}\n\n${chunk.text}`;
}

function stripFrontmatter(markdown: string): string {
  const match = /^---\r?\n[\s\S]*?\r?\n---\r?\n/.exec(markdown);
  return match ? markdown.slice(match[0].length) : markdown;
}

// Split at h2 and h3. Fenced code stays whole, and lower headings stay inside their section's text.
function sections(body: string): Section[] {
  const result: Section[] = [];
  const path: string[] = [];
  let current: Section = { level: 1, title: '', path: [], blocks: [] };
  let block: string[] = [];
  let open: string | undefined;
  const flush = () => { if (block.length) current.blocks.push(block.join('\n')); block = []; };
  for (const line of body.split(/\r?\n/)) {
    const marker = fence.exec(line)?.[1];
    if (open) {
      block.push(line);
      if (marker && marker[0] === open[0] && marker.length >= open.length && !line.replace(fence, '').trim()) open = undefined;
      continue;
    }
    if (marker) { open = marker; block.push(line); continue; }
    const found = heading.exec(line);
    if (found && found[1].length <= 3) {
      flush();
      result.push(current);
      const level = found[1].length;
      if (level === 1) { current = { level: 1, title: '', path: [], blocks: [] }; continue; }
      path.splice(level - 2);
      path.push(found[2]);
      current = { level, title: found[2], path: [...path], blocks: [] };
      continue;
    }
    if (!line.trim()) flush(); else block.push(line);
  }
  flush();
  result.push(current);
  return result.filter(section => section.blocks.length || section.title);
}

// Paragraphs, lists, tables, and fenced code as separate blocks, in order. A fence stays whole even when it contains blank lines.
export function splitBlocks(text: string): string[] {
  const blocks: string[] = [];
  let block: string[] = [];
  let open: string | undefined;
  const flush = () => { if (block.length) blocks.push(block.join('\n')); block = []; };
  for (const line of text.split(/\r?\n/)) {
    const marker = fence.exec(line)?.[1];
    if (open) {
      block.push(line);
      if (marker && marker[0] === open[0] && marker.length >= open.length && !line.replace(fence, '').trim()) { open = undefined; flush(); }
      continue;
    }
    if (marker) { flush(); open = marker; block.push(line); continue; }
    if (!line.trim()) flush(); else block.push(line);
  }
  flush();
  return blocks;
}

// A table larger than the limit is cut between rows, and each piece repeats the header so a row keeps its column names.
function splitTable(block: string, maxChars: number): string[] {
  const lines = block.split('\n');
  if (block.length <= maxChars || lines.length < 3 || !lines.every(line => line.trimStart().startsWith('|')) || !/^\s*\|[\s:|-]+\|?\s*$/.test(lines[1])) return [block];
  const header = lines.slice(0, 2).join('\n');
  const parts: string[] = [];
  let rows: string[] = [];
  for (const row of lines.slice(2)) {
    if (rows.length && header.length + rows.join('\n').length + row.length + 2 > maxChars) { parts.push(`${header}\n${rows.join('\n')}`); rows = []; }
    rows.push(row);
  }
  if (rows.length) parts.push(`${header}\n${rows.join('\n')}`);
  return parts;
}

// Greedy-pack blocks up to maxChars. A code sample larger than the limit stays whole.
function pack(blocks: string[], maxChars: number): string[] {
  const parts: string[] = [];
  let current = '';
  for (const block of blocks.flatMap(item => splitTable(item, maxChars))) {
    if (current && current.length + block.length + 2 > maxChars) { parts.push(current); current = ''; }
    current = current ? `${current}\n\n${block}` : block;
  }
  if (current) parts.push(current);
  return parts;
}

export function chunkMarkdown(markdown: string, document: ChunkSource, anchors: Array<{ id: string; title: string }> = [], options: ChunkOptions = {}): Chunk[] {
  const maxChars = options.maxChars ?? 2000;
  const minChars = options.minChars ?? 200;
  const chunks: Chunk[] = [];
  const used = new Map<string, number>();
  let cursor = 0;
  // A section too short to stand alone rides along with its first child section, which reads better than a fragment.
  let carry: { text: string; path: string[]; anchor?: string } | undefined;
  for (const section of sections(stripFrontmatter(markdown))) {
    let anchor: string | undefined;
    if (section.title) {
      const wanted = plain(section.title);
      const at = anchors.findIndex((item, index) => index >= cursor && plain(item.title) === wanted);
      if (at >= 0) { anchor = anchors[at].id; cursor = at + 1; }
    }
    const child = carry && section.path.length > carry.path.length && carry.path.every((part, index) => section.path[index] === part);
    if (carry && !child) chunks.push(makeChunk(document, carry.path, carry.anchor, carry.text, used));
    const blocks = carry && child ? [carry.text, ...section.blocks] : section.blocks;
    carry = undefined;
    const text = blocks.join('\n\n');
    if (!text.trim()) continue;
    if (text.length < minChars && section.path.length && blocks === section.blocks) { carry = { text, path: section.path, anchor }; continue; }
    pack(blocks, maxChars).forEach((part, index) => chunks.push(makeChunk(document, section.path, anchor, part, used, index)));
  }
  if (carry) chunks.push(makeChunk(document, carry.path, carry.anchor, carry.text, used));
  return chunks;
}

function makeChunk(document: ChunkSource, headingPath: string[], anchor: string | undefined, text: string, used: Map<string, number>, part = 0): Chunk {
  const base = `${document.id}#${slug(headingPath.join(' ')) || 'intro'}${part ? `~${part + 1}` : ''}`;
  const seen = used.get(base) ?? 0;
  used.set(base, seen + 1);
  const chunk = { id: seen ? `${base}-${seen + 1}` : base, docId: document.id, title: document.title, type: document.type, variant: document.variant, headingPath, url: anchor ? `${document.url}#${anchor}` : document.url, markdownUrl: document.markdownUrl, text };
  // The page's reader marks (audience, product, and so on) travel with each passage so retrieval can filter by them. They are not part
  // of the embedding input, so changing a page's audience never forces a re-embed.
  const marks = document.readerFilters && Object.keys(document.readerFilters).length ? { readerFilters: document.readerFilters } : {};
  return { ...chunk, ...marks, digest: sha(embeddingInput(chunk)), search: prepareSearchPassage(text) };
}

async function readJson<T>(file: string): Promise<T | undefined> {
  try { return JSON.parse(await readFile(file, 'utf8')) as T; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined; throw error; }
}

// The directory that holds the passage and vector files. It is created on demand, and it must stay inside the site even if
// `ai` is a symlink.
export async function aiDirectory(directory: string): Promise<string> {
  const root = path.resolve(directory);
  const target = path.join(root, 'ai');
  await mkdir(target, { recursive: true });
  const real = await realpath(root);
  const inside = await realpath(target);
  if (inside !== real && !inside.startsWith(real + path.sep)) throw new Error('The ai directory leaves the site directory');
  return target;
}

export async function buildChunkIndex(directory: string, options: ChunkOptions = {}): Promise<{ index: ChunkIndex; output: string; documents: number }> {
  const root = path.resolve(directory);
  const manifest = await readJson<{ documents?: ManifestDocument[]; searchSynonyms?: string[][] }>(path.join(root, 'documents.json'));
  if (!manifest || !Array.isArray(manifest.documents)) throw new Error(`No documents.json in ${directory}; build the site first`);
  const synonyms = validateSearchSynonyms(manifest.searchSynonyms);
  const search = await readJson<{ documents?: Array<{ url: string; headings: Array<{ id: string; title: string }> }> }>(path.join(root, 'search-index.json'));
  const anchors = new Map((search?.documents ?? []).map(item => [item.url, item.headings]));
  const chunks: Chunk[] = [];
  const realRoot = await realpath(root);
  const inside = (file: string) => file === realRoot || file.startsWith(realRoot + path.sep);
  for (const document of manifest.documents) {
    if (typeof document?.markdownUrl !== 'string') throw new Error('documents.json has a page without a markdownUrl');
    const file = path.resolve(root, `.${document.markdownUrl}`);
    // The path check catches `..`; the real path catches a symlink that points out of the site directory.
    if (file !== root && !file.startsWith(root + path.sep)) throw new Error(`Markdown path for ${document.id} leaves the site directory`);
    if (!inside(await realpath(file))) throw new Error(`Markdown path for ${document.id} leaves the site directory`);
    const markdown = await readFile(file, 'utf8');
    const { channel, version, language } = document.variant;
    chunks.push(...chunkMarkdown(markdown, { ...document, variant: `${channel}|${version}|${language}` }, anchors.get(document.url), options));
  }
  const source = manifest.documents.map(document => `${document.id}:${document.digest}`).sort().join('\n');
  const index: ChunkIndex = { schemaVersion: 1, sourceDigest: sha(source + (synonyms.length ? `\n${JSON.stringify(synonyms)}` : '')), chunks, ...(synonyms.length ? { synonyms } : {}) };
  const output = path.join(await aiDirectory(root), 'chunks.json');
  await writeFile(output, JSON.stringify(index) + '\n');
  return { index, output, documents: manifest.documents.length };
}
