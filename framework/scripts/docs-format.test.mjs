import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const available = spawnSync('vale', ['--version']).status === 0;
assert.ok(!process.env.CI || available, 'CI requires Vale on PATH; the action installation alone does not expose it to later commands.');
const page = (body, fields = '') => `---\nupdated: 2026-09-30\ntitle: Example page\nsummary: Complete a task.\ntype: how-to\n${fields}---\n\n${body}`;
async function lint(source, overrides) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-doc-shape-'));
  try {
    const file = path.join(directory, 'page.mdx');
    await writeFile(file, source);
    let config = path.join(root, '.vale-format.ini');
    if (overrides) {
      config = path.join(directory, '.vale.ini');
      await writeFile(config, `StylesPath = ${path.join(root, '.vale/styles')}\nMinAlertLevel = warning\n\n[*.{md,mdx}]\nBasedOnStyles = DocShape\n${overrides}\n`);
    }
    const result = spawnSync('vale', ['--config', config, '--output=JSON', file], { encoding: 'utf8', cwd: root });
    assert.ok(result.stdout.trim(), result.stderr || `Vale exited with ${result.status}`);
    const report = JSON.parse(result.stdout);
    assert.equal(report.Code, undefined, report.Text);
    return { status: result.status, alerts: Object.values(report).flat() };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test('format rules accept valid pages, quoted dates, and code examples containing other page shapes', { skip: !available }, async () => {
  const result = await lint(page('Use these steps to complete your task.\n\n## Do the task\n\n~~~~md\n# Wrong body title.\n\n## Reference\n\n```md\n## Step 1: Example\n```\n~~~~\n\n## What next?\n\nContinue with a related task.\n').replace('updated: 2026-09-30', 'updated: "2026-09-30" # edited today'));
  assert.equal(result.status, 0);
  assert.deepEqual(result.alerts, []);
});

test('format rules enforce metadata limits and dates with actionable findings', { skip: !available }, async () => {
  const result = await lint(page('A short introduction.\n').replace('title: Example page', `title: ${'x'.repeat(61)}`).replace('summary: Complete a task.', `summary: ${'y'.repeat(161)}`).replace('updated: 2026-09-30', 'updated: yesterday'));
  assert.equal(result.status, 1);
  assert.deepEqual(result.alerts.map(alert => alert.Check).sort(), ['DocShape.Structure', 'DocShape.SummaryLength', 'DocShape.TitleLength']);
  assert.ok(result.alerts.every(alert => alert.Line > 0));
  const missing = await lint(page('A short introduction.\n').replace('updated: 2026-09-30\n', ''));
  assert.match(missing.alerts[0].Message, /Add updated/);
});

test('format rules reject duplicate body titles, heading punctuation, and missing or long introductions', { skip: !available }, async () => {
  const result = await lint(page('A short introduction.\n\n# Another title.\n'));
  assert.equal(result.status, 1);
  assert.deepEqual(result.alerts.map(alert => alert.Check).sort(), ['DocShape.BodyTitle', 'DocShape.HeadingPunctuation']);
  const missing = await lint(page('## Start immediately\n\nSome detail.\n'));
  assert.match(missing.alerts[0].Message, /introductory paragraph/);
  const long = await lint(page(`${'word '.repeat(151)}\n\n## Details\n`));
  assert.match(long.alerts[0].Message, /150 words/);
  const landing = await lint(page('## Featured pages\n', 'layout: landing\n'));
  assert.deepEqual(landing.alerts, []);
});

test('type boundary checks are advisory and select the declared page type', { skip: !available }, async () => {
  for (const [kind, heading] of [['how-to', 'Reference'], ['recipe', 'Options'], ['reference', 'Step 1: Create a project'], ['api-reference', 'Do it'], ['tutorial', 'Alternatives'], ['explanation', 'Step 1: Start']]) {
    const ending = kind === 'recipe' ? '\n## Before you start\n\nHave a project.\n\n## Do it\n\nRun the action.\n\n## Check it worked\n\nConfirm the output.\n' : '';
    const result = await lint(page(`A short introduction.\n\n## ${heading}\n\nSome detail.\n${ending}`).replace('type: how-to', `type: "${kind}"`));
    assert.equal(result.status, 0, 'editorial signals should not fail the formatting gate');
    assert.equal(result.alerts.length, 1);
    assert.equal(result.alerts[0].Check, 'DocShape.TypeBoundary');
    assert.equal(result.alerts[0].Severity, 'warning');
    assert.equal(result.alerts[0].Line, 10);
  }
});

test('project policy can disable a boundary check and change a formatting error to a warning', { skip: !available }, async () => {
  const source = page('A short introduction.\n\n## Reference\n\nSome detail.\n').replace('title: Example page', `title: ${'x'.repeat(61)}`);
  const result = await lint(source, 'DocShape.TypeBoundary = NO\nDocShape.TitleLength = warning');
  assert.equal(result.status, 0);
  assert.equal(result.alerts.length, 1);
  assert.equal(result.alerts[0].Check, 'DocShape.TitleLength');
  assert.equal(result.alerts[0].Severity, 'warning');
});

const recipeBody = 'Complete this task.\n\n## Before you start\n\nHave a project.\n\n## Do it\n\nRun the task command.\n\n## Check it worked\n\nConfirm the output.\n';
const ingredientBody = 'Build one reusable artifact.\n\n## Inputs\n\nA source file.\n\n## Action\n\nRun the build.\n\n## Output\n\nThe built artifact.\n\n## Check it worked\n\nOpen the artifact.\n';
const typedPage = (kind, body, fields = '') => page(body, fields).replace('type: how-to', `type: "${kind}"`);

test('recipe shape accepts direct and assembled actions without requiring Ingredients', { skip: !available }, async () => {
  for (const body of [recipeBody, recipeBody.replace('## Do it', '## Compile the CLI').replace('## Check it worked', '## Check the outcome')]) {
    const result = await lint(typedPage('recipe', body));
    assert.equal(result.status, 0);
    assert.deepEqual(result.alerts, []);
  }
});

test('recipe shape rejects missing or empty setup, action, and outcome with source locations', { skip: !available }, async () => {
  const missing = await lint(typedPage('recipe', 'Complete this task.\n'));
  assert.equal(missing.status, 1);
  assert.equal(missing.alerts.length, 1);
  assert.match(missing.alerts[0].Message, /setup.*actions.*success check/);
  assert.ok(missing.alerts.every(alert => alert.Check === 'DocShape.RecipeShape' && alert.Line === 5));
  for (const [heading, content] of [['Before you start', 'Have a project.'], ['Do it', 'Run the task command.'], ['Check it worked', 'Confirm the output.']]) {
    const empty = await lint(typedPage('recipe', recipeBody.replace(content, '')));
    assert.equal(empty.status, 1, heading);
    assert.ok(empty.alerts.some(alert => alert.Check === 'DocShape.RecipeShape'));
  }
});

test('recipe shape ignores headings in nested fenced examples and only applies to recipe pages', { skip: !available }, async () => {
  const fakeSections = 'Describe a task.\n\n~~~~md\n## Before you start\n\nSetup.\n\n```md\n## Do it\n\nAction.\n```\n\n## Check it worked\n\nCheck.\n~~~~\n';
  const recipe = await lint(typedPage('recipe', fakeSections));
  assert.equal(recipe.alerts.filter(alert => alert.Check === 'DocShape.RecipeShape').length, 1);
  assert.match(recipe.alerts[0].Message, /setup.*actions.*success check/);
  for (const kind of ['how-to', 'reference', 'explanation', 'custom']) {
    const result = await lint(typedPage(kind, fakeSections));
    assert.deepEqual(result.alerts, []);
  }
});

test('ingredient shape accepts explicit sections and compact block or flow workflow metadata', { skip: !available }, async () => {
  for (const [body, fields] of [
    [ingredientBody, ''],
    ['Run the build and inspect its output.\n', 'workflow:\n  inputs: { source: A source file }\n  outputs: { artifact: The built file }\n  check: The artifact exists.\n'],
    ['Run the build and inspect its output.\n', 'workflow: { inputs: {}, outputs: {}, check: The artifact exists. }\n'],
  ]) {
    const result = await lint(typedPage('ingredient', body, fields));
    assert.equal(result.status, 0);
    assert.deepEqual(result.alerts, []);
  }
});

test('ingredient shape rejects incomplete sections and metadata without a check or body', { skip: !available }, async () => {
  for (const [body, fields] of [
    ['Do one action.\n', ''],
    [ingredientBody.replace('A source file.', ''), ''],
    ['Run the action.\n', 'workflow: { inputs: {} }\n'],
    ['Run the action.\n', 'workflow: { check: "" }\n'],
    ['Run the action.\n', 'workflow: { check: null }\n'],
    ['Run the action.\n', 'workflow:\n  check: # still missing\n'],
    ['Run the action.\n', 'workflow:\n  inputs: {}\nother:\n  check: This is outside workflow.\n'],
    ['', 'workflow: { check: The output exists. }\n'],
  ]) {
    const result = await lint(typedPage('ingredient', body, fields));
    assert.equal(result.status, 1);
    assert.ok(result.alerts.some(alert => alert.Check === 'DocShape.IngredientShape' && alert.Line > 0));
  }
});

test('workflow shape rules support project overrides for alternate templates', { skip: !available }, async () => {
  const recipe = await lint(typedPage('recipe', 'Use a project-specific outline.\n'), 'DocShape.RecipeShape = NO');
  const ingredient = await lint(typedPage('ingredient', 'Use a project-specific outline.\n'), 'DocShape.IngredientShape = warning');
  assert.deepEqual(recipe.alerts, []);
  assert.equal(ingredient.status, 0);
  assert.equal(ingredient.alerts[0].Check, 'DocShape.IngredientShape');
  assert.equal(ingredient.alerts[0].Severity, 'warning');
});

test('prose style allows technical harness nouns while flagging inflated verb uses', { skip: !available }, async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-harness-style-'));
  try {
    const file = path.join(directory, 'words.md');
    await writeFile(file, 'The test harness checks the output.\n\nAgent harnesses run these checks.\n\nHarness the power of automation.\n\nWe are harnessing the system.\n');
    const result = spawnSync('vale', ['--config', path.join(root, '.vale.ini'), '--output=JSON', file], { encoding: 'utf8', cwd: root });
    const report = JSON.parse(result.stdout);
    assert.equal(report.Code, undefined, report.Text);
    const banned = Object.values(report).flat().filter(alert => alert.Check === 'Voices.Banned');
    assert.deepEqual(banned.map(alert => alert.Line), [5, 7]);
  } finally { await rm(directory, { recursive: true, force: true }); }
});


test('project sentence-length guidance remains visible as a warning', { skip: !available }, async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-length-style-'));
  try {
    const file = path.join(directory, 'words.md');
    await writeFile(file, 'The author reads the current page and checks each claim against the supplied sources before reviewing the proposed changes and deciding which details to keep in the final draft.\n');
    const result = spawnSync('vale', ['--config', path.join(root, '.vale.ini'), '--output=JSON', file], { encoding: 'utf8', cwd: root });
    const alerts = Object.values(JSON.parse(result.stdout)).flat().filter(alert => alert.Check === 'Direct.Length');
    assert.ok(alerts.length > 0);
    assert.ok(alerts.every(alert => alert.Severity === 'warning'));
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('tables after headings require an introductory sentence, while fenced examples are ignored', { skip: !available }, async () => {
  for (const table of ['| Name | Meaning |\n| --- | --- |\n| x | A value. |', 'Name | Meaning\n--- | ---\nx | A value.']) {
    const invalid = await lint(page(`A short introduction.\n\n### Fields\n\n${table}\n`));
    assert.equal(invalid.status, 1);
    assert.equal(invalid.alerts[0].Check, 'DocShape.TableIntroduction');
    assert.match(invalid.alerts[0].Message, /sentence.*heading.*table/);
    const valid = await lint(page(`A short introduction.\n\n### Fields\n\nThese fields control the output.\n\n${table}\n`));
    assert.deepEqual(valid.alerts, []);
  }
  const example = await lint(page('A short introduction.\n\n~~~~md\n## Fields\n\n| Name | Meaning |\n| --- | --- |\n~~~~\n'));
  assert.deepEqual(example.alerts, []);
});
