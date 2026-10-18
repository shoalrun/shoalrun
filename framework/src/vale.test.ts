import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { parseValeAlerts, runVale } from './vale.js';

test('Vale JSON maps to findings and ignores unusable shapes', () => {
  const findings = parseValeAlerts({
    '/tmp/draft.mdx': [
      { Check: 'Direct.Hedging', Severity: 'error', Message: 'Hedge.', Line: 4, Span: [4, 2], Match: 'may want to' },
      { Check: 'Voices.Weasel', Severity: 'warning', Message: 'Weasel.' }
    ],
    other: 'not an alert list'
  });
  assert.deepEqual(findings[0], { rule: 'Direct.Hedging', severity: 'error', message: 'Hedge.', line: 4, span: [4, 2], match: 'may want to' });
  assert.deepEqual(findings[1], { rule: 'Voices.Weasel', severity: 'warning', message: 'Weasel.' });
  assert.deepEqual(parseValeAlerts(null), []);
  assert.deepEqual(parseValeAlerts([1, 2]), []);
});

test('a missing Vale executable is unavailable, not a failed draft', async () => {
  const result = await runVale({ directory: process.cwd(), files: ['page.mdx'], command: ['definitely-not-a-real-binary-shoalrun'] });
  assert.equal(result.status, 'unavailable');
  assert.deepEqual(result.findings, []);
});

for (const [code, output] of [[2, {}], [1, {}], [0, []], [0, { file: 'invalid' }], [2, { file: [{ Check: 'Style.Rule', Severity: 'warning', Message: 'Fix this.' }] }]] as const) {
  test(`Vale rejects unsuccessful or malformed output: exit ${code}, ${JSON.stringify(output)}`, async () => {
    const result = await runVale({ directory: process.cwd(), files: [], command: [process.execPath, '-e', `process.stdout.write(${JSON.stringify(JSON.stringify(output))}); process.exit(${code})`, '--'] });
    assert.equal(result.status, 'error');
    assert.match(result.error ?? '', /Vale exited/);
  });
}

test('Vale accepts a clean check and normal nonzero style findings', async () => {
  for (const code of [0, 1]) {
    const output = code ? { file: [{ Check: 'Style.Rule', Severity: 'warning', Message: 'Fix this.' }] } : {};
    const result = await runVale({ directory: process.cwd(), files: [], command: [process.execPath, '-e', `process.stdout.write(${JSON.stringify(JSON.stringify(output))}); process.exit(${code})`, '--'] });
    assert.equal(result.status, 'ok');
    assert.equal(result.error, undefined);
    assert.equal(result.findings.length, code);
  }
});

test('a Vale config error object is reported as an error, not as no findings', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-vale-test-'));
  try {
    await writeFile(path.join(directory, '.vale.ini'), 'StylesPath = .vale/styles\n\n[*.{md,mdx}]\nBasedOnStyles = Vale\n');
    await writeFile(path.join(directory, 'page.md'), '# Title\n');
    const result = await runVale({ directory, files: ['page.md'], config: path.join(directory, '.vale.ini'), command: ['vale'] });
    if (result.status !== 'unavailable') {
      assert.equal(result.status, 'error');
      assert.match(result.error ?? '', /does(?: not|n't) exist/);
      assert.deepEqual(result.findings, []);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
