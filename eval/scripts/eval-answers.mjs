// Runs the answer questions through `ask` for one or more models and grades what comes back. Usage:
//   node scripts/eval-answers.mjs <site-directory> --config FILE --models MODEL[,MODEL...] [--questions FILE] [--out FILE]
//        [--threshold 0.5] [--jev-cache DIR] [--reader-view FACET=CHOICE] [--only ID[,ID...]] [--max-tokens N]
// It records, for every answer, the decision, the pages cited, the sentences the cited docs do not support (with every sentence's
// support score, so a threshold can be chosen from data), code that is not in the docs, tokens, time, and an estimated cost from
// OpenRouter's published prices. The full transcripts go to --out as Markdown so a person can read them.
import { readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { askQuestion } from '../../framework/dist/ask.js';
import { parseReaderView, prepareAsk } from '../../framework/dist/ask-setup.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = name => args.includes(name) ? args[args.indexOf(name) + 1] : undefined;
const valueFlags = ['--config', '--models', '--questions', '--out', '--threshold', '--jev-cache', '--reader-view', '--only', '--max-tokens', '--repeat', '--json-out'];
const directory = args.find((arg, at) => !arg.startsWith('--') && !valueFlags.includes(args[at - 1]));
const models = (flag('--models') ?? '').split(',').map(item => item.trim()).filter(Boolean);
if (!directory || !flag('--config') || !models.length) { process.stderr.write('Usage: node scripts/eval-answers.mjs <site-directory> --config FILE --models MODEL[,MODEL...] [--questions FILE] [--out FILE] [--threshold 0.5] [--jev-cache DIR] [--reader-view FACET=CHOICE] [--only ID,...] [--max-tokens N] [--repeat N] [--no-direct] [--no-escalate] [--no-cards]\n'); process.exit(2); }
const threshold = Number(flag('--threshold') ?? 0.5);
const repeat = Math.max(1, Number(flag('--repeat') ?? 1));
const noDirect = args.includes('--no-direct');
const noEscalate = args.includes('--no-escalate');
const noCards = args.includes('--no-cards');
const only = flag('--only')?.split(',');
const { questions: all } = JSON.parse(await readFile(flag('--questions') ?? path.join(here, '..', 'fixtures', 'answer-questions.json'), 'utf8'));
const questions = only ? all.filter(item => only.includes(item.id)) : all;
const jevCacheDir = flag('--jev-cache') ?? path.join(os.tmpdir(), 'shoalrun-jev-cache');
const views = flag('--reader-view') ? [flag('--reader-view')] : [];

// OpenRouter lists each model's price per token. A model it doesn't list simply gets no cost estimate.
const prices = new Map();
try {
  const listing = await (await fetch('https://openrouter.ai/api/v1/models')).json();
  for (const item of listing.data ?? []) prices.set(item.id, { input: Number(item.pricing?.prompt ?? 0), output: Number(item.pricing?.completion ?? 0) });
} catch { /* prices are optional */ }

const declines = /(does not|doesn't|do not|don't|not)( (explicitly|specifically|directly|currently|really|actually))? (name|cover|mention|say|include|describe|document|address|provide|support|offer|have)|no (information|mention|documentation)|not (covered|documented|mentioned|available)/i;

// A problem is hard when the answer is wrong for a reader: it declined a question the docs answer, cited the wrong pages, left out a
// required fact, or said something the question forbids. A flag is soft: a loosely worded sentence, code that is not in the docs, or a
// citation that had to be removed. `pass` means no hard problem, and `clean` means no problem and no flag.
function grade(item, result) {
  const text = result.answer;
  const cited = new Set(result.sources.map(source => source.id.split('#')[0]));
  const flags = [];
  if (result.invalidCitations.length) flags.push(`invented citations ${result.invalidCitations.join(', ')}`);
  if (result.unsupportedCode.length) flags.push('code not in the docs');
  if (result.unsupportedClaims.length) flags.push(`${result.unsupportedClaims.length} unsupported sentence(s)`);
  if (item.kind === 'none') {
    const declined = result.decision === 'declined';
    const honest = declined || declines.test(text.replace(/[\u2018\u2019]/g, "'"));
    const problems = honest ? [] : ['answered a question the docs do not cover'];
    for (const pattern of item.mustNotMatch ?? []) if (new RegExp(pattern, 'i').test(text)) problems.push(`matches forbidden /${pattern}/`);
    return { pass: problems.length === 0, clean: problems.length === 0 && flags.length === 0, declined, honest: honest && problems.length === 0, problems, flags };
  }
  const problems = [];
  if (result.decision === 'declined') problems.push('declined a question the docs answer');
  else {
    if (item.expectPages && !item.expectPages.some(page => cited.has(page))) problems.push(`cites ${[...cited].join(', ') || 'nothing'}, not ${item.expectPages.join(' or ')}`);
    for (const group of item.expectGroups ?? []) if (!group.some(page => cited.has(page))) problems.push(`missing source from ${group.join(' or ')}`);
    for (const term of item.mustInclude ?? []) if (!text.toLowerCase().includes(term.toLowerCase())) problems.push(`missing "${term}"`);
    for (const pattern of item.mustMatch ?? []) if (!new RegExp(pattern, 'i').test(text)) problems.push(`does not match /${pattern}/`);
    for (const pattern of item.mustNotMatch ?? []) if (new RegExp(pattern, 'i').test(text)) problems.push(`matches forbidden /${pattern}/`);
  }
  return { pass: problems.length === 0, clean: problems.length === 0 && flags.length === 0, declined: result.decision === 'declined', problems, flags };
}

async function run(model) {
  const setup = await prepareAsk({ siteDirectory: directory, configFile: flag('--config'), model, jevCacheDir, maxTokens: Number(flag('--max-tokens') ?? 2048), readerView: parseReaderView(views), noDirect, noEscalate, noCards });
  for (const note of setup.notes) process.stderr.write(`[${model}] ${note}\n`);
  const rows = [];
  for (const item of questions) {
    const started = performance.now();
    try {
      const result = await askQuestion({ question: item.question, ...(item.history ? { history: item.history } : {}), ...setup.options, verify: { jev: { ...(setup.options.jev ?? {}), maxCalls: 3 }, threshold, onUnsupported: 'flag' } });
      rows.push({ item, result, grade: grade(item, result), ms: performance.now() - started });
    } catch (error) { rows.push({ item, error: error.message, grade: { pass: false, clean: false, problems: [`error: ${error.message}`], flags: [] }, ms: performance.now() - started }); }
  }
  return { model, rows };
}

// Each model runs `repeat` times, all in parallel. One run of a model varies, so the summary counts passes across every run and lists
// the questions that pass sometimes and fail other times.
const executed = await Promise.all(models.flatMap(model => Array.from({ length: repeat }, () => run(model))));
const runs = models.map(model => { const own = executed.filter(item => item.model === model); return { model, rows: own.flatMap(item => item.rows), repeats: own.map(item => item.rows) }; });

const money = (model, usage) => { const price = prices.get(model); return price ? usage.promptTokens * price.input + usage.completionTokens * price.output : undefined; };
process.stdout.write(`\n${questions.length} questions, ${repeat} run${repeat === 1 ? '' : 's'} per model, ${models.length} model${models.length === 1 ? '' : 's'}, claim-check threshold ${threshold}\n`);
for (const { model, rows, repeats } of runs) {
  const answerable = rows.filter(row => row.item.kind !== 'none');
  const none = rows.filter(row => row.item.kind === 'none');
  const ok = rows.filter(row => row.result);
  const tokens = ok.reduce((sum, row) => ({ input: sum.input + row.result.usage.promptTokens, output: sum.output + row.result.usage.completionTokens }), { input: 0, output: 0 });
  const cost = ok.reduce((sum, row) => sum + (money(model, row.result.usage) ?? 0), 0);
  const answerMs = ok.filter(row => row.result.usage.chatCalls).map(row => row.result.timings.answerMs);
  const flagged = ok.reduce((sum, row) => sum + row.result.unsupportedClaims.length, 0);
  const code = ok.reduce((sum, row) => sum + row.result.unsupportedCode.length, 0);
  process.stdout.write(`\n${model}\n  answerable  ${answerable.filter(row => row.grade.pass).length}/${answerable.length} correct, ${answerable.filter(row => row.grade.clean).length} clean   no-answer  ${none.filter(row => row.grade.pass).length}/${none.length} honest (${none.filter(row => row.grade.declined).length} declined before the model)\n  unsupported sentences flagged ${flagged}   code not in docs ${code}   errors ${rows.filter(row => row.error).length}\n  tokens ${tokens.input} in / ${tokens.output} out   est. cost $${cost.toFixed(4)} (${prices.has(model) ? 'OpenRouter list price' : 'no price found'})   median answer time ${answerMs.length ? (answerMs.sort((a, b) => a - b)[Math.floor(answerMs.length / 2)] / 1000).toFixed(1) : '-'}s\n`);
  if (repeat > 1) {
    const perQuestion = questions.map(item => ({ id: item.id, passes: repeats.filter(run => run.find(row => row.item.id === item.id)?.grade.pass).length }));
    const flaky = perQuestion.filter(entry => entry.passes > 0 && entry.passes < repeat);
    const broken = perQuestion.filter(entry => entry.passes === 0);
    process.stdout.write(`  stable pass ${perQuestion.filter(entry => entry.passes === repeat).length}/${questions.length}   flaky ${flaky.length}   always fails ${broken.length}\n`);
    if (flaky.length) process.stdout.write(`    flaky: ${flaky.map(entry => `${entry.id} (${entry.passes}/${repeat})`).join(', ')}\n`);
    if (broken.length) process.stdout.write(`    always fails: ${broken.map(entry => entry.id).join(', ')}\n`);
  } else for (const row of rows.filter(row => !row.grade.pass)) process.stdout.write(`    x ${row.item.id}: ${[...row.grade.problems, ...row.grade.flags.map(flag => `(flag) ${flag}`)].join('; ')}\n`);
}

// Every checked sentence, so a threshold can be picked from the distribution and the low scores can be read.
const supports = runs.flatMap(({ model, rows }) => rows.flatMap(row => (row.result?.claims ?? []).map(claim => ({ model, id: row.item.id, ...claim }))));
if (supports.length) {
  const sorted = supports.map(claim => claim.support).sort((a, b) => a - b);
  const at = fraction => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))].toFixed(2);
  process.stdout.write(`\nclaim support over ${supports.length} checked sentences: min ${sorted[0].toFixed(2)}  p10 ${at(0.1)}  median ${at(0.5)}  max ${sorted[sorted.length - 1].toFixed(2)}\n`);
  const low = supports.filter(claim => claim.support < 0.8).sort((a, b) => a.support - b.support).slice(0, 12);
  if (low.length) process.stdout.write('lowest-scoring sentences (read these to choose a threshold):\n' + low.map(claim => `  ${claim.support.toFixed(2)}  [${claim.model.split('/').pop()} / ${claim.id}] ${claim.text}`).join('\n') + '\n');
}

if (flag('--json-out')) await writeFile(flag('--json-out'), JSON.stringify(runs.map(({ model, repeats }) => ({ model, runs: repeats.map(rows => rows.map(row => ({ id: row.item.id, kind: row.item.kind, pass: row.grade.pass, problems: row.grade.problems, flags: row.grade.flags, clean: row.grade.clean, decision: row.result?.decision, jevBest: row.result?.jevBest, usage: row.result?.usage, timings: row.result?.timings, claims: row.result?.claims, error: row.error }))) })), null, 1));

if (flag('--out')) {
  const lines = ['# Answer eval transcripts', '', `Claim-check threshold ${threshold}. Models: ${models.join(', ')}.`, ''];
  for (const item of questions) {
    lines.push(`## ${item.id}: ${item.question}`, '', `Kind: ${item.kind}${item.expectPages ? `. Expected pages: ${item.expectPages.join(', ')}` : ''}`, '');
    for (const { model, repeats } of runs) for (const [at, rows] of repeats.entries()) {
      const row = rows.find(entry => entry.item.id === item.id);
      if (at > 0 && row.grade.clean) continue;
      lines.push(`### ${model}${repeat > 1 ? ` (run ${at + 1})` : ''}  ${row.grade.pass ? (row.grade.clean ? 'PASS' : 'PASS with flags') : 'FAIL'}${row.grade.problems?.length ? ` (${row.grade.problems.join('; ')})` : ''}${row.grade.flags?.length ? ` [${row.grade.flags.join('; ')}]` : ''}`, '');
      if (row.error) { lines.push(`Error: ${row.error}`, ''); continue; }
      const r = row.result;
      lines.push(`decision ${r.decision} | ${r.mode} | Jev ${r.jevBest?.toFixed(2) ?? '-'} | ${r.usage.promptTokens} in / ${r.usage.completionTokens} out | answer ${(r.timings.answerMs / 1000).toFixed(1)}s`, '', r.answer, '');
      if (r.sources.length) lines.push('Sources: ' + r.sources.map(source => `[${source.number}] ${source.title} > ${source.heading}`).join('; '), '');
      if (r.claims.length) lines.push('Claim support: ' + r.claims.map(claim => `${claim.support.toFixed(2)} "${claim.text}"`).join(' | '), '');
      for (const note of r.notes) lines.push(`Note: ${note}`, '');
    }
  }
  await writeFile(flag('--out'), lines.join('\n'));
  process.stdout.write(`\ntranscripts: ${flag('--out')}\n`);
}
