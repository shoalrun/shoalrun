import assert from 'node:assert/strict';
import { test } from 'node:test';
import { matchesTableRow } from '../assets/table-filter.js';

test('table filter matches all search words without case sensitivity', () => {
  assert.equal(matchesTableRow('Alpha first option', ''), true);
  assert.equal(matchesTableRow('Alpha first option', 'FIRST alpha'), true);
  assert.equal(matchesTableRow('Alpha first option', 'alpha missing'), false);
});
