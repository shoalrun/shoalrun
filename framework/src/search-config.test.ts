import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateSearch } from './search-config.js';

test('search limits default independently and allow partial site overrides', () => {
  assert.deepEqual(validateSearch(undefined).limits, { perCallerPerDay: 100, perDay: 1000, perCallerPerMinute: 10 });
  assert.deepEqual(validateSearch({ synonyms: [['chart', 'graph']], limits: { perCallerPerDay: 250 } }).limits, { perCallerPerDay: 250, perDay: 1000, perCallerPerMinute: 10 });
});

test('search limits reject unknown settings and invalid counts', () => {
  for (const value of [null, [], { limit: 1 }, { limits: [] }, { limits: { perCaller: 10 } }, { synonyms: [['chart']] }]) assert.throws(() => validateSearch(value));
  for (const key of ['perCallerPerDay', 'perDay', 'perCallerPerMinute']) for (const value of [0, -1, 1.5, Infinity, Number.MAX_SAFE_INTEGER + 1, '100', null]) {
    assert.throws(() => validateSearch({ limits: { [key]: value } }), new RegExp(`search.limits.${key}`));
  }
});
