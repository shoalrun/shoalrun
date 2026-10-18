import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { parseYaml } from './yaml-value.js';

type Criterion = { id: string; description: string };
export type EvalTask = { id: string; prompt: string; allowedTools: string[]; required: boolean; criteria: Criterion[] };
export type EvalTasks = { schemaVersion: 1; tasks: EvalTask[] };
type Publication = { channel: string; version: string; language: string };
type Citation = { id: string; publication: Publication };
type Judgment = { id: string; status: 'pass' | 'fail'; reason: string };
type TaskResult = { taskId: string; status: 'pass' | 'fail' | 'skipped'; answer: string; citations: Citation[]; criteria: Judgment[]; notes?: string };
export type EvalReport = {
  schemaVersion: 1; tasksDigest: string; buildDigest: string; buildFiles?: EvalBuildFile[]; recordedAt: string;
  runner: { name: string; model?: string; tools: string[]; notes?: string };
  review: { reviewer: string; method: 'human' | 'external'; reviewedAt: string; notes: string } | null;
  results: TaskResult[];
};
export type EvalSettings = { tasks: string; report: string; run?: string[] };
type Finding = { target: string; message: string };
export type EvalBuildFile = [string, string];
export type EvalBuildInventory = { schemaVersion: 1; buildDigest: string; files: EvalBuildFile[] };
const object = (value: unknown): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value);
function mapping(value: unknown, where: string, keys: string[]) {
  if (!object(value) || Object.keys(value).some(key => !keys.includes(key))) throw new Error(`${where} must be a mapping accepting only ${keys.join(', ')}`);
  return value;
}
function text(value: unknown, where: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${where} must be nonempty text`);
  return value;
}
function id(value: unknown, where: string) {
  const result = text(value, where);
  if (!/^[a-z][a-z0-9-]*$/.test(result)) throw new Error(`${where} must use lowercase letters, digits, and hyphens`);
  return result;
}
function unique<T>(values: T[], key: (value: T) => string, where: string) {
  if (new Set(values.map(key)).size !== values.length) throw new Error(`${where} contains duplicate IDs or values`);
  return values;
}
function strings(value: unknown, where: string, nonempty = false) {
  if (!Array.isArray(value) || nonempty && !value.length) throw new Error(`${where} must be ${nonempty ? 'a nonempty' : 'a'} list`);
  return unique(value.map((item, i) => text(item, `${where}[${i}]`)), item => item, where);
}
function timestamp(value: unknown, where: string) {
  const result = text(value, where);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(result) || !Number.isFinite(Date.parse(result)) || new Date(result).toISOString().replace('.000Z', 'Z') !== result.replace('.000Z', 'Z')) throw new Error(`${where} must be a valid UTC ISO timestamp`);
  return result;
}
function digest(value: unknown, where: string) {
  const result = text(value, where);
  if (!/^[a-f0-9]{64}$/.test(result)) throw new Error(`${where} must be a SHA-256 digest`);
  return result;
}
const sha = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const canonical = (value: any): string => JSON.stringify(Array.isArray(value) ? value.map(item => JSON.parse(canonical(item))) : object(value) ? Object.fromEntries(Object.keys(value).sort().map(key => [key, JSON.parse(canonical(value[key]))])) : value);
export const evalTasksDigest = (tasks: EvalTasks) => sha(canonical(tasks));

export function parseEvalSettings(value: unknown): EvalSettings | undefined {
  if (value === undefined) return undefined;
  const config = mapping(value, 'audit.evals', ['tasks', 'report', 'run']);
  return { tasks: text(config.tasks, 'audit.evals.tasks'), report: text(config.report, 'audit.evals.report'), ...(config.run !== undefined ? { run: (() => { if (!Array.isArray(config.run) || !config.run.length) throw new Error('audit.evals.run must be a nonempty command list'); return config.run.map((item: unknown, i: number) => text(item, `audit.evals.run[${i}]`)); })() } : {}) };
}

export function parseEvalTasks(value: unknown): EvalTasks {
  const file = mapping(value, 'Eval task file', ['schemaVersion', 'tasks']);
  if (file.schemaVersion !== 1 || !Array.isArray(file.tasks) || !file.tasks.length) throw new Error('Eval task file requires schemaVersion: 1 and a nonempty tasks list');
  const tasks = file.tasks.map((value: unknown, i: number): EvalTask => {
    const where = `tasks[${i}]`;
    const task = mapping(value, where, ['id', 'prompt', 'allowedTools', 'required', 'criteria']);
    if (task.required !== undefined && typeof task.required !== 'boolean') throw new Error(`${where}.required must be true or false`);
    if (!Array.isArray(task.criteria) || !task.criteria.length) throw new Error(`${where}.criteria must be a nonempty list`);
    const criteria = unique(task.criteria.map((value: unknown, j: number) => {
      const criterion = mapping(value, `${where}.criteria[${j}]`, ['id', 'description']);
      return { id: id(criterion.id, `${where}.criteria[${j}].id`), description: text(criterion.description, `${where}.criteria[${j}].description`) };
    }), (item: Criterion) => item.id, `${where}.criteria`);
    return { id: id(task.id, `${where}.id`), prompt: text(task.prompt, `${where}.prompt`), allowedTools: strings(task.allowedTools, `${where}.allowedTools`, true), required: task.required ?? true, criteria };
  });
  return { schemaVersion: 1, tasks: unique(tasks, (task: EvalTask) => task.id, 'tasks') };
}

export function parseEvalReport(value: unknown): EvalReport {
  const report = mapping(value, 'Eval report', ['schemaVersion', 'tasksDigest', 'buildDigest', 'buildFiles', 'recordedAt', 'runner', 'review', 'results']);
  if (report.schemaVersion !== 1 || !Array.isArray(report.results)) throw new Error('Eval report requires schemaVersion: 1 and a results list');
  const runner = mapping(report.runner, 'runner', ['name', 'model', 'tools', 'notes']);
  let review: EvalReport['review'] = null;
  if (report.review !== null) {
    const item = mapping(report.review, 'review', ['reviewer', 'method', 'reviewedAt', 'notes']);
    if (!['human', 'external'].includes(item.method)) throw new Error('review.method must be human or external');
    review = { reviewer: text(item.reviewer, 'review.reviewer'), method: item.method, reviewedAt: timestamp(item.reviewedAt, 'review.reviewedAt'), notes: text(item.notes, 'review.notes') };
  }
  const results = report.results.map((value: unknown, i: number): TaskResult => {
    const where = `results[${i}]`;
    const result = mapping(value, where, ['taskId', 'status', 'answer', 'citations', 'criteria', 'notes']);
    if (!['pass', 'fail', 'skipped'].includes(result.status) || typeof result.answer !== 'string' || !Array.isArray(result.citations) || !Array.isArray(result.criteria)) throw new Error(`${where} requires status pass/fail/skipped, a text answer, citations, and criteria`);
    const citations = result.citations.map((value: unknown, j: number): Citation => {
      const cite = mapping(value, `${where}.citations[${j}]`, ['id', 'publication']);
      const publication = mapping(cite.publication, `${where}.citations[${j}].publication`, ['channel', 'version', 'language']);
      return { id: text(cite.id, `${where}.citations[${j}].id`), publication: { channel: text(publication.channel, 'citation.channel'), version: text(publication.version, 'citation.version'), language: text(publication.language, 'citation.language') } };
    });
    const criteria = unique(result.criteria.map((value: unknown, j: number): Judgment => {
      const judgment = mapping(value, `${where}.criteria[${j}]`, ['id', 'status', 'reason']);
      if (!['pass', 'fail'].includes(judgment.status)) throw new Error(`${where}.criteria[${j}].status must be pass or fail`);
      return { id: id(judgment.id, `${where}.criteria[${j}].id`), status: judgment.status, reason: text(judgment.reason, `${where}.criteria[${j}].reason`) };
    }), item => item.id, `${where}.criteria`);
    return { taskId: id(result.taskId, `${where}.taskId`), status: result.status, answer: result.answer, citations, criteria, ...(result.notes !== undefined ? { notes: text(result.notes, `${where}.notes`) } : {}) };
  });
  return {
    schemaVersion: 1, tasksDigest: digest(report.tasksDigest, 'tasksDigest'), buildDigest: digest(report.buildDigest, 'buildDigest'), recordedAt: timestamp(report.recordedAt, 'recordedAt'),
    ...(report.buildFiles !== undefined ? { buildFiles: parseEvalBuildInventory({ schemaVersion: 1, buildDigest: report.buildDigest, files: report.buildFiles }).files } : {}),
    runner: { name: text(runner.name, 'runner.name'), tools: strings(runner.tools, 'runner.tools'), ...(runner.model !== undefined ? { model: text(runner.model, 'runner.model') } : {}), ...(runner.notes !== undefined ? { notes: text(runner.notes, 'runner.notes') } : {}) }, review,
    results: unique(results, result => result.taskId, 'results'),
  };
}

export async function loadEvalTasks(file: string) { return parseEvalTasks(parseYaml(await readFile(file, 'utf8'), file)); }

/** A diagnostic inventory never relaxes exact-byte freshness. */
export function parseEvalBuildInventory(value: unknown): EvalBuildInventory {
  const inventory = mapping(value, 'Eval build inventory', ['schemaVersion', 'buildDigest', 'files']);
  if (inventory.schemaVersion !== 1 || !Array.isArray(inventory.files)) throw new Error('Eval build inventory requires schemaVersion: 1 and files');
  const files = inventory.files.map((entry: unknown): EvalBuildFile => {
    if (!Array.isArray(entry) || entry.length !== 2 || typeof entry[0] !== 'string' || !entry[0] || entry[0].startsWith('/') || /[\\\x00-\x1f]/.test(entry[0]) || entry[0].split('/').some(part => !part || part === '.' || part === '..')) throw new Error('Invalid eval build file path');
    return [entry[0], digest(entry[1], 'file digest')];
  });
  unique(files, file => file[0], 'Eval build files');
  files.sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
  const buildDigest = digest(inventory.buildDigest, 'buildDigest');
  if (sha(JSON.stringify(files)) !== buildDigest) throw new Error('Eval build files do not match buildDigest');
  return { schemaVersion: 1, buildDigest, files };
}

export function compareEvalBuildInventories(previous: unknown, current: unknown) {
  const before = parseEvalBuildInventory(previous), after = parseEvalBuildInventory(current);
  const oldFiles = new Map(before.files), newFiles = new Map(after.files);
  return {
    status: before.buildDigest === after.buildDigest ? 'ok' as const : 'changed' as const,
    fromBuildDigest: before.buildDigest, buildDigest: after.buildDigest,
    added: after.files.filter(([name]) => !oldFiles.has(name)).map(([name]) => name),
    changed: after.files.filter(([name, digest]) => oldFiles.has(name) && oldFiles.get(name) !== digest).map(([name]) => name),
    removed: before.files.filter(([name]) => !newFiles.has(name)).map(([name]) => name),
  };
}

/** Published output identity, excluding deployment provenance and private retrieval artifacts. */
export async function evalBuildSnapshot(directory: string) {
  const root = await realpath(directory);
  const manifest = JSON.parse(await readFile(path.join(root, 'documents.json'), 'utf8'));
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.documents) || manifest.documents.some((doc: any) => !doc || typeof doc.id !== 'string' || !object(doc.variant) || ['channel', 'version', 'language'].some(key => typeof doc.variant[key] !== 'string'))) throw new Error('Invalid built documents.json');
  const publicationRoot = typeof manifest.basePath === 'string' ? manifest.basePath.replace(/^\/|\/$/g, '') : '';
  const excluded = new Set(['build-info.json', 'ai', '.shoalrun', ...['build-info.json', 'ai', '.shoalrun'].map(name => path.posix.join(publicationRoot, name))]);
  const files: Array<[string, string]> = [];
  async function walk(relative: string) {
    for (const entry of await readdir(path.join(root, relative), { withFileTypes: true })) {
      const name = path.posix.join(relative, entry.name);
      if (excluded.has(name)) continue;
      if (entry.isSymbolicLink()) throw new Error(`Eval snapshot does not accept symlinks: ${name}`);
      if (entry.isDirectory()) await walk(name);
      else if (entry.isFile()) files.push([name, sha(await readFile(path.join(root, name)))]);
    }
  }
  await walk('');
  files.sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
  return { buildDigest: sha(JSON.stringify(files)), documents: manifest.documents as Array<{ id: string; variant: Publication }>, files: files.length, fileDigests: files };
}

export async function prepareEvalReport(directory: string, tasksFile: string, output: string) {
  const tasks = await loadEvalTasks(tasksFile);
  const snapshot = await evalBuildSnapshot(directory);
  const report: EvalReport = {
    schemaVersion: 1, tasksDigest: evalTasksDigest(tasks), buildDigest: snapshot.buildDigest, buildFiles: snapshot.fileDigests, recordedAt: new Date().toISOString(),
    runner: { name: 'not-run', tools: [], notes: 'Template only. Record the actual runner, tools, answers, citations, criterion judgments, and review after executing the tasks.' }, review: null,
    results: tasks.tasks.map(task => ({ taskId: task.id, status: 'skipped', answer: '', citations: [], criteria: [] })),
  };
  await writeFile(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  return { status: 'ok' as const, tasks: tasks.tasks.length, output: path.resolve(output), tasksDigest: report.tasksDigest, buildDigest: report.buildDigest };
}

export async function checkEvalReport(directory: string, tasksFile: string, reportFile: string, now = Date.now()) {
  const tasks = await loadEvalTasks(tasksFile);
  const snapshot = await evalBuildSnapshot(directory);
  const findings: Finding[] = [];
  let report: EvalReport;
  try { report = parseEvalReport(JSON.parse(await readFile(reportFile, 'utf8'))); }
  catch (error) {
    return { status: 'error' as const, findings: [{ target: reportFile, message: (error as NodeJS.ErrnoException).code === 'ENOENT' ? 'Eval report is missing. Prepare a report and run the tasks before auditing.' : `Invalid eval report: ${(error as Error).message}` }], details: { tasks: tasks.tasks.length, required: tasks.tasks.filter(task => task.required).length, buildDigest: snapshot.buildDigest } };
  }
  const fail = (target: string, message: string) => { findings.push({ target, message }); };
  if (report.tasksDigest !== evalTasksDigest(tasks)) fail('tasksDigest', 'Task definitions changed; rerun the evaluation against the current tasks.');
  const buildChanges = report.buildFiles ? compareEvalBuildInventories(
    { schemaVersion: 1, buildDigest: report.buildDigest, files: report.buildFiles },
    { schemaVersion: 1, buildDigest: snapshot.buildDigest, files: snapshot.fileDigests },
  ) : undefined;
  if (report.buildDigest !== snapshot.buildDigest) fail('buildDigest', 'Documentation build changed; rerun the evaluation against the current output.' + (buildChanges ? ` Added ${buildChanges.added.length}, changed ${buildChanges.changed.length}, removed ${buildChanges.removed.length} files; see details.buildChanges.` : ' This older report has no file inventory to diagnose the difference.'));
  if (Date.parse(report.recordedAt) > now) fail('recordedAt', 'Report timestamp is in the future.');
  if (report.results.some(result => result.status !== 'skipped') && (!report.review || report.runner.name === 'not-run' || !report.runner.tools.length)) fail('review', 'Executed tasks require runner details, tools, and a named human or external review.');
  if (report.review && (Date.parse(report.review.reviewedAt) > now || Date.parse(report.review.reviewedAt) < Date.parse(report.recordedAt))) fail('review.reviewedAt', 'Review must be at or after the recorded run and not in the future.');
  const citationKey = (cite: Citation) => canonical([cite.id, cite.publication]);
  const published = new Set(snapshot.documents.map(doc => citationKey({ id: doc.id, publication: doc.variant })));
  const outcomes: Array<{ id: string; required: boolean; status: string }> = [];
  for (const result of report.results) {
    const task = tasks.tasks.find(task => task.id === result.taskId);
    if (!task) { fail(result.taskId, 'Result names a task absent from the task file.'); continue; }
    for (const criterion of result.criteria) if (!task.criteria.some(item => item.id === criterion.id)) fail(task.id, `Unknown criterion ${criterion.id}.`);
    for (const cite of result.citations) if (!published.has(citationKey(cite))) fail(task.id, `Citation ${cite.id} does not identify a published page in that publication.`);
    if (result.status !== 'skipped' && report.runner.tools.some(tool => !task.allowedTools.includes(tool))) fail(task.id, 'Recorded runner tools exceed this task\'s allowedTools. Use separate reports for runs with different tool sets.');
    if (result.status === 'pass') {
      if (!result.answer.trim() || !result.citations.length) fail(task.id, 'Passing tasks require an answer and at least one published-page citation.');
      for (const criterion of task.criteria) if (result.criteria.find(item => item.id === criterion.id)?.status !== 'pass') fail(task.id, `Passing result lacks a passing judgment for ${criterion.id}.`);
    }
  }
  for (const task of tasks.tasks) {
    const result = report.results.find(result => result.taskId === task.id);
    outcomes.push({ id: task.id, required: task.required, status: result?.status ?? 'missing' });
    if (task.required && result?.status !== 'pass') fail(task.id, `Required task ${result?.status ?? 'is missing'}.`);
  }
  return { status: findings.length ? 'error' as const : 'ok' as const, findings, details: { tasks: tasks.tasks.length, required: tasks.tasks.filter(task => task.required).length, buildDigest: snapshot.buildDigest, tasksDigest: evalTasksDigest(tasks), recordedAt: report.recordedAt, review: report.review, ...(buildChanges ? { buildChanges } : {}), outcomes } };
}
