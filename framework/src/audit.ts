import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { compile } from './compiler.js';
import { explainSegments, loadConfig } from './config.js';
import { auditReference } from './reference-audit.js';
import { auditFocusedContracts } from './focused-audit.js';
import { auditLinks } from './link-audit.js';
import { checkEvalReport, evalBuildSnapshot, evalTasksDigest, loadEvalTasks, parseEvalSettings, type EvalSettings } from './docs-eval.js';

type TestSpec = { id: string; run: string[]; inputs?: string[] };
type Finding = { target: string; message: string };
type AuditResult = { id: string; status: 'ok' | 'error'; findings: Finding[]; details?: unknown };

export function parseAuditSettings(value: unknown): { tests: TestSpec[]; api: boolean; focusedContracts: boolean; links: boolean; evals?: EvalSettings } {
  if (value === undefined) return { tests: [], api: true, focusedContracts: true, links: true };
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('audit must be a mapping');
  const config = value as Record<string, unknown>;
  const extra = Object.keys(config).filter(key => !['tests', 'api', 'focusedContracts', 'links', 'evals'].includes(key));
  if (extra.length) throw new Error(`audit does not accept ${extra.join(', ')}`);
  const tests = config.tests ?? [];
  if (!Array.isArray(tests)) throw new Error('audit.tests must be a list');
  const seen = new Set<string>();
  const parsed = tests.map((item, index): TestSpec => {
    const where = `audit.tests[${index}]`;
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error(`${where} must be a mapping`);
    const test = item as Record<string, unknown>;
    if (Object.keys(test).some(key => !['id', 'run', 'inputs'].includes(key))) throw new Error(`${where} accepts only id, run, and inputs`);
    if (typeof test.id !== 'string' || !/^[a-z][a-z0-9-]*$/.test(test.id)) throw new Error(`${where}.id must use lowercase letters, digits, and hyphens`);
    if (seen.has(test.id)) throw new Error(`Duplicate audit test ${test.id}`);
    seen.add(test.id);
    if (!Array.isArray(test.run) || !test.run.length || !test.run.every(arg => typeof arg === 'string' && arg.length)) throw new Error(`${where}.run must be a nonempty list of strings`);
    if (test.inputs !== undefined && (!Array.isArray(test.inputs) || test.inputs.some(input => typeof input !== 'string' || !input.trim()) || new Set(test.inputs).size !== test.inputs.length)) throw new Error(`${where}.inputs must be a list of distinct nonempty paths`);
    return { id: test.id, run: test.run, ...(test.inputs !== undefined ? { inputs: test.inputs as string[] } : {}) };
  });
  for (const key of ['api', 'focusedContracts', 'links'] as const) if (config[key] !== undefined && typeof config[key] !== 'boolean') throw new Error(`audit.${key} must be true or false`);
  return { tests: parsed, api: config.api !== false, focusedContracts: config.focusedContracts !== false, links: config.links !== false, evals: parseEvalSettings(config.evals) };
}

export async function runAuditTest(spec: TestSpec, cwd: string, env: Record<string, string> = {}): Promise<AuditResult> {
  return new Promise(resolve => {
    const child = spawn(spec.run[0], spec.run.slice(1), { cwd, env: { ...process.env, ...env }, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
    // A spawn failure must clear the deadline too. Node's spawn timeout can
    // otherwise retain a timer after ENOENT and keep the CLI alive for two minutes.
    const deadline = setTimeout(() => child.kill(), 120000);
    let output = '';
    const append = (chunk: Buffer) => { output = (output + chunk.toString()).slice(-16000); };
    child.stdout.on('data', append);
    child.stderr.on('data', append);
    child.on('error', error => { clearTimeout(deadline); resolve({ id: `test:${spec.id}`, status: 'error', findings: [{ target: spec.id, message: error.message }] }); });
    child.on('close', (code, signal) => {
      clearTimeout(deadline);
      if (code === 0) resolve({ id: `test:${spec.id}`, status: 'ok', findings: [] });
      else resolve({ id: `test:${spec.id}`, status: 'error', findings: [{ target: spec.id, message: `Exited ${code === null ? `on signal ${signal}` : `with code ${code}`}${output.trim() ? `: ${output.trim()}` : ''}` }] });
    });
  });
}

export async function auditProject(configFile: string) {
  const absoluteConfig = path.resolve(configFile);
  const loaded = await loadConfig(absoluteConfig);
  const config = parseAuditSettings(loaded.value.audit);
  const results: AuditResult[] = [];
  const cwd = path.dirname(absoluteConfig);
  for (const spec of config.tests) results.push(await runAuditTest(spec, cwd));
  if (config.api) {
    const apis = loaded.value.apis;
    if (apis && typeof apis === 'object' && !Array.isArray(apis)) {
      for (const [apiId, definition] of Object.entries(apis)) {
        if (!definition || typeof definition !== 'object' || Array.isArray(definition)) continue;
        const publications = (definition as any).publications;
        const sources = [['source'], ...(Array.isArray(publications) ? publications : []).map((_: unknown, index: number) => ['publications', String(index), 'source'])];
        for (const segments of sources) {
          let source: any = definition;
          for (const segment of segments) source = source?.[segment];
          if (source?.kind !== 'file' || typeof source.path !== 'string') continue;
          const key = ['apis', apiId, ...segments, 'path'];
          const origin = explainSegments(loaded, key).source.file;
          const file = path.resolve(path.dirname(origin), source.path);
          const id = `api:${apiId}${segments[0] === 'publications' ? `:publication-${segments[1]}` : ':default'}`;
          try {
            const report = await auditReference(file);
            results.push({ id, status: report.status as 'ok' | 'error', findings: report.failures.map(failure => ({ target: failure.operationId, message: failure.message })), details: { source: file, operations: report.operations, rendered: report.rendered, namedExamples: report.namedExamples } });
          } catch (error) {
            results.push({ id, status: 'error', findings: [{ target: file, message: (error as Error).message }] });
          }
        }
      }
    }
  }
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-audit-'));
  try {
    let manifest: Awaited<ReturnType<typeof compile>>;
    try {
      manifest = await compile(absoluteConfig, path.join(temporary, 'site'));
      results.push({ id: 'build', status: 'ok', findings: [], details: { documents: manifest.documents.length } });
    } catch (error) {
      results.push({ id: 'build', status: 'error', findings: [{ target: absoluteConfig, message: (error as Error).message }] });
      return { status: 'error' as const, results };
    }
    if (config.focusedContracts) {
      try {
        const report = await auditFocusedContracts(path.join(temporary, 'site'));
        results.push({ id: 'focused-contracts', status: report.status as 'ok' | 'error', findings: report.failures.map(failure => ({ target: failure.documentId, message: failure.message })), details: { contracts: report.contracts } });
      } catch (error) {
        results.push({ id: 'focused-contracts', status: 'error', findings: [{ target: 'focused-contracts', message: (error as Error).message }] });
      }
    }
    if (config.links) {
      try {
        const report = await auditLinks(path.join(temporary, 'site'), typeof (loaded.value.site as any)?.origin === 'string' ? (loaded.value.site as any).origin : undefined);
        results.push({ id: 'links', status: report.status, findings: report.findings, details: { documents: report.pages, links: report.checked } });
      } catch (error) {
        results.push({ id: 'links', status: 'error', findings: [{ target: 'links', message: (error as Error).message }] });
      }
    }
    if (config.evals) {
      const tasksFile = path.resolve(path.dirname(explainSegments(loaded, ['audit', 'evals', 'tasks']).source.file), config.evals.tasks);
      const reportFile = path.resolve(path.dirname(explainSegments(loaded, ['audit', 'evals', 'report']).source.file), config.evals.report);
      const site = path.join(temporary, 'site');
      try {
        let originalDigest: string | undefined;
        let originalTasksDigest: string | undefined;
        if (config.evals.run) {
          const tasks = await loadEvalTasks(tasksFile);
          const snapshot = await evalBuildSnapshot(site);
          originalDigest = snapshot.buildDigest;
          originalTasksDigest = evalTasksDigest(tasks);
          const hook = await runAuditTest({ id: 'eval-run', run: config.evals.run }, cwd, {
            SHOALRUN_EVAL_SITE: site, SHOALRUN_EVAL_TASKS: tasksFile, SHOALRUN_EVAL_REPORT: reportFile,
            SHOALRUN_EVAL_BUILD_DIGEST: snapshot.buildDigest, SHOALRUN_EVAL_TASKS_DIGEST: originalTasksDigest,
          });
          results.push({ ...hook, id: 'eval-run' });
        }
        const report = await checkEvalReport(site, tasksFile, reportFile);
        if (originalDigest && report.details.buildDigest !== originalDigest) {
          report.status = 'error';
          report.findings.push({ target: 'buildDigest', message: 'The evaluator modified the temporary documentation output; evaluate the unmodified audit build.' });
        }
        if (originalTasksDigest && evalTasksDigest(await loadEvalTasks(tasksFile)) !== originalTasksDigest) {
          report.status = 'error';
          report.findings.push({ target: 'tasksDigest', message: 'The evaluator modified the task definitions; evaluate the original audit tasks.' });
        }
        results.push({ id: 'evals', ...report });
      } catch (error) {
        results.push({ id: 'evals', status: 'error', findings: [{ target: tasksFile, message: (error as Error).message }] });
      }
    }
    return { status: results.some(result => result.status === 'error') ? 'error' as const : 'ok' as const, results };
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}
