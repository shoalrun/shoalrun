import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import YAML from 'yaml';

test('manual CI includes authoring regressions and the isolated package check in one fail-fast job', async () => {
  const workflow = YAML.parse(await readFile(new URL('../../.github/workflows/ci.yml', import.meta.url), 'utf8'));
  assert.deepEqual(Object.keys(workflow.on), ['workflow_dispatch']);
  assert.equal(Object.keys(workflow.jobs).length, 1);
  const job = Object.values(workflow.jobs)[0];
  const commands = job.steps.filter(step => step.run).map(step => step.run);
  assert.ok(commands.includes('npm test'));
  assert.ok(commands.includes('node framework/scripts/package-authoring-smoke.mjs --clean-install'));
  assert.ok(commands.indexOf('npm test') < commands.indexOf('node framework/scripts/package-authoring-smoke.mjs --clean-install'));
  for (const step of job.steps) {
    assert.ok(!step['continue-on-error']);
    assert.ok(!step.if, 'required validation must not be conditionally skipped');
  }
  const rootPackage = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));
  const frameworkPackage = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.match(rootPackage.scripts.test, /npm --prefix framework test/);
  assert.match(frameworkPackage.scripts.test, /node --test dist\/\*\.test\.js/);
  const authoringTests = frameworkPackage.scripts['test:authoring-tools'].match(/dist\/[^ ]+\.test\.js/g) ?? [];
  assert.ok(authoringTests.length);
  for (const file of authoringTests) assert.match(file, /^dist\/[^/]+\.test\.js$/);
});
