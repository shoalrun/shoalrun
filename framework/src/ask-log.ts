import { appendFile, mkdir, readFile, realpath, rename, stat } from 'node:fs/promises';
import path from 'node:path';
import { normalizeQuestion } from './answer-cache.js';
import { closestFloor, type AskResult, type Decision } from './ask.js';

// A local record of every question and how it was answered, so an owner can find gaps in the docs and questions worth answering ahead
// of time. It is off unless a file is named. Questions can hold personal details, so text is redacted before it is written, the file
// is readable by its owner only, and it rotates at a size limit. It is never kept inside the site directory, where a deploy could publish it.
export type LogRecord = {
  v: 1; id?: string; at: string; question: string; followUp?: boolean; standalone?: string; decision: Decision; mode: string; cached?: boolean; card?: string;
  jevBest?: number; model?: string; chatCalls: number; tokens: { in: number; out: number }; sources: Array<{ id: string; title: string; url: string }>;
  closest?: Array<{ title: string; url: string }>; flags: { uncited?: boolean; invalidCitations?: number; unsupportedCode?: number; unsupportedClaims?: number };
  verified: boolean; notes: string[]; answer: string; ms: number;
};
export type AskEvent = { id?: string; question: string; history: unknown[]; result: AskResult; elapsedMs: number; now?: () => Date };

// Best effort, not a guarantee: it removes the common ways a question carries a person's details or a credential. It leaves ordinary words alone.
export function redact(text: string): string {
  return text
    .replace(/https?:\/\/[^\s)>\]]+/gi, url => url.replace(/[?#].*$/, ''))
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/\b(?:sk|pk|rk|pa|lsk|ghp|gho|xox[bpas])[-_][A-Za-z0-9_-]{12,}/g, '[secret]')
    .replace(/\b[A-Za-z0-9_-]{32,}\b/g, '[secret]')
    .replace(/\+?\d[\d\s().-]{7,}\d/g, match => match.replace(/\D/g, '').length >= 9 ? '[number]' : match);
}

const trim = (text: string, limit: number) => text.length > limit ? `${text.slice(0, limit)}…` : text;

export function toRecord(event: AskEvent, options: { answers?: boolean } = {}): LogRecord {
  const { result } = event;
  const closest = result.decision === 'declined' ? [...result.answer.matchAll(/^- (.+?): (\/\S*)$/gm)].map(match => ({ title: redact(match[1]), url: match[2] })) : undefined;
  return {
    v: 1, ...(event.id ? { id: event.id } : {}), at: (event.now ?? (() => new Date()))().toISOString(), question: redact(event.question),
    ...(event.history.length ? { followUp: true } : {}), ...(result.standalone ? { standalone: redact(result.standalone) } : {}),
    decision: result.decision, mode: result.mode, ...(result.cached ? { cached: true } : {}), ...(result.card ? { card: result.card.id } : {}),
    ...(result.jevBest !== undefined ? { jevBest: Number(result.jevBest.toFixed(3)) } : {}),
    ...(result.routing?.answeredBy ? { model: result.routing.answeredBy } : {}),
    chatCalls: result.usage.chatCalls, tokens: { in: result.usage.promptTokens, out: result.usage.completionTokens },
    sources: result.sources.map(source => ({ id: source.id, title: source.title, url: source.url })),
    ...(closest?.length ? { closest } : {}),
    flags: { ...(result.uncited ? { uncited: true } : {}), ...(result.invalidCitations.length ? { invalidCitations: result.invalidCitations.length } : {}), ...(result.unsupportedCode.length ? { unsupportedCode: result.unsupportedCode.length } : {}), ...(result.unsupportedClaims.length ? { unsupportedClaims: result.unsupportedClaims.length } : {}) },
    verified: result.verified, notes: result.notes.map(note => trim(redact(note), 300)),
    answer: options.answers === false ? '' : trim(redact(result.answer), 4000), ms: Math.round(event.elapsedMs)
  };
}

// The log must not sit where a deploy could publish it. This resolves symlinks in the part of the path that exists.
export async function checkLogPath(file: string, siteDirectory: string): Promise<string> {
  const target = path.resolve(file);
  let existing = path.dirname(target);
  const rest: string[] = [path.basename(target)];
  for (;;) {
    try { existing = await realpath(existing); break; }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; rest.unshift(path.basename(existing)); const parent = path.dirname(existing); if (parent === existing) break; existing = parent; }
  }
  const real = path.join(existing, ...rest);
  const site = await realpath(path.resolve(siteDirectory));
  if (real === site || real.startsWith(site + path.sep)) throw new Error('The log file must be outside the site directory, because a deploy could publish it');
  return target;
}

export class AskLog {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(readonly file: string, private readonly options: { maxBytes?: number; answers?: boolean } = {}) {}

  // Writes are queued so lines never interleave. A failure never reaches the reader who asked.
  write(event: AskEvent): Promise<void> {
    const line = `${JSON.stringify(toRecord(event, this.options))}\n`;
    const next = this.queue.then(async () => {
      await mkdir(path.dirname(this.file), { recursive: true, mode: 0o700 });
      const size = await stat(this.file).then(info => info.size, () => 0);
      if (size + line.length > (this.options.maxBytes ?? 5_000_000)) await rename(this.file, `${this.file}.1`);
      await appendFile(this.file, line, { mode: 0o600 });
    });
    this.queue = next.catch(() => {});
    return next.catch(() => {});
  }
}

export async function readLog(file: string): Promise<LogRecord[]> {
  const records: LogRecord[] = [];
  for (const line of (await readFile(file, 'utf8')).split('\n')) {
    if (!line.trim()) continue;
    try { const record = JSON.parse(line) as LogRecord; if (record?.v === 1 && typeof record.question === 'string') records.push(record); } catch { /* a line cut off by a crash */ }
  }
  return records;
}

// `offTopic` is a question that no page came close to answering, so it is probably not something the docs should cover.
export type Gap = { question: string; count: number; decisions: string[]; bestScore?: number; offTopic: boolean; closest: Array<{ title: string; url: string }> };
export type CardCandidate = { question: string; count: number; pages: string[] };
export type Flagged = { question: string; count: number; flags: string[]; model?: string };
export type LogReport = {
  total: number; from?: string; to?: string; byDecision: Record<string, number>; modelCalls: number; modelShare: number; tokens: { in: number; out: number }; medianMs: number;
  gaps: Gap[]; cards: CardCandidate[]; flagged: Flagged[]; paused: number;
};

const median = (values: number[]) => { const sorted = [...values].sort((a, b) => a - b); return sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0; };
const operational = (record: LogRecord) => record.decision === 'search' && record.notes.some(note => /daily budget|scorer that checks/.test(note));

// Turns the log into three lists. Gaps are questions the docs did not answer, most asked first. Card candidates are questions asked more than once
// that the model answered cleanly and no card covers, which would be free to serve from a card. Flagged answers are worth reading for the eval set.
// Questions are grouped by their normalized text, so a paraphrase counts as a separate question.
export function analyzeLog(records: LogRecord[], options: { minRepeats?: number } = {}): LogReport {
  const minRepeats = options.minRepeats ?? 2;
  const groups = new Map<string, LogRecord[]>();
  for (const record of records) {
    const key = normalizeQuestion(record.standalone ?? record.question);
    groups.set(key, [...(groups.get(key) ?? []), record]);
  }
  const byDecision: Record<string, number> = {};
  for (const record of records) byDecision[record.decision] = (byDecision[record.decision] ?? 0) + 1;
  const modelCalls = records.reduce((total, record) => total + record.chatCalls, 0);
  const gaps: Gap[] = [];
  const cards: CardCandidate[] = [];
  const flagged: Flagged[] = [];
  for (const [question, group] of groups) {
    const missed = group.filter(record => (record.decision === 'declined' || record.decision === 'hedged'));
    if (missed.length) {
      const scores = missed.map(record => record.jevBest).filter((score): score is number => score !== undefined);
      const closest = new Map<string, { title: string; url: string }>();
      for (const record of missed) for (const page of record.closest ?? record.sources) closest.set(page.url, { title: page.title, url: page.url });
      gaps.push({ question, count: missed.length, decisions: [...new Set(missed.map(record => record.decision))], ...(scores.length ? { bestScore: Math.max(...scores) } : {}), offTopic: scores.length > 0 && Math.max(...scores) < closestFloor && missed.every(record => record.decision === 'declined'), closest: [...closest.values()].slice(0, 3) });
    }
    const covered = group.some(record => record.decision === 'card');
    const clean = group.filter(record => record.decision === 'answered' && record.chatCalls > 0 && !Object.keys(record.flags).length && !record.followUp);
    const demand = group.filter(record => !record.followUp && ['answered', 'excerpt', 'card'].includes(record.decision)).length;
    if (!covered && clean.length && demand >= minRepeats) cards.push({ question, count: demand, pages: [...new Set(clean.flatMap(record => record.sources.map(source => source.url.split('#')[0])))] });
    const bad = group.filter(record => Object.keys(record.flags).length);
    if (bad.length) flagged.push({ question, count: bad.length, flags: [...new Set(bad.flatMap(record => Object.keys(record.flags)))], ...(bad[0].model ? { model: bad[0].model } : {}) });
  }
  const byCount = <T extends { count: number }>(items: T[]) => items.sort((a, b) => b.count - a.count);
  return {
    total: records.length, ...(records.length ? { from: records[0].at, to: records[records.length - 1].at } : {}), byDecision, modelCalls,
    modelShare: records.length ? records.filter(record => record.chatCalls > 0).length / records.length : 0,
    tokens: { in: records.reduce((total, record) => total + record.tokens.in, 0), out: records.reduce((total, record) => total + record.tokens.out, 0) },
    medianMs: median(records.map(record => record.ms)), gaps: byCount(gaps), cards: byCount(cards), flagged: byCount(flagged), paused: records.filter(operational).length
  };
}

export function formatReport(report: LogReport, limit = 15): string {
  const lines: string[] = [];
  const pct = (value: number) => `${Math.round(value * 100)}%`;
  lines.push(`# Ask log: ${report.total} question${report.total === 1 ? '' : 's'}${report.from ? `, ${report.from.slice(0, 10)} to ${report.to?.slice(0, 10)}` : ''}`, '');
  if (!report.total) return `${lines.join('\n')}\nThe log is empty.\n`;
  lines.push(`- How they were answered: ${Object.entries(report.byDecision).sort(([, a], [, b]) => b - a).map(([name, count]) => `${count} ${name}`).join(', ')}`);
  lines.push(`- ${pct(report.modelShare)} of questions called the model (${report.modelCalls} calls, ${report.tokens.in} in and ${report.tokens.out} out tokens). Median time ${(report.medianMs / 1000).toFixed(1)}s.`);
  if (report.paused) lines.push(`- ${report.paused} question${report.paused === 1 ? '' : 's'} got only a list of pages, because the scorer was down or the daily budget was spent.`);
  const section = (title: string, note: string, rows: string[]) => { lines.push('', `## ${title}`, note, ''); lines.push(...(rows.length ? rows : ['None.'])); };
  const near = report.gaps.filter(gap => !gap.offTopic);
  const off = report.gaps.filter(gap => gap.offTopic);
  section('Gaps in the docs', 'Questions the docs came close to answering but did not, most asked first. Each is a page or a paragraph to write, or a question the docs should say they do not cover.',
    near.slice(0, limit).map(gap => `- ${gap.count}× "${gap.question}" (${gap.decisions.join(', ')}${gap.bestScore !== undefined ? `, best score ${gap.bestScore}` : ''})${gap.closest.length ? `. Closest: ${gap.closest.map(page => `${page.title} ${page.url}`).join('; ')}` : ''}`));
  if (off.length) lines.push('', `Off topic: ${off.reduce((total, gap) => total + gap.count, 0)} question${off.reduce((total, gap) => total + gap.count, 0) === 1 ? '' : 's'} that no page came close to answering, such as ${off.slice(0, 3).map(gap => `"${gap.question}"`).join(', ')}. They are probably not gaps.`);
  section('Questions worth answering ahead of time', 'Asked more than once, answered cleanly by the model, and not served by a card. `--cards-out FILE` writes them in the format `shoalrun answers` reads.',
    report.cards.slice(0, limit).map(card => `- ${card.count}× "${card.question}"${card.pages.length ? ` (${card.pages.join(', ')})` : ''}`));
  section('Flagged answers', 'Answers a check flagged. Read them, and add the good ones to the eval set.',
    report.flagged.slice(0, limit).map(item => `- ${item.count}× "${item.question}" (${item.flags.join(', ')}${item.model ? `, ${item.model}` : ''})`));
  return `${lines.join('\n')}\n`;
}
