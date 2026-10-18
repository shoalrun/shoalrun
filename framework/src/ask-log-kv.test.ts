import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { AskResult } from './ask.js';
import { deleteKvLogRecord, kvLogSink, logKey, readKvLog } from './ask-log-kv.js';
import { toRecord } from './ask-log.js';

const answer = (extra: Partial<AskResult> = {}): AskResult => ({ question: 'q', mode: 'hybrid+jev', decision: 'answered', answer: 'Run it [1].', sources: [{ number: 1, id: 'guide#run', title: 'Guide', heading: 'Run', url: '/guide#run' }], considered: [], uncited: false, invalidCitations: [], unsupportedCode: [], verified: true, claims: [], unsupportedClaims: [], jevBest: 0.9, notes: [], usage: { promptTokens: 10, completionTokens: 5, chatCalls: 1 }, timings: { rewriteMs: 0, retrieveMs: 1, rerankMs: 2, answerMs: 3, verifyMs: 4 }, ...extra });
const event = (question: string) => ({ question, history: [], result: answer(), elapsedMs: 100 });

function fakeRedis() {
  const lists = new Map<string, string[]>();
  const ttl = new Map<string, number>();
  const sent: string[][][] = [];
  return { lists, ttl, sent, async pipeline(commands: string[][]) {
    sent.push(commands);
    return commands.map(([command, key, a, b]) => {
      if (command === 'LPUSH') { lists.set(key, [a, ...(lists.get(key) ?? [])]); return lists.get(key)!.length; }
      if (command === 'LTRIM') { lists.set(key, (lists.get(key) ?? []).slice(Number(a), Number(b) + 1)); return 'OK'; }
      if (command === 'EXPIRE') { ttl.set(key, Number(a)); return 1; }
      if (command === 'LRANGE') return (lists.get(key) ?? []).slice(Number(a), b === '-1' ? undefined : Number(b) + 1);
      throw new Error(`unexpected ${command}`);
    });
  }, async command([command, key, a, b]: string[]) {
    if (command === 'LRANGE') return (lists.get(key) ?? []).slice(Number(a), b === '-1' ? undefined : Number(b) + 1);
    if (command === 'LREM') { const items = lists.get(key) ?? []; const index = items.indexOf(b); if (index < 0) return 0; items.splice(index, 1); return 1; }
    throw new Error(`unexpected ${command}`);
  } };
}

test('the sink writes a redacted record to the day\'s list with a lifetime and a cap, in one round trip', async () => {
  const redis = fakeRedis();
  const at = new Date('2026-09-26T23:59:00Z');
  const write = kvLogSink(redis, { retentionDays: 30, maxPerDay: 3, now: () => at });
  await write(event('mail jo@example.com about redirects'));
  assert.equal(redis.sent.length, 1);
  assert.deepEqual(redis.sent[0].map(command => command[0]), ['LPUSH', 'LTRIM', 'EXPIRE']);
  assert.deepEqual(redis.sent[0][1], ['LTRIM', 'asklog:2026-09-26', '0', '2']);
  assert.deepEqual(redis.sent[0][2], ['EXPIRE', 'asklog:2026-09-26', String(30 * 86400)]);
  const stored = JSON.parse(redis.lists.get('asklog:2026-09-26')![0]);
  assert.equal(stored.question, 'mail [email] about redirects');
  assert.equal(stored.at, '2026-09-26T23:59:00.000Z');
  assert.deepEqual(stored, JSON.parse(JSON.stringify(toRecord({ ...event('mail jo@example.com about redirects'), now: () => at }))));
  for (let at2 = 0; at2 < 5; at2++) await write(event(`question ${at2}`));
  assert.equal(redis.lists.get('asklog:2026-09-26')!.length, 3, 'only the newest entries of a day are kept');
  assert.equal(JSON.parse(redis.lists.get('asklog:2026-09-26')![0]).question, 'question 4');
});

test('answers can be left out, a new day starts a new list, and a failing store never throws', async () => {
  const redis = fakeRedis();
  let time = new Date('2026-09-26T12:00:00Z');
  const write = kvLogSink(redis, { retentionDays: 7, maxPerDay: 100, answers: false, now: () => time });
  await write(event('first'));
  time = new Date('2026-09-27T00:00:01Z');
  await write(event('second'));
  assert.deepEqual([...redis.lists.keys()].sort(), ['asklog:2026-09-26', 'asklog:2026-09-27']);
  assert.equal(JSON.parse(redis.lists.get('asklog:2026-09-27')![0]).answer, '');
  const errors: string[] = [];
  const failing = kvLogSink({ pipeline: async () => { throw new Error('store down'); } }, { retentionDays: 7, maxPerDay: 10, onError: error => errors.push(error.message) });
  await assert.doesNotReject(failing(event('q')));
  assert.deepEqual(errors, ['store down']);
  assert.throws(() => kvLogSink(redis, { retentionDays: 0, maxPerDay: 10 }), /retentionDays/);
  assert.throws(() => kvLogSink(redis, { retentionDays: 5, maxPerDay: 0 }), /maxPerDay/);
});

test('reading returns the last days oldest first and skips lines it cannot read', async () => {
  const redis = fakeRedis();
  const now = () => new Date('2026-09-28T10:00:00Z');
  const line = (question: string, at: string) => JSON.stringify({ ...toRecord({ ...event(question), now: () => new Date(at) }) });
  redis.lists.set(logKey('2026-09-26'), [line('b', '2026-09-26T09:00:00Z'), line('a', '2026-09-26T08:00:00Z')]);
  redis.lists.set(logKey('2026-09-28'), ['{"v":1,"question":"cut', line('c', '2026-09-28T01:00:00Z')]);
  redis.lists.set(logKey('2026-09-20'), [line('too old', '2026-09-20T01:00:00Z')]);
  const records = await readKvLog(redis, 3, now);
  assert.deepEqual(records.map(record => record.question), ['a', 'b', 'c']);
  assert.equal((await readKvLog(redis, 10, now)).length, 4);
  await assert.rejects(readKvLog(redis, 0, now), /days must be/);
  await assert.rejects(readKvLog(redis, 400, now), /days must be/);
});

test('deletion receipt removes only its record and can be reused safely', async () => {
  const redis = fakeRedis();
  const at = new Date('2026-09-26T12:00:00Z');
  const write = kvLogSink(redis, { retentionDays: 30, maxPerDay: 10, now: () => at });
  const receipt = `2026-09-26.${'a'.repeat(32)}`;
  await write({ ...event('remove me'), id: receipt });
  await write(event('keep me'));
  assert.equal(await deleteKvLogRecord(redis, receipt), true);
  assert.deepEqual((await readKvLog(redis, 1, () => at)).map(record => record.question), ['keep me']);
  assert.equal(await deleteKvLogRecord(redis, receipt), false);
  await assert.rejects(deleteKvLogRecord(redis, 'bad'), /Invalid question deletion receipt/);
});
