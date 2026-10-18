import { readFile, realpath, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { aiDirectory, type Chunk, type ChunkIndex } from './index-build.js';
import { postJson, throwIfCancelled, type Transport } from './provider-http.js';

export type EmbedInputType = 'document' | 'query';
// `space` names the set of vectors that can be compared. Voyage 4 models share one, so passages and queries may use different
// models. Every other model is its own space, and queries must use the model that embedded the passages.
export type EmbeddingProvider = { name: string; model: string; dimension: number; space: string; backend?: string; documentFingerprint?: string; embed(texts: string[], inputType: EmbedInputType, signal?: AbortSignal): Promise<Float32Array[]> };
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

function normalize(vector: Float32Array): Float32Array {
  let length = 0;
  for (const value of vector) length = Math.hypot(length, value);
  return length ? vector.map(value => value / length) : vector;
}

function validVector(vector: Float32Array): boolean {
  let length = 0;
  for (const value of vector) {
    if (!Number.isFinite(value)) return false;
    length = Math.hypot(length, value);
  }
  return length > 0;
}

// Both APIs answer `{ data: [{ index, embedding }] }`. Check the answer matches the request before trusting it.
function vectorsFrom(label: string, body: unknown, count: number, dimension: number, model: string): Float32Array[] {
  const invalid = () => new Error(`${label} returned an unexpected response for model ${model} at ${dimension} dimensions`);
  const rows = (body as { data?: unknown } | null)?.data;
  if (!Array.isArray(rows) || rows.length !== count) throw invalid();
  const seen = new Set<number>();
  const vectors = rows.map((row: unknown) => {
    if (!row || typeof row !== 'object') throw invalid();
    const { index, embedding } = row as { index?: unknown; embedding?: unknown };
    if (!Number.isInteger(index) || (index as number) < 0 || (index as number) >= count || seen.has(index as number) || !Array.isArray(embedding) || embedding.length !== dimension || embedding.some(value => typeof value !== 'number' || !Number.isFinite(value))) throw invalid();
    seen.add(index as number);
    const vector = Float32Array.from(embedding);
    if (!validVector(vector)) throw invalid();
    return { index: index as number, vector: normalize(vector) };
  });
  return vectors.sort((a, b) => a.index - b.index).map(row => row.vector);
}

function batched(texts: string[], size: number, request: (batch: string[]) => Promise<Float32Array[]>, signal?: AbortSignal): Promise<Float32Array[]> {
  return (async () => {
    const vectors: Float32Array[] = [];
    for (let start = 0; start < texts.length; start += size) { throwIfCancelled(signal); vectors.push(...await request(texts.slice(start, start + size))); }
    return vectors;
  })();
}

function checkBatch(size: number, limit: number, label: string): number {
  if (!Number.isSafeInteger(size) || size < 1 || size > limit) throw new Error(`${label} batch size must be an integer from 1 to ${limit}`);
  return size;
}

export type VoyageOptions = Transport & { model: string; dimension?: number; apiKey?: string; keyEnv?: string; endpoint?: string; batchSize?: number };

const voyageDimensions = [256, 512, 1024, 2048];
const voyageSharedSpace = new Set(['voyage-4-large', 'voyage-4', 'voyage-4-lite', 'voyage-4-nano']);
const voyageSpace = (model: string) => voyageSharedSpace.has(model) ? 'voyage-4' : model;

// Voyage separates queries from documents with `input_type`. The key comes from VOYAGE_API_KEY, or from the variable `keyEnv`
// names, and is never stored.
export function voyageProvider(options: VoyageOptions): EmbeddingProvider {
  const model = options.model;
  if (!model) throw new Error('Choose a Voyage model, for example voyage-4-large');
  const dimension = options.dimension ?? 1024;
  if (!voyageDimensions.includes(dimension)) throw new Error(`Voyage dimension must be one of ${voyageDimensions.join(', ')}`);
  const batchSize = checkBatch(options.batchSize ?? 64, 1000, 'Voyage');
  const endpoint = options.endpoint ?? 'https://api.voyageai.com/v1/embeddings';
  return {
    name: 'voyage', model, dimension, space: voyageSpace(model), backend: hash(endpoint), documentFingerprint: hash(['voyage', endpoint, model, dimension, 'document', true]),
    embed(texts, inputType, signal) {
      return batched(texts, batchSize, async input => {
        const keyEnv = options.keyEnv ?? 'VOYAGE_API_KEY';
        const apiKey = options.apiKey ?? process.env[keyEnv];
        if (!apiKey) throw new Error(`Set ${keyEnv} to embed text`);
        const body = await postJson('Voyage', endpoint, { authorization: `Bearer ${apiKey}` }, { input, model, input_type: inputType, output_dimension: dimension, truncation: true }, { ...options, signal });
        return vectorsFrom('Voyage', body, input.length, dimension, model);
      }, signal);
    }
  };
}

export type OpenAIOptions = Transport & { model: string; dimension?: number; apiKey?: string; keyEnv?: string; baseUrl?: string; batchSize?: number; queryPrefix?: string; documentPrefix?: string };

const openAIDimensions: Record<string, number> = { 'text-embedding-3-small': 1536, 'text-embedding-3-large': 3072, 'text-embedding-ada-002': 1536 };

// OpenAI's embeddings API and the many servers that copy it (Azure, OpenRouter, Ollama, vLLM, and others). It has no query or
// document distinction, so both use the same call, and each model is its own space. The optional prefixes serve models that
// expect one, such as `query: ` and `passage: `. Only `text-embedding-3` models accept a `dimensions` request.
export function openAIProvider(options: OpenAIOptions): EmbeddingProvider {
  const model = options.model;
  if (!model) throw new Error('Choose an embedding model, for example text-embedding-3-small');
  const dimension = options.dimension ?? openAIDimensions[model];
  if (!dimension) throw new Error(`Pass a dimension for model ${model}; only OpenAI's own models have a known default`);
  if (!Number.isSafeInteger(dimension) || dimension < 1) throw new Error('Dimension must be a positive integer');
  const batchSize = checkBatch(options.batchSize ?? 64, 2048, 'OpenAI');
  const baseUrl = (options.baseUrl ?? 'https://api.openai.com/v1').replace(/\/+$/, '');
  const local = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/.test(baseUrl);
  const keyEnv = options.keyEnv ?? 'OPENAI_API_KEY';
  const sendDimensions = model.startsWith('text-embedding-3');
  return {
    name: 'openai', model, dimension, space: model, backend: hash(baseUrl), documentFingerprint: hash(['openai', baseUrl, model, dimension, options.documentPrefix ?? '', sendDimensions]),
    embed(texts, inputType, signal) {
      const prefix = inputType === 'query' ? options.queryPrefix : options.documentPrefix;
      return batched(texts, batchSize, async input => {
        const apiKey = options.apiKey ?? process.env[keyEnv];
        if (!apiKey && !local) throw new Error(`Set ${keyEnv} to embed text`);
        const body = await postJson('Embeddings API', `${baseUrl}/embeddings`, apiKey ? { authorization: `Bearer ${apiKey}` } : {}, { input: prefix ? input.map(text => prefix + text) : input, model, encoding_format: 'float', ...(sendDimensions ? { dimensions: dimension } : {}) }, { ...options, signal });
        return vectorsFrom('Embeddings API', body, input.length, dimension, model);
      }, signal);
    }
  };
}

// Shoalrun has no default provider or model. Whoever runs it chooses one, and the choice is recorded with the vectors.
export type ProviderConfig = Partial<OpenAIOptions & VoyageOptions> & { provider?: string };

export function createProvider(config: ProviderConfig = {}): EmbeddingProvider {
  const { provider, model } = config;
  if (!provider) throw new Error('Choose an embedding provider: voyage or openai');
  if (!model) throw new Error(`Choose an embedding model for ${provider}`);
  if (provider === 'voyage') {
    if (config.baseUrl) throw new Error('baseUrl applies only to the openai provider');
    return voyageProvider({ ...config, model });
  }
  if (provider === 'openai') return openAIProvider({ ...config, model });
  throw new Error(`Unknown embedding provider ${provider}; use voyage or openai`);
}

export type EmbeddingsMeta = { schemaVersion: 1; provider: string; model: string; space?: string; dimension: number; sourceDigest: string; ids: string[]; digests: string[]; backend?: string; documentFingerprint?: string; inputDigests?: string[] };
export type StoredEmbeddings = { meta: EmbeddingsMeta; vectors: Float32Array[] };

// Vectors are unit-length float32, one row per passage in `ids` order. The metadata file says which model made them and which
// passage text each row was made from, so a vector is never reused for text that changed.
export async function writeEmbeddings(directory: string, meta: EmbeddingsMeta, vectors: Float32Array[]): Promise<{ metaFile: string; vectorFile: string; bytes: number }> {
  if (vectors.length !== meta.ids.length || meta.digests.length !== meta.ids.length || (meta.inputDigests && meta.inputDigests.length !== meta.ids.length) || vectors.some(vector => vector.length !== meta.dimension || !validVector(vector))) throw new Error('Embeddings do not match their metadata');
  const target = await aiDirectory(directory);
  const buffer = Buffer.alloc(vectors.length * meta.dimension * 4);
  vectors.forEach((vector, row) => Buffer.from(vector.buffer, vector.byteOffset, vector.byteLength).copy(buffer, row * meta.dimension * 4));
  const vectorFile = path.join(target, 'embeddings.bin');
  const metaFile = path.join(target, 'embeddings.json');
  await writeFile(vectorFile, buffer);
  await writeFile(metaFile, JSON.stringify(meta) + '\n');
  return { metaFile, vectorFile, bytes: buffer.length };
}

export async function readEmbeddings(directory: string): Promise<StoredEmbeddings | undefined> {
  const target = path.join(path.resolve(directory), 'ai');
  try {
    const real = await realpath(target);
    const root = await realpath(path.resolve(directory));
    if (real !== root && !real.startsWith(root + path.sep)) throw new Error('The ai directory leaves the site directory');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
  let meta: EmbeddingsMeta;
  let bytes: Buffer;
  try {
    meta = JSON.parse(await readFile(path.join(target, 'embeddings.json'), 'utf8')) as EmbeddingsMeta;
    bytes = await readFile(path.join(target, 'embeddings.bin'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
  if (meta?.schemaVersion !== 1 || !Number.isSafeInteger(meta.dimension) || meta.dimension < 1 || !Array.isArray(meta.ids) || !Array.isArray(meta.digests) || meta.ids.length !== meta.digests.length || (meta.inputDigests !== undefined && (!Array.isArray(meta.inputDigests) || meta.inputDigests.length !== meta.ids.length))) throw new Error('Unsupported or invalid embeddings.json');
  if (bytes.length !== meta.ids.length * meta.dimension * 4) throw new Error('embeddings.bin does not match embeddings.json; run shoalrun index --embed again');
  const floats = new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  meta.space ??= meta.provider === 'voyage' ? voyageSpace(meta.model) : meta.model;
  const vectors = meta.ids.map((_, row) => floats.slice(row * meta.dimension, (row + 1) * meta.dimension));
  if (vectors.some(vector => !validVector(vector))) throw new Error('embeddings.bin contains invalid vectors; run shoalrun index --embed again');
  return { meta, vectors };
}

export type EmbedResult = { passages: number; embedded: number; reused: number; model: string; dimension: number; bytes: number };

// Embed every passage that has no current vector. Reuse requires the same provider, model, vector space, dimension, and
// passage digest, so editing one page re-embeds that page's passages and nothing else.
export async function embedChunkIndex(directory: string, index: ChunkIndex, provider: EmbeddingProvider, input: (chunk: Chunk) => string): Promise<EmbedResult> {
  const stored = await readEmbeddings(directory).catch(() => undefined);
  const inputs = index.chunks.map(input);
  const inputDigests = inputs.map(text => hash(text));
  const known = new Map<string, Float32Array>();
  if (stored && stored.meta.provider === provider.name && stored.meta.model === provider.model && stored.meta.space === provider.space && stored.meta.dimension === provider.dimension && stored.meta.backend === provider.backend && stored.meta.documentFingerprint === provider.documentFingerprint && stored.meta.inputDigests) stored.meta.inputDigests.forEach((digest, row) => known.set(digest, stored.vectors[row]));
  const missing = [...new Map(inputDigests.map((digest, at): [string, string] => [digest, inputs[at]]).filter(([digest]) => !known.has(digest))).values()];
  const fresh = missing.length ? await provider.embed(missing, 'document') : [];
  if (fresh.length !== missing.length) throw new Error('Embedding provider returned the wrong number of vectors');
  missing.forEach((item, at) => known.set(hash(item), fresh[at]));
  const written = await writeEmbeddings(directory, { schemaVersion: 1, provider: provider.name, model: provider.model, space: provider.space, dimension: provider.dimension, sourceDigest: index.sourceDigest, ids: index.chunks.map(chunk => chunk.id), digests: index.chunks.map(chunk => chunk.digest), inputDigests, ...(provider.backend ? { backend: provider.backend } : {}), ...(provider.documentFingerprint ? { documentFingerprint: provider.documentFingerprint } : {}) }, inputDigests.map(digest => known.get(digest) as Float32Array));
  return { passages: index.chunks.length, embedded: missing.length, reused: index.chunks.length - missing.length, model: provider.model, dimension: provider.dimension, bytes: written.bytes };
}
