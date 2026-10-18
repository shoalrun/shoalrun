import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { evidenceCoverage, payloadCost, compareSectionReads } from './eval-section-reads.mjs';

const task = { expectedPageIds: ['page'], evidence: ['Required configuration'] };
test('coverage requires evidence, source identity, and an untruncated response', () => {
  const result = { id: 'page', content: 'REQUIRED\nconfiguration', budget: { truncated: false } };
  assert.equal(evidenceCoverage(task, result).complete, true);
  assert.equal(evidenceCoverage(task, { ...result, id: 'other' }).complete, false);
  assert.equal(evidenceCoverage(task, { ...result, budget: { truncated: true } }).complete, false);
  assert.deepEqual(evidenceCoverage(task, { ...result, content: '' }).missing, task.evidence);
  assert.equal(evidenceCoverage(task, undefined).complete, false);
});
test('cost includes serialized metadata and counts Unicode bytes', () => {
  const result = { content: '🦀', metadata: 'context' };
  const cost = payloadCost(result);
  assert.equal(cost.calls, 1);
  assert.equal(cost.markdownBytes, 4);
  assert.equal(cost.payloadBytes, Buffer.byteLength(JSON.stringify(result)));
  assert.ok(cost.payloadTokens > 0);
  assert.ok(cost.payloadBytes > cost.markdownBytes);
});
test('invalid fixture fails before retrieval', async () => {
  await assert.rejects(compareSectionReads('/nonexistent', { schemaVersion: 0 }), /Invalid task fixture/);
});
