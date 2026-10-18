import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DailyBudget, SharedRateLimit, adaptiveChallenge, memoryBudgetStore, type BudgetStore } from './budget.js';

test('the memory store counts, and a counter expires after its lifetime', async () => {
  let time = 0;
  const store = memoryBudgetStore(() => time);
  assert.equal(await store.get('a'), 0);
  assert.equal(await store.add('a', 1, 10), 1);
  assert.equal(await store.add('a', 2, 10), 3);
  time = 9_999;
  assert.equal(await store.get('a'), 3);
  time = 10_000;
  assert.equal(await store.get('a'), 0);
  assert.equal(await store.add('a', 1, 10), 1);
});

test('a caller stops at their cap, the site stops at its cap, and the next UTC day starts fresh', async () => {
  let time = Date.parse('2026-09-26T23:00:00Z');
  const budget = new DailyBudget(memoryBudgetStore(() => time), { perCaller: 2, perDay: 3 }, () => time);
  assert.equal(await budget.reserve('alice'), true);
  assert.equal(await budget.reserve('alice'), true);
  assert.equal(await budget.reserve('alice'), false);
  assert.equal(await budget.reserve('bob'), true);
  assert.equal(await budget.reserve('bob'), false, 'the site-wide cap of 3 is spent');
  assert.equal(await budget.reserve('carol'), false);
  time = Date.parse('2026-09-27T00:00:01Z');
  assert.equal(await budget.reserve('alice'), true);
  assert.equal(await budget.reserve('carol'), true);
});

test('a denied question gives its slot back, and a released slot can be used again', async () => {
  const store = memoryBudgetStore();
  const budget = new DailyBudget(store, { perCaller: 1, perDay: 10 }, () => Date.parse('2026-09-26T12:00:00Z'));
  const reservation = await budget.reserveWithReceipt('a');
  assert.ok(reservation);
  for (let attempt = 0; attempt < 5; attempt++) assert.equal(await budget.reserve('a'), false);
  await budget.releaseReservation(reservation);
  assert.equal(await budget.reserve('a'), true, 'the denials did not eat into the count');
  assert.equal(await store.get('budget:2026-09-26:all'), 1);
});

test('a reservation refunded after UTC midnight only changes its original day', async () => {
  let time = Date.parse('2026-09-26T23:59:59Z');
  const store = memoryBudgetStore(() => time);
  const budget = new DailyBudget(store, { perCaller: 1, perDay: 1 }, () => time);
  const reservation = await budget.reserveWithReceipt('alice');
  assert.ok(reservation);
  time += 2000;
  await budget.releaseReservation(reservation);
  assert.equal(await store.get(reservation.callerKey), 0);
  assert.equal(await store.get(reservation.siteKey), 0);
  assert.deepEqual(await budget.usage('alice'), { mine: 0, all: 0 });
  assert.equal(await budget.reserve('alice'), true);
  assert.equal(await budget.reserve('alice'), false);
});

test('questions that arrive together cannot pass the cap between them', async () => {
  const budget = new DailyBudget(memoryBudgetStore(), { perCaller: 3, perDay: 3 });
  const results = await Promise.all(Array.from({ length: 50 }, () => budget.reserve('burst')));
  assert.equal(results.filter(Boolean).length, 3);
  const many = new DailyBudget(memoryBudgetStore(), { perCaller: 100, perDay: 7 });
  assert.equal((await Promise.all(Array.from({ length: 50 }, (_, at) => many.reserve(`caller-${at}`)))).filter(Boolean).length, 7);
});

test('the store never sees a raw caller address, and a failing store counts as spent', async () => {
  const keys: string[] = [];
  const spy: BudgetStore = { async add(key) { keys.push(key); return 1; }, async get(key) { keys.push(key); return 0; } };
  const budget = new DailyBudget(spy, { perCaller: 5, perDay: 50 });
  const reservation = await budget.reserveWithReceipt('203.0.113.9');
  assert.ok(reservation);
  await budget.releaseReservation(reservation);
  assert.ok(keys.length >= 4);
  assert.ok(keys.every(key => !key.includes('203.0.113.9')));
  const broken: BudgetStore = { async add() { throw new Error('down'); }, async get() { throw new Error('down'); } };
  const problems: string[] = [];
  const closed = new DailyBudget(broken, { perCaller: 5, perDay: 50 }, Date.now, error => problems.push(error.message));
  assert.equal(await closed.reserve('x'), false);
  await closed.releaseReservation({ callerKey: 'budget:2026-09-26:x', siteKey: 'budget:2026-09-26:all' });
  assert.deepEqual(problems, ['down', 'down']);
});

test('the shared rate limit counts each caller in a one-minute window, tells them when to retry, and refuses when the store fails', async () => {
  let time = Date.parse('2026-09-26T12:00:10Z');
  const limit = new SharedRateLimit(memoryBudgetStore(() => time), 3, () => time);
  for (let at = 0; at < 3; at++) assert.equal((await limit.take('alice')).allowed, true);
  const over = await limit.take('alice');
  assert.deepEqual(over, { allowed: false, retryAfterSeconds: 50 });
  assert.equal((await limit.take('bob')).allowed, true, 'another caller has their own window');
  time = Date.parse('2026-09-26T12:01:00Z');
  assert.equal((await limit.take('alice')).allowed, true, 'the next minute starts fresh');
  const problems: string[] = [];
  const broken: BudgetStore = { async add() { throw new Error('down'); }, async get() { throw new Error('down'); } };
  const closed = new SharedRateLimit(broken, 3, () => time, error => problems.push(error.message));
  assert.deepEqual(await closed.take('x'), { allowed: false, retryAfterSeconds: 5 });
  assert.deepEqual(problems, ['down']);
  assert.throws(() => new SharedRateLimit(memoryBudgetStore(), 0), /whole number of 1 or more/);
  const seen: string[] = [];
  const spy: BudgetStore = { async add(key) { seen.push(key); return 1; }, async get() { return 0; } };
  await new SharedRateLimit(spy, 3).take('203.0.113.9');
  assert.ok(seen.every(key => key.startsWith('rate:') && !key.includes('203.0.113.9')));
});

test('the adaptive challenge asks nobody at first, then a caller who has used their free questions, and everyone when the site is busy', async () => {
  const budget = new DailyBudget(memoryBudgetStore(), { perCaller: 50, perDay: 100 });
  const needed = adaptiveChallenge(budget, { freeQuestions: 2, busyShare: 0.5 });
  assert.equal(await needed('alice'), false);
  await budget.reserve('alice');
  assert.equal(await needed('alice'), false, 'one question used, two are free');
  await budget.reserve('alice');
  assert.equal(await needed('alice'), true, 'the free questions are used');
  assert.equal(await needed('bob'), false, 'another caller is unaffected');
  assert.deepEqual(await budget.usage('alice'), { mine: 2, all: 2 });
  for (let at = 0; at < 48; at++) await budget.reserve(`caller-${at}`);
  assert.equal(await needed('carol'), true, 'half the daily budget is gone, so everyone is asked');
  const broken: BudgetStore = { async add() { throw new Error('down'); }, async get() { throw new Error('down'); } };
  assert.equal(await adaptiveChallenge(new DailyBudget(broken, { perCaller: 5, perDay: 50 }))('x'), true, 'a store that fails means ask');
  assert.equal(await adaptiveChallenge(budget, { freeQuestions: 0 })('nobody-yet-but-busy'), true);
});
