import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import YAML from 'yaml';
for (const name of ['ci', 'evaluation-builds']) test(name + ' is explicit-only and uses one bounded job without a matrix', () => {
  const workflow = YAML.parse(readFileSync(new URL('../../.github/workflows/' + name + '.yml', import.meta.url), 'utf8'));
  assert.deepEqual(Object.keys(workflow.on), ['workflow_dispatch']);
  assert.equal(workflow.concurrency['cancel-in-progress'], true);
  assert.equal(Object.keys(workflow.jobs).length, 1);
  for (const job of Object.values(workflow.jobs)) {
    assert.equal(job.strategy, undefined);
    assert.equal(job['runs-on'], 'ubuntu-latest');
    assert.ok(job['timeout-minutes'] <= 15);
    assert.ok(!JSON.stringify(job).includes('docs/docs.config.yaml'));
  }
});
