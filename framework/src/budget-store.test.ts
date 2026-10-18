import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DailyBudget } from './budget.js';
import { envBudgetStore, restBudgetStore } from './budget-store.js';

type Call = { url: string; headers: Record<string, string>; body: unknown };
function fakeRedis(respond: (body: unknown, url: string) => Response) {
  const calls: Call[] = [];
  const send = (async (url: string, init: RequestInit) => { const body = JSON.parse(init.body as string); calls.push({ url, headers: init.headers as Record<string, string>, body }); return respond(body, url); }) as unknown as typeof fetch;
  return { calls, send };
}

test('add increments in one pipeline and gives the counter a lifetime only the first time', async () => {
  const { calls, send } = fakeRedis(() => Response.json([{ result: 4 }, { result: 1 }]));
  const store = restBudgetStore({ url: 'https://example.upstash.io/', token: 'secret-token', fetch: send });
  assert.equal(await store.add('budget:d:a', 1, 172800), 4);
  assert.equal(calls[0].url, 'https://example.upstash.io/pipeline');
  assert.deepEqual(calls[0].body, [['INCRBY', 'budget:d:a', '1'], ['EXPIRE', 'budget:d:a', '172800', 'NX']]);
  assert.equal(calls[0].headers.authorization, 'Bearer secret-token');
});

test('get reads a count, and a missing counter is zero', async () => {
  const values: unknown[] = [{ result: '7' }, { result: null }];
  const { calls, send } = fakeRedis(() => Response.json(values.shift()));
  const store = restBudgetStore({ url: 'https://example.upstash.io', token: 't', fetch: send });
  assert.equal(await store.get('k'), 7);
  assert.equal(await store.get('k'), 0);
  assert.equal(calls[0].url, 'https://example.upstash.io');
  assert.deepEqual(calls[0].body, ['GET', 'k']);
});

test('REST-backed refunds keep the reservation day across UTC midnight', async () => {
  const counters = new Map<string, number>();
  const { calls, send } = fakeRedis(body => {
    const commands = body as string[][];
    return Response.json(commands.map(([command, key, value]) => {
      if (command === 'INCRBY') counters.set(key, (counters.get(key) ?? 0) + Number(value));
      return { result: command === 'INCRBY' ? counters.get(key) : 1 };
    }));
  });
  let time = Date.parse('2026-09-26T23:59:59Z');
  const budget = new DailyBudget(restBudgetStore({ url: 'https://example.upstash.io', token: 't', fetch: send }), { perCaller: 1, perDay: 1 }, () => time);
  const receipt = await budget.reserveWithReceipt('alice');
  assert.ok(receipt);
  time += 2000;
  await budget.releaseReservation(receipt);
  assert.equal(counters.get(receipt.callerKey), 0);
  assert.equal(counters.get(receipt.siteKey), 0);
  assert.ok([...counters.keys()].every(key => key.includes('2026-09-26')));
  assert.equal(calls.filter(call => JSON.stringify(call.body).includes('INCRBY')).length, 4);
});

test('errors, bad answers, and slow stores throw without leaking the token, and nothing retries', async () => {
  const token = 'secret-token-value';
  const cases: Array<[Response, RegExp]> = [
    [new Response('nope', { status: 401 }), /returned 401/],
    [Response.json({ error: 'WRONGTYPE' }), /returned an error/],
    [Response.json({ result: 'lots' }), /not a count/],
    [Response.json({ result: -3 }), /not a count/]
  ];
  for (const [response, pattern] of cases) {
    const { calls, send } = fakeRedis(() => response);
    const store = restBudgetStore({ url: 'https://example.upstash.io', token, fetch: send });
    await assert.rejects(store.get('k'), (error: Error) => { assert.match(error.message, pattern); assert.ok(!error.message.includes(token)); return true; });
    assert.equal(calls.length, 1);
  }
  const pipeline = fakeRedis(() => Response.json([{ result: 1 }]));
  await assert.rejects(restBudgetStore({ url: 'https://example.upstash.io', token, fetch: pipeline.send }).add('k', 1, 60), /unexpected answer/);
  const noExpiry = fakeRedis(() => Response.json([{ result: 1 }, { error: 'ERR syntax error' }]));
  await assert.rejects(restBudgetStore({ url: 'https://example.upstash.io', token, fetch: noExpiry.send }).add('k', 1, 60), /returned an error/);
  const broken = (async () => { throw new Error('connect ECONNREFUSED'); }) as unknown as typeof fetch;
  await assert.rejects(restBudgetStore({ url: 'https://example.upstash.io', token, fetch: broken }).get('k'), /request failed: connect ECONNREFUSED/);
});

test('the address must be https except for localhost and carry no credentials', () => {
  const make = (url: string) => () => restBudgetStore({ url, token: 't' });
  assert.throws(make('not a url'), /not a valid URL/);
  assert.throws(make('http://example.upstash.io'), /must use https/);
  assert.throws(make('https://user:pw@example.upstash.io'), /credentials/);
  assert.throws(make('https://example.upstash.io/?token=abc'), /credentials or a query/);
  assert.doesNotThrow(make('http://localhost:8079'));
});

test('the environment store reads its variables on first use, and a missing one means the budget counts as spent', async () => {
  const { send } = fakeRedis(() => Response.json([{ result: 1 }, { result: 1 }]));
  const problems: string[] = [];
  const missing = new DailyBudget(envBudgetStore({ urlEnv: 'STORE_URL', tokenEnv: 'STORE_TOKEN' }, { STORE_URL: 'https://example.upstash.io' }, send), { perCaller: 5, perDay: 50 }, Date.now, error => problems.push(error.message));
  assert.equal(await missing.reserve('caller'), false);
  assert.deepEqual(problems, ['Set STORE_TOKEN to use the budget store']);
  const ready = new DailyBudget(envBudgetStore({ urlEnv: 'STORE_URL', tokenEnv: 'STORE_TOKEN' }, { STORE_URL: 'https://example.upstash.io', STORE_TOKEN: 't' }, send), { perCaller: 5, perDay: 50 });
  assert.equal(await ready.reserve('caller'), true);
});
