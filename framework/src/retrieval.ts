import type { Chunk, ChunkIndex } from './index-build.js';
import type { StoredEmbeddings } from './embeddings.js';
import { phraseMatches, queryUnits, validateSearchSynonyms, type SynonymGroups } from './search-synonyms.js';

export type Hit = { chunk: Chunk; score: number };
export type ReaderSelection = Record<string, string[]>;
export type LexicalOptions = { limit?: number; variant?: string; readerSelection?: ReaderSelection };

// The rule the search box applies (assets/search-lexical.js), so search and chat agree on who a page is for. A page with no mark
// for a facet is eligible for everyone. A marked page must share at least one choice with the selection for that facet.
export function readerMatches(marks: Record<string, string[]> | undefined, selection: ReaderSelection | undefined): boolean {
  if (!selection || !Object.keys(selection).length) return true;
  return Object.entries(marks ?? {}).every(([facet, values]) => !selection[facet]?.length || values.some(value => selection[facet].includes(value)));
}

type Keep = ((chunk: Chunk) => boolean) | undefined;
const keeping = (options: LexicalOptions): Keep => options.readerSelection && Object.keys(options.readerSelection).length ? chunk => readerMatches(chunk.readerFilters, options.readerSelection) : undefined;

// Weights for a term found in the page title, the heading path, or the passage text.
const weights = { title: 2, heading: 3, text: 1 };
const k1 = 1.2;
const b = 0.75;

// Folds plain English plurals so `pages` matches `page` and `classes` matches `class`. Words ending in -ss, -us, or -is are
// left alone (`class`, `status`, `access`), and anything that isn't a plain word, such as an identifier, is never touched.
function singular(token: string): string {
  if (token.length <= 3 || !/^\p{L}+$/u.test(token) || /(ss|us|is)$/.test(token)) return token;
  if (token.endsWith('ies')) return `${token.slice(0, -3)}y`;
  if (/(ss|us|x|z|ch|sh)es$/.test(token)) return token.slice(0, -2);
  return token.endsWith('s') ? token.slice(0, -1) : token;
}

// Keeps identifiers whole (`docs.config.yaml`, `$include`, `/publish/audit`) and also indexes their parts, so both an exact
// identifier and a loose mention match.
export function tokenize(value: string): string[] {
  const tokens: string[] = [];
  for (const raw of value.toLocaleLowerCase().match(/[\p{L}\p{N}_$@:./-]+/gu) ?? []) {
    const whole = raw.replace(/^[.:/-]+|[.:/-]+$/g, '');
    if (!whole) continue;
    const parts = whole.split(/[._$@:/-]+/).filter(Boolean);
    for (const token of new Set([whole, ...parts])) tokens.push(singular(token));
  }
  return tokens;
}

function counts(tokens: string[]): Map<string, number> {
  const result = new Map<string, number>();
  for (const token of tokens) result.set(token, (result.get(token) ?? 0) + 1);
  return result;
}

type Entry = { chunk: Chunk; frequency: Map<string, number>; length: number };

// BM25 over passages with the title and heading path weighted above body text. One instance covers one publication, so
// document frequencies never mix v1 with v2 or sandbox with production.
export class LexicalIndex {
  private readonly entries: Entry[];
  private readonly frequency = new Map<string, number>();
  private readonly average: number;

  constructor(chunks: Chunk[], private readonly synonyms: SynonymGroups = []) {
    this.entries = chunks.map(chunk => {
      const frequency = new Map<string, number>();
      const add = (tokens: string[], weight: number) => { for (const [token, count] of counts(tokens)) frequency.set(token, (frequency.get(token) ?? 0) + count * weight); };
      const body = tokenize(chunk.text);
      add(body, weights.text);
      add(tokenize(chunk.headingPath.join(' ')), weights.heading);
      add(tokenize(chunk.title), weights.title);
      return { chunk, frequency, length: body.length + 1 };
    });
    for (const entry of this.entries) for (const token of entry.frequency.keys()) this.frequency.set(token, (this.frequency.get(token) ?? 0) + 1);
    this.average = this.entries.reduce((sum, entry) => sum + entry.length, 0) / (this.entries.length || 1);
  }

  search(query: string, limit = 8, keep?: Keep): Hit[] {
    const terms = [...new Set(tokenize(query))];
    const units = queryUnits(query, this.synonyms).filter(unit => unit.alternatives.length);
    const total = this.entries.length;
    const hits: Hit[] = [];
    for (const entry of this.entries) {
      if (keep && !keep(entry.chunk)) continue;
      let score = 0;
      for (const term of terms) {
        const tf = entry.frequency.get(term);
        if (!tf) continue;
        const df = this.frequency.get(term) ?? 0;
        score += Math.log(1 + (total - df + 0.5) / (df + 0.5)) * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * entry.length / this.average));
      }
      for (const unit of units) {
        const fields = [entry.chunk.title, entry.chunk.headingPath.join(' '), entry.chunk.text];
        const fieldWeight = [4, 5, 2];
        for (let at = 0; at < fields.length; at++) {
          if (phraseMatches(fields[at], unit.term)) score += fieldWeight[at];
          else if (unit.alternatives.some(term => phraseMatches(fields[at], term))) score += fieldWeight[at] * 0.5;
        }
      }
      if (score > 0) hits.push({ chunk: entry.chunk, score });
    }
    return hits.sort((left, right) => right.score - left.score || left.chunk.id.localeCompare(right.chunk.id)).slice(0, limit);
  }
}

type VectorRow = { chunk: Chunk; vector: Float32Array };

function unit(vector: Float32Array): Float32Array {
  let sum = 0;
  for (const value of vector) sum += value * value;
  const length = Math.sqrt(sum);
  return length ? vector.map(value => value / length) : vector;
}

// Brute-force cosine similarity. A docs site has hundreds to a few thousand passages, so this is fast enough without an
// approximate index. Stored vectors are unit length, and the query is normalized here so callers can pass any vector.
export class VectorIndex {
  constructor(private readonly rows: VectorRow[]) {}

  search(query: Float32Array, limit = 8, keep?: Keep): Hit[] {
    const q = unit(query);
    const hits: Hit[] = [];
    for (const row of this.rows) {
      if (keep && !keep(row.chunk)) continue;
      if (row.vector.length !== q.length) throw new Error(`Query vector has ${q.length} dimensions but stored vectors have ${row.vector.length}`);
      let score = 0;
      for (let at = 0; at < q.length; at++) score += q[at] * row.vector[at];
      hits.push({ chunk: row.chunk, score });
    }
    return hits.sort((left, right) => right.score - left.score || left.chunk.id.localeCompare(right.chunk.id)).slice(0, limit);
  }
}

// Reciprocal rank fusion. Lexical and vector scores are not comparable, so only ranks are combined.
export function fuse(lists: Hit[][], limit = 8, k = 60): Hit[] {
  const scores = new Map<string, Hit>();
  for (const list of lists) list.forEach((hit, rank) => {
    const seen = scores.get(hit.chunk.id);
    scores.set(hit.chunk.id, { chunk: hit.chunk, score: (seen?.score ?? 0) + 1 / (k + rank + 1) });
  });
  return [...scores.values()].sort((left, right) => right.score - left.score || left.chunk.id.localeCompare(right.chunk.id)).slice(0, limit);
}

export type Coverage = { total: number; embedded: number; stale: number; model?: string; dimension?: number };

// One index per publication. A query names its publication; nothing is searched across publications implicitly. A stored
// vector is used only when its digest matches the passage's, so a passage edited after embedding falls back to lexical.
export class Retriever {
  private readonly passages = new Map<string, Chunk[]>();
  private readonly byVariant = new Map<string, LexicalIndex>();
  private readonly vectors = new Map<string, VectorIndex>();
  private readonly counts: Coverage;
  private readonly digests = new Map<string, string>();

  constructor(index: ChunkIndex, embeddings?: StoredEmbeddings) {
    if (index?.schemaVersion !== 1 || !Array.isArray(index.chunks)) throw new Error('Unsupported or invalid chunks.json');
    const synonyms = validateSearchSynonyms(index.synonyms);
    const groups = new Map<string, Chunk[]>();
    for (const chunk of index.chunks) groups.set(chunk.variant, [...(groups.get(chunk.variant) ?? []), chunk]);
    this.counts = { total: index.chunks.length, embedded: 0, stale: 0, ...(embeddings ? { model: embeddings.meta.model, dimension: embeddings.meta.dimension } : {}) };
    const rowOf = new Map((embeddings?.meta.ids ?? []).map((id, row) => [id, row]));
    for (const chunk of index.chunks) this.digests.set(chunk.id, chunk.digest);
    for (const [variant, chunks] of groups) {
      this.passages.set(variant, chunks);
      this.byVariant.set(variant, new LexicalIndex(chunks, synonyms));
      if (!embeddings) continue;
      const rows: VectorRow[] = [];
      for (const chunk of chunks) {
        const row = rowOf.get(chunk.id);
        if (row === undefined) continue;
        if (embeddings.meta.digests[row] !== chunk.digest) { this.counts.stale++; continue; }
        rows.push({ chunk, vector: embeddings.vectors[row] });
      }
      this.counts.embedded += rows.length;
      if (rows.length) this.vectors.set(variant, new VectorIndex(rows));
    }
  }

  variants(): string[] { return [...this.byVariant.keys()].sort(); }

  // The current digest of a passage, so a stored answer can tell whether the text behind it has changed.
  digestOf(id: string): string | undefined { return this.digests.get(id); }

  coverage(): Coverage { return { ...this.counts }; }

  requirePreparedSearch(): void {
    for (const chunks of this.passages.values()) for (const chunk of chunks) {
      const search = chunk.search;
      if (search?.schemaVersion !== 1 || !Array.isArray(search.paragraphs) || !search.paragraphs.every(text => typeof text === 'string') || !Array.isArray(search.literalLines) || !search.literalLines.every(text => typeof text === 'string')) {
        throw new Error('Search index needs prepared passage data; run shoalrun index <site-directory> before serving search. Existing passage embeddings can be reused.');
      }
    }
  }

  private variant(options: LexicalOptions): string {
    const variants = this.variants();
    const variant = options.variant ?? (variants.length === 1 ? variants[0] : undefined);
    if (!variant) throw new Error(`Search matches multiple publications (${variants.join(', ')}); pass a variant`);
    if (!this.byVariant.has(variant)) throw new Error(`No indexed passages for publication ${variant}`);
    return variant;
  }

  // A retrieved page's introduction can explain prerequisites that a matching subsection omits.
  // It must pass the same publication and reader filters as the original search.
  pageIntroduction(docId: string, options: LexicalOptions = {}): Chunk | undefined {
    const keep = keeping(options);
    return this.passages.get(this.variant(options))?.find(chunk => chunk.docId === docId && !chunk.headingPath.length && (!keep || keep(chunk)));
  }

  lexical(query: string, options: LexicalOptions = {}): Hit[] {
    return (this.byVariant.get(this.variant(options)) as LexicalIndex).search(query, options.limit, keeping(options));
  }

  vector(queryVector: Float32Array, options: LexicalOptions = {}): Hit[] {
    const index = this.vectors.get(this.variant(options));
    if (!index) throw new Error('No current embeddings for this publication; run shoalrun index --embed');
    return index.search(queryVector, options.limit, keeping(options));
  }

  // Whether this publication has current vectors. Callers use it to say truthfully which mode answered.
  hasVectors(options: LexicalOptions = {}): boolean { return this.vectors.has(this.variant(options)); }

  // Semantic search is optional, so hybrid degrades to lexical when there is no query vector or no current vectors for the
  // publication. Passages without a current vector still compete through the lexical list.
  hybrid(query: string, queryVector: Float32Array | undefined, options: LexicalOptions = {}): Hit[] {
    if (!queryVector || !this.hasVectors(options)) return this.lexical(query, options);
    const depth = Math.max(50, (options.limit ?? 8) * 4);
    return fuse([this.lexical(query, { ...options, limit: depth }), this.vector(queryVector, { ...options, limit: depth })], options.limit ?? 8);
  }
}
