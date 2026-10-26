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
  const compile = 'node .github/scripts/ci-phase.mjs run compile npm run build --prefix framework';
  const tests = 'node .github/scripts/ci-phase.mjs run tests npm run test:compiled';
  const install = 'node .github/scripts/ci-phase.mjs run package-install node framework/scripts/package-authoring-smoke.mjs --clean-install';
  assert.equal(commands.filter(command => command === compile).length, 1);
  assert.ok(commands.includes(tests));
  assert.ok(commands.includes(install));
  assert.ok(commands.indexOf(compile) < commands.indexOf(tests));
  assert.ok(commands.indexOf(tests) < commands.indexOf(install));
  for (const step of job.steps) {
    assert.ok(!step['continue-on-error']);
    if (step.run === 'node .github/scripts/ci-phase.mjs summary') assert.equal(step.if, '${{ always() }}');
    else assert.ok(!step.if, 'required validation must not be conditionally skipped');
  }
  assert.equal(job.steps.find(step => step.id === 'node').with.cache, 'npm');
  for (const id of ['pip', 'browser']) {
    const cache = job.steps.find(step => step.id === id);
    assert.equal(cache.uses, 'actions/cache@v4');
    assert.match(cache.with.key, /hashFiles/);
    assert.ok(!cache.with.path.includes('node_modules'));
  }
  const rootPackage = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));
  const frameworkPackage = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.match(rootPackage.scripts.test, /npm --prefix framework test/);
  assert.match(frameworkPackage.scripts.test, /node --test --test-concurrency=4 dist\/\*\.test\.js/);
  assert.match(rootPackage.scripts['test:compiled'], /node --test --test-concurrency=4 framework\/dist\/\*\.test\.js/);
  const authoringTests = frameworkPackage.scripts['test:authoring-tools'].match(/dist\/[^ ]+\.test\.js/g) ?? [];
  assert.ok(authoringTests.length);
  for (const file of authoringTests) assert.match(file, /^dist\/[^/]+\.test\.js$/);
});
