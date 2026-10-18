import type { AskResult } from './ask.js';

// Repeated questions are common, and a checked answer is as good the second time. This keeps recent clean answers in memory, keyed by the
// question and who it is for, so a repeat costs no model call. An entry is dropped when it is old, when the cache is full, or when any
// passage behind the answer has changed since, so a docs update never serves a stale answer.
export type CacheOptions = { maxEntries?: number; ttlMs?: number; now?: () => number };
type Entry = { result: AskResult; storedAt: number; digests: Map<string, string> };

// Case, spacing, and closing punctuation do not change a question.
export const normalizeQuestion = (question: string) => question.toLocaleLowerCase().replace(/\s+/g, ' ').replace(/[\s?.!]+$/g, '').trim();

// Only an answer that passed every check is worth reusing. A hedged answer, a flagged one, or one that was declined is not stored. Any note
// means a layer did not run as planned, such as Jev being down, so the answer is not stored either. The exception is the note that
// records a successful escalation, because the answer that is shown has already passed every check.
export function cacheable(result: AskResult): boolean {
  const notes = result.notes.filter(note => !/^The answer was flagged \(.*\), so .* answered too\. Its answer has fewer flags and is shown\.$/.test(note));
  return (result.decision === 'answered' || result.decision === 'excerpt') && !result.uncited && !result.unsupportedClaims.length && !result.unsupportedCode.length && !result.invalidCitations.length && !notes.length;
}

export class AnswerCache {
  private readonly entries = new Map<string, Entry>();
  private readonly maxEntries: number;
  private readonly ttlMs: number;
  private readonly now: () => number;
  hits = 0;
  misses = 0;

  constructor(options: CacheOptions = {}) {
    this.maxEntries = options.maxEntries ?? 500;
    this.ttlMs = options.ttlMs ?? 24 * 60 * 60 * 1000;
    this.now = options.now ?? Date.now;
  }

  key(question: string, scope: { variant?: string; readerSelection?: Record<string, string[]> }): string {
    return JSON.stringify([normalizeQuestion(question), scope.variant ?? '', Object.entries(scope.readerSelection ?? {}).sort(([left], [right]) => left.localeCompare(right)).map(([facet, choices]) => [facet, [...choices].sort()])]);
  }

  get(key: string, digestOf: (id: string) => string | undefined): AskResult | undefined {
    const entry = this.entries.get(key);
    if (!entry || this.now() - entry.storedAt > this.ttlMs || [...entry.digests].some(([id, digest]) => digestOf(id) !== digest)) {
      if (entry) this.entries.delete(key);
      this.misses++;
      return undefined;
    }
    // Reading an entry makes it the most recent, so the least recently used one is evicted first.
    this.entries.delete(key);
    this.entries.set(key, entry);
    this.hits++;
    return entry.result;
  }

  set(key: string, result: AskResult, digestOf: (id: string) => string | undefined): void {
    if (!cacheable(result)) return;
    const digests = new Map<string, string>();
    for (const source of result.considered) { const digest = digestOf(source.id); if (digest === undefined) return; digests.set(source.id, digest); }
    this.entries.delete(key);
    this.entries.set(key, { result, storedAt: this.now(), digests });
    while (this.entries.size > this.maxEntries) this.entries.delete(this.entries.keys().next().value as string);
  }

  get size(): number { return this.entries.size; }
}
