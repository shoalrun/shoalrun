import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, stat, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import type { AskResult } from './ask.js';
import { AskLog, analyzeLog, checkLogPath, formatReport, readLog, redact, toRecord, type LogRecord } from './ask-log.js';
import { createAskHandler } from './ask-handler.js';

const cli = path.join(path.dirname(fileURLToPath(import.meta.url)), 'cli.js');
const temp = () => mkdtemp(path.join(os.tmpdir(), 'ask-log-'));

const answer = (extra: Partial<AskResult> = {}): AskResult => ({ question: 'q', mode: 'hybrid+jev', decision: 'answered', answer: 'Run it [1].', sources: [{ number: 1, id: 'guide#run', title: 'Guide', heading: 'Run', url: '/guide#run' }], considered: [], uncited: false, invalidCitations: [], unsupportedCode: [], verified: true, claims: [], unsupportedClaims: [], jevBest: 0.93, notes: [], usage: { promptTokens: 100, completionTokens: 20, chatCalls: 1 }, timings: { rewriteMs: 0, retrieveMs: 1, rerankMs: 2, answerMs: 3, verifyMs: 4 }, routing: { answeredBy: 'some/model', failed: [] }, ...extra });
const event = (question: string, extra: Partial<AskResult> = {}, history: unknown[] = []) => ({ question, history, result: answer(extra), elapsedMs: 1234 });
const record = (question: string, extra: Partial<LogRecord> = {}): LogRecord => ({ ...toRecord(event(question)), ...extra });

test('redaction removes emails, keys, long numbers, and URL queries, and leaves ordinary text and short numbers alone', () => {
  assert.equal(redact('mail me at jo.smith+docs@example.com please'), 'mail me at [email] please');
  assert.equal(redact('my key is sk-or-v1-abcdef0123456789abcd'), 'my key is [secret]');
  assert.equal(redact('token ghp_abcdefghijklmnop1234'), 'token [secret]');
  assert.equal(redact('id 0123456789abcdef0123456789abcdef0123'), 'id [secret]');
  assert.equal(redact('call +1 (415) 555-0132 today'), 'call [number] today');
  assert.equal(redact('card 4242 4242 4242 4242'), 'card [number]');
  assert.equal(redact('see https://example.com/page?token=abc123&user=jo#top now'), 'see https://example.com/page now');
  assert.equal(redact('Node 22.12.0 on 2026-09-26 at 203.0.113.9 port 8765'), 'Node 22.12.0 on 2026-09-26 at 203.0.113.9 port 8765');
  assert.equal(redact('how do I add a redirect'), 'how do I add a redirect');
});

test('a record keeps what is needed to find gaps, redacts the text, and can leave the answer out', () => {
  const at = new Date('2026-09-26T12:00:00Z');
  const full = toRecord({ ...event('email jo@example.com about redirects', { standalone: 'redirects for jo@example.com', cached: true, notes: ['a note with jo@example.com'], unsupportedClaims: [{ text: 'x', support: 0.1 }] }, [{}]), now: () => at });
  assert.equal(full.at, '2026-09-26T12:00:00.000Z');
  assert.equal(full.question, 'email [email] about redirects');
  assert.equal(full.standalone, 'redirects for [email]');
  assert.equal(full.followUp, true);
  assert.equal(full.cached, true);
  assert.deepEqual(full.flags, { unsupportedClaims: 1 });
  assert.deepEqual(full.notes, ['a note with [email]']);
  assert.deepEqual({ model: full.model, jevBest: full.jevBest, chatCalls: full.chatCalls, tokens: full.tokens, ms: full.ms }, { model: 'some/model', jevBest: 0.93, chatCalls: 1, tokens: { in: 100, out: 20 }, ms: 1234 });
  assert.equal(toRecord(event('q'), { answers: false }).answer, '');
  const declined = toRecord(event('unknown thing', { decision: 'declined', sources: [], answer: 'The documentation does not cover that.\n\nThe closest pages are:\n- CLI reference: /cli\n- Glossary: /glossary' }));
  assert.deepEqual(declined.closest, [{ title: 'CLI reference', url: '/cli' }, { title: 'Glossary', url: '/glossary' }]);
});

test('the log path must be outside the site directory, even through a symlink', async () => {
  const root = await temp();
  const site = path.join(root, 'site');
  const outside = path.join(root, 'logs');
  await mkdir(site); await mkdir(outside);
  await assert.rejects(checkLogPath(path.join(site, 'ai', 'ask.jsonl'), site), /outside the site directory/);
  await assert.rejects(checkLogPath(path.join(site, 'ask.jsonl'), site), /outside the site directory/);
  await symlink(site, path.join(outside, 'link'));
  await assert.rejects(checkLogPath(path.join(outside, 'link', 'ask.jsonl'), site), /outside the site directory/);
  assert.equal(await checkLogPath(path.join(outside, 'new', 'ask.jsonl'), site), path.join(outside, 'new', 'ask.jsonl'));
});

test('the log appends one JSON line per question, readable by its owner only, and concurrent writes do not interleave', async () => {
  const file = path.join(await temp(), 'nested', 'ask.jsonl');
  const log = new AskLog(file);
  await Promise.all(Array.from({ length: 25 }, (_, at) => log.write(event(`question ${at}`))));
  const records = await readLog(file);
  assert.equal(records.length, 25);
  assert.equal(new Set(records.map(item => item.question)).size, 25);
  assert.equal((await stat(file)).mode & 0o777, 0o600);
  await writeFile(file, (await readFile(file, 'utf8')) + '{"v":1,"question":"cut off');
  assert.equal((await readLog(file)).length, 25, 'a line cut off by a crash is skipped');
});

test('the log rotates at its size limit, and a failing log never throws to the caller', async () => {
  const dir = await temp();
  const file = path.join(dir, 'ask.jsonl');
  const log = new AskLog(file, { maxBytes: 1500 });
  for (let at = 0; at < 12; at++) await log.write(event(`question number ${at}`));
  assert.ok((await stat(`${file}.1`)).size > 0);
  assert.ok((await stat(file)).size <= 1500 + 1000);
  const blocked = path.join(dir, 'a-file');
  await writeFile(blocked, 'x');
  await assert.doesNotReject(new AskLog(path.join(blocked, 'ask.jsonl')).write(event('q')));
});

test('the report lists gaps, card candidates, and flagged answers, most asked first, and ignores follow-ups for cards', () => {
  const declined = (question: string, extra: Partial<LogRecord> = {}) => record(question, { decision: 'declined', chatCalls: 0, sources: [], answer: 'The documentation does not cover that.', jevBest: 0.1, ...extra });
  const records = [
    declined('How do I export to PDF?'), declined('how do I export to pdf'), declined('how do I export to PDF?!'), declined('how do I add comments'),
    record('how do I add a redirect'), record('How do I add a redirect?'), record('how do I add a redirect'),
    record('what port does serve use'),
    record('how do I deploy', { decision: 'card', chatCalls: 0 }), record('how do I deploy'), record('how do I deploy'),
    record('and the second one?', { followUp: true }), record('and the second one?', { followUp: true }),
    record('explain focused contracts', { flags: { unsupportedClaims: 1 } }), record('explain focused contracts', { flags: { unsupportedCode: 1 } }),
    record('anything', { decision: 'search', chatCalls: 0, notes: ['The model was not called, because the daily budget is spent.'] })
  ];
  const report = analyzeLog(records);
  assert.equal(report.total, 16);
  assert.deepEqual(report.gaps.map(gap => [gap.question, gap.count]), [['how do i export to pdf', 3], ['how do i add comments', 1]]);
  assert.ok(report.gaps.every(gap => gap.offTopic), 'a best score of 0.1 is below the closeness floor');
  const near = analyzeLog([declined('how do i contact the owner', { jevBest: 0.53 }), record('write a poem', { decision: 'hedged', jevBest: 0.5 }), declined('how do i run a marathon', { jevBest: 0.01 })]);
  assert.deepEqual(near.gaps.map(gap => [gap.question, gap.offTopic]).sort(), [['how do i contact the owner', false], ['how do i run a marathon', true], ['write a poem', false]]);
  assert.deepEqual(report.cards.map(card => [card.question, card.count]), [['how do i add a redirect', 3]], 'a card already covers deploy, and one-off, follow-up, and flagged questions do not qualify');
  assert.deepEqual(report.cards[0].pages, ['/guide']);
  assert.deepEqual(report.flagged.map(item => [item.question, item.count, item.flags.sort()]), [['explain focused contracts', 2, ['unsupportedClaims', 'unsupportedCode']]]);
  assert.equal(report.paused, 1);
  assert.ok(report.modelShare > 0 && report.modelShare < 1);
  assert.equal(analyzeLog(records, { minRepeats: 4 }).cards.length, 0);
  const text = formatReport(report);
  assert.match(text, /## Gaps in the docs/);
  assert.match(text, /Off topic: 4 questions that no page came close to answering, such as "how do i export to pdf"/);
  assert.match(formatReport(near), /1× "how do i contact the owner" \(declined, best score 0\.53\)/);
  assert.match(text, /## Questions worth answering ahead of time/);
  assert.match(text, /1 question got only a list of pages/);
  assert.match(formatReport(analyzeLog([])), /The log is empty/);
});

test('the handler records each question, and a failing recorder does not change the reader\'s answer', async () => {
  const seen: string[] = [];
  const handle = createAskHandler({ hosts: ['127.0.0.1:8765'], answer: async () => answer(), record: async logged => { seen.push(logged.question); throw new Error('disk full'); } });
  const response = await handle(new Request('http://127.0.0.1:8765/ask', { method: 'POST', headers: { host: '127.0.0.1:8765', 'content-type': 'application/json' }, body: JSON.stringify({ question: 'how do I add a redirect' }) }));
  assert.equal(response.status, 200);
  assert.equal((await response.json() as { answer: string }).answer, 'Run it [1].');
  assert.deepEqual(seen, ['how do I add a redirect']);
});

test('ask-log prints the report, writes a new card-question file, and never overwrites one', async () => {
  const dir = await temp();
  const file = path.join(dir, 'ask.jsonl');
  const log = new AskLog(file);
  for (let at = 0; at < 3; at++) await log.write(event('how do I add a redirect'));
  const run = (...args: string[]) => spawnSync(process.execPath, [cli, 'ask-log', file, ...args], { encoding: 'utf8' });
  const out = path.join(dir, 'candidates.yaml');
  const first = run('--cards-out', out);
  assert.equal(first.status, 0, first.stderr);
  assert.match(first.stdout, /Questions worth answering ahead of time/);
  assert.match(first.stdout, /3× "how do i add a redirect"/);
  assert.match(await readFile(out, 'utf8'), /- how do i add a redirect/);
  const again = run('--cards-out', out);
  assert.notEqual(again.status, 0);
  assert.match(again.stderr, /EEXIST/);
  assert.equal(JSON.parse(run('--json').stdout).total, 3);
  assert.match(run('--limit', '0').stderr, /whole number of 1 or more/);
  assert.match(spawnSync(process.execPath, [cli, 'ask-log'], { encoding: 'utf8' }).stderr, /Usage: shoalrun ask-log/);
});
