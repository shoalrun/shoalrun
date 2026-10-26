// Dependency-free so installation itself can be measured. Never log command
// arguments or environment values: either may contain credentials.
import { spawnSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import path from 'node:path';

const [mode, label, command, ...args] = process.argv.slice(2);
const file = process.env.CI_TIMING_FILE ?? (process.env.RUNNER_TEMP ? path.join(process.env.RUNNER_TEMP, 'ci-phase-timings.jsonl') : undefined);
if (!file) throw new Error('CI_TIMING_FILE is required');
if (mode === 'run') {
  if (!label || !/^[a-z0-9-]+$/.test(label) || !command) throw new Error('Usage: ci-phase.mjs run <phase-name> <command> [args...]');
  const started = performance.now();
  appendFileSync(file, JSON.stringify({ phase: label, state: 'started' }) + '\n');
  const result = spawnSync(command, args, { stdio: 'inherit', env: process.env });
  const status = result.status ?? (result.signal === 'SIGINT' ? 130 : result.signal === 'SIGTERM' ? 143 : 1);
  appendFileSync(file, JSON.stringify({ phase: label, state: 'finished', seconds: (performance.now() - started) / 1000, status }) + '\n');
  if (result.error) console.error(`Could not start phase ${label}: ${result.error.code ?? 'unknown error'}`);
  process.exitCode = status;
} else if (mode === 'summary') {
  const phases = new Map();
  try {
    for (const line of readFileSync(file, 'utf8').trim().split('\n').filter(Boolean)) {
      const row = JSON.parse(line); phases.set(row.phase, row);
    }
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const safe = value => String(value === undefined || value === '' ? 'not reported' : value).replace(/[|\r\n<>]/g, ' ');
  const completed = [...phases.values()].filter(row => row.state === 'finished');
  const total = completed.reduce((sum, row) => sum + row.seconds, 0);
  const rows = [...phases.values()].map(row => `| ${safe(row.phase)} | ${row.state === 'finished' ? row.seconds.toFixed(2) : 'incomplete'} | ${row.state !== 'finished' ? 'interrupted or unfinished' : row.status === 0 ? 'passed' : `failed (${row.status})`} |`);
  const report = [
    '## CI phase timings', '',
    '| Phase | Seconds | Result |', '| --- | ---: | --- |', ...rows,
    ...(rows.length ? [] : ['| No phases recorded | — | Setup may have failed |']), '',
    `Measured command time: **${total.toFixed(2)} seconds**. This excludes checkout, untimed setup, cache transfer, and post-job work; use the job duration for total runner time.`, '',
    `Node: ${process.version}. Runner: ${safe(process.env.RUNNER_OS)} / ${safe(process.env.RUNNER_ARCH)}.`,
    `Exact cache hits — npm: ${safe(process.env.CI_NPM_CACHE_HIT)}, pip: ${safe(process.env.CI_PIP_CACHE_HIT)}, browser: ${safe(process.env.CI_BROWSER_CACHE_HIT)}.`,
    'A cache miss does not skip installation or validation. An interrupted command has no completed duration.', '',
  ].join('\n');
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
  else process.stdout.write(report);
} else throw new Error('Expected run or summary');
