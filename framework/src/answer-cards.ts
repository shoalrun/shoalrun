import { readFile, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'yaml';
import { cacheable, normalizeQuestion } from './answer-cache.js';
import type { AskResult, Source } from './ask.js';
import { aiDirectory } from './index-build.js';

// Answer cards are answers written ahead of time, from a list of questions a person chose. Each question is run once through the full
// pipeline, and only an answer that passes every check becomes a card. A card records the digest of each passage behind it, so it is
// dropped the moment the docs it came from change. At runtime a question that means the same as a card's question is answered from
// the card, with no model call. Cards are a separate, optional file, and the build never makes them.
export type ReaderSelection = Record<string, string[]>;
export type CardQuestion = { question: string; aliases?: string[] };
export type Card = { id: string; question: string; aliases: string[]; answer: string; sources: Source[]; digests: Record<string, string>; model: string; generatedAt: string; variant: string; readerSelection?: ReaderSelection; decision: 'answered' | 'excerpt' };
export type CardFile = { schemaVersion: 1; embedding: { provider: string; model: string; space: string; dimension: number }; cards: Array<Card & { vectors: string[] }> };

export const encodeVector = (vector: Float32Array): string => Buffer.from(vector.buffer, vector.byteOffset, vector.byteLength).toString('base64');
export function decodeVector(value: string): Float32Array {
  const bytes = Buffer.from(value, 'base64');
  return new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
}

const slug = (question: string) => normalizeQuestion(question).replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 60);
const scopeKey = (variant: string, selection?: ReaderSelection) => JSON.stringify([variant, Object.entries(selection ?? {}).sort(([left], [right]) => left.localeCompare(right)).map(([facet, choices]) => [facet, [...choices].sort()])]);

export type BuildInput = {
  questions: CardQuestion[];
  ask: (question: string) => Promise<AskResult>;
  embed: (texts: string[]) => Promise<Float32Array[]>;
  digestOf: (id: string) => string | undefined;
  embedding: CardFile['embedding'];
  variant: string;
  readerSelection?: ReaderSelection;
  now?: () => Date;
  progress?: (message: string) => void;
};

// Why an answer is not good enough to keep, or undefined when it is.
export function rejection(result: AskResult): string | undefined {
  if (cacheable(result)) return undefined;
  if (result.decision === 'declined') return 'the docs do not cover it';
  if (result.decision === 'hedged') return 'the answer was hedged';
  if (result.decision === 'search') return 'the scorer was down, so no answer was written';
  if (result.uncited) return 'the answer cites nothing';
  if (result.unsupportedClaims.length) return `${result.unsupportedClaims.length} unsupported sentence(s)`;
  if (result.unsupportedCode.length) return 'code that is not in the docs';
  if (result.invalidCitations.length) return 'an invented citation';
  return `the answer carried a note: ${result.notes[0] ?? 'unknown'}`;
}

export async function buildCards(input: BuildInput): Promise<{ file: CardFile; rejected: Array<{ question: string; reason: string }> }> {
  const kept: Array<{ card: Card; phrases: string[] }> = [];
  const rejected: Array<{ question: string; reason: string }> = [];
  const seen = new Set<string>();
  for (const item of input.questions) {
    const question = item.question.trim();
    const id = slug(question);
    if (!question || seen.has(id)) { rejected.push({ question, reason: question ? 'a card for this question already exists' : 'the question is empty' }); continue; }
    seen.add(id);
    let result: AskResult;
    try { result = await input.ask(question); } catch (error) { rejected.push({ question, reason: `asking failed: ${(error as Error).message}` }); continue; }
    const reason = rejection(result);
    if (reason) { rejected.push({ question, reason }); input.progress?.(`skipped: ${question} (${reason})`); continue; }
    const digests: Record<string, string> = {};
    for (const source of result.considered) { const digest = input.digestOf(source.id); if (digest !== undefined) digests[source.id] = digest; }
    if (Object.keys(digests).length !== result.considered.length) { rejected.push({ question, reason: 'a passage behind the answer is unknown' }); continue; }
    const aliases = [...new Set((item.aliases ?? []).map(alias => alias.trim()).filter(Boolean))];
    input.progress?.(`kept: ${question}`);
    kept.push({ card: { id, question, aliases, answer: result.answer, sources: result.sources, digests, model: result.routing?.answeredBy ?? 'excerpt', generatedAt: (input.now ?? (() => new Date()))().toISOString(), variant: input.variant, ...(input.readerSelection && Object.keys(input.readerSelection).length ? { readerSelection: input.readerSelection } : {}), decision: result.decision as 'answered' | 'excerpt' }, phrases: [question, ...aliases] });
  }
  const vectors = kept.length ? await input.embed(kept.flatMap(item => item.phrases)) : [];
  let at = 0;
  const cards = kept.map(item => ({ ...item.card, vectors: item.phrases.map(() => encodeVector(vectors[at++])) }));
  return { file: { schemaVersion: 1, embedding: input.embedding, cards }, rejected };
}

export async function writeCards(directory: string, file: CardFile): Promise<string> {
  const target = path.join(await aiDirectory(directory), 'answers.json');
  await writeFile(target, JSON.stringify(file) + '\n');
  return target;
}

export async function readCards(directory: string): Promise<CardFile | undefined> {
  const root = path.resolve(directory);
  const target = path.join(root, 'ai', 'answers.json');
  let file: CardFile;
  try {
    const real = await realpath(path.join(root, 'ai'));
    const realRoot = await realpath(root);
    if (real !== realRoot && !real.startsWith(realRoot + path.sep)) throw new Error('The ai directory leaves the site directory');
    file = JSON.parse(await readFile(target, 'utf8')) as CardFile;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
  if (file?.schemaVersion !== 1 || !Array.isArray(file.cards) || !file.embedding || file.cards.some(card => !card || typeof card.id !== 'string' || typeof card.answer !== 'string' || !Array.isArray(card.vectors) || typeof card.digests !== 'object')) throw new Error('Unsupported or invalid answers.json');
  return file;
}

export type CardMatch = { card: Card; similarity: number };

export class CardIndex {
  private readonly rows: Array<{ card: Card; vector: Float32Array }> = [];
  readonly embedding: CardFile['embedding'];

  constructor(file: CardFile) {
    this.embedding = file.embedding;
    for (const { vectors, ...card } of file.cards) for (const vector of vectors) this.rows.push({ card, vector: decodeVector(vector) });
  }

  get size(): number { return new Set(this.rows.map(row => row.card.id)).size; }

  // The closest card for the same publication and reader view, when it is close enough. Vectors are unit length, so a dot product is the cosine.
  match(query: Float32Array, options: { threshold: number; variant: string; readerSelection?: ReaderSelection }): CardMatch | undefined {
    const scope = scopeKey(options.variant, options.readerSelection);
    let best: CardMatch | undefined;
    for (const row of this.rows) {
      if (row.vector.length !== query.length || scopeKey(row.card.variant, row.card.readerSelection) !== scope) continue;
      let similarity = 0;
      for (let at = 0; at < query.length; at++) similarity += query[at] * row.vector[at];
      if (!best || similarity > best.similarity) best = { card: row.card, similarity };
    }
    return best && best.similarity >= options.threshold ? best : undefined;
  }
}

// A card is current only while every passage behind it has the digest it had when the card was made.
export const cardIsCurrent = (card: Card, digestOf: (id: string) => string | undefined): boolean => Object.entries(card.digests).every(([id, digest]) => digestOf(id) === digest);

// A list of questions, as JSON or YAML: plain strings, or mappings with `question` and optional `aliases`.
export function parseCardQuestions(text: string): CardQuestion[] {
  const value = parse(text) as unknown;
  const list = Array.isArray(value) ? value : value && typeof value === 'object' && Array.isArray((value as { questions?: unknown }).questions) ? (value as { questions: unknown[] }).questions : undefined;
  if (!list) throw new Error('The questions file must be a list, or a mapping with a questions list');
  return list.map((item, at) => {
    if (typeof item === 'string') return { question: item };
    if (item && typeof item === 'object' && typeof (item as { question?: unknown }).question === 'string') {
      const aliases = (item as { aliases?: unknown }).aliases;
      if (aliases !== undefined && (!Array.isArray(aliases) || aliases.some(alias => typeof alias !== 'string'))) throw new Error(`Question ${at + 1}: aliases must be a list of strings`);
      return { question: (item as { question: string }).question, ...(aliases ? { aliases: aliases as string[] } : {}) };
    }
    throw new Error(`Question ${at + 1} must be a string or a mapping with a question`);
  });
}
