import { authoringHints } from './authoring-hints.js';
import { chmod, mkdir, mkdtemp, readFile, readdir, realpath, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { compile } from './compiler.js';
import { loadConfig } from './config.js';
import { readDocument } from './content-source.js';
import { auditLinks } from './link-audit.js';
import { auditFocusedContracts } from './focused-audit.js';
import { auditReference } from './reference-audit.js';
import { iconLicenseFile } from './icons.js';
import { parseAuditSettings, runAuditTest } from './audit.js';
import { configFindingLocation, validationFinding, type ValidationFinding } from './authoring-findings.js';
import { authoringArtifactPath, captureSnapshotInputs, collectSnapshotInputs, confirmSnapshotInputs, excludedNames, isWithin, parseAuthoringBaseline, relativeInput, sha256, SnapshotError, validatorInputs, type SnapshotCapture, type SnapshotInput } from './authoring-snapshot.js';

export type ValidationOptions = { files?: string[]; ids?: string[]; baselineFile?: string; artifactsDirectory?: string; runConfiguredChecks?: boolean };
export type ValidationCheck = { id: string; status: 'passed' | 'failed' | 'skipped' | 'unavailable'; explanation?: string; documents?: number; findings?: number };
export type ValidationReport = {
  schemaVersion: 1; kind: 'shoalrun-authoring-validation'; status: 'ok' | 'failed' | 'incomplete' | 'unavailable' | 'stale'; snapshotId: string;
  project: string; config: string; baseline: { kind: 'explicit-declaration' | 'task-baseline'; file?: string; digest?: string };
  changed: Array<{ file: string; operation: 'created' | 'modified' | 'deleted' | 'declared'; beforeDigest: string | null; digest: string | null }>;
  inputs: SnapshotInput[]; excluded: SnapshotCapture['excluded']; externalDirectories: string[]; contentDigest: string; configDigest?: string; validatorDigest: string;
  runtimeDependencies: SnapshotInput[]; dependencies: string[]; checks: ValidationCheck[]; findings: ValidationFinding[];
  coverage: { scope: 'complete-captured-project'; authored: string[]; affected: string[]; rendered: Array<{ id: string; file: string; route: string; markdown: string }>; notRendered: string[] };
  artifacts: { directory: string; project: string; site: string; report: string; digest: string | null; lifecycle: string };
  freshness: { current: boolean; checkedAt: string };
};
const framework = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Include ordinary hoisted dependency locations in installed npm packages too.
const checkModulePaths = (createRequire(import.meta.url).resolve.paths('yaml') ?? []).filter(directory => path.basename(directory) === 'node_modules').join(path.delimiter);
const modes = new Set(['created', 'modified', 'deleted', 'declared']);
const finding = (code: string, explanation: string, nextAction: string, severity: ValidationFinding['severity'] = 'error'): ValidationFinding => ({ code, severity, explanation, nextAction });

export async function validationArtifactDigest(directory: string): Promise<string | null> {
  const entries: Array<[string, string]> = [];
  const visit = async (current: string) => {
    for (const entry of (await readdir(current, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.join(current, entry.name);
      if (entry.isDirectory()) await visit(file);
      else if (entry.isFile()) entries.push([path.relative(directory, file), sha256(await readFile(file))]);
      else throw new SnapshotError('unsafe_path', 'Artifacts must contain regular files and directories');
    }
  };
  try { await visit(directory); return sha256(JSON.stringify(entries)); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
}

function checkedOptions(options: ValidationOptions) {
  const selected = (options.files?.length ?? 0) + (options.ids?.length ?? 0);
  if (options.baselineFile && selected || !options.baselineFile && !selected) throw new SnapshotError('invalid_input', 'Validate with explicit files/IDs or one task baseline, not both.');
  for (const key of ['files', 'ids'] as const) if (options[key] !== undefined && (!Array.isArray(options[key]) || options[key]!.some(item => typeof item !== 'string' || !item.trim()) || new Set(options[key]).size !== options[key]!.length)) throw new SnapshotError('invalid_input', `${key} must contain distinct nonempty strings`);
  if (options.runConfiguredChecks !== undefined && typeof options.runConfiguredChecks !== 'boolean') throw new SnapshotError('invalid_input', 'runConfiguredChecks must be boolean');
}

/** Public entry: no plan/apply, source writes, provider or autonomous orchestration. */
export async function validateAuthoringChanges(configFile: string, options: ValidationOptions) {
  return validateAuthoringChangesWithHooks(configFile, options);
}

// Internal injection boundary for deterministic capture/check race fixtures.
export async function validateAuthoringChangesWithHooks(configFile: string, options: ValidationOptions, hooks: { afterCapture?: () => Promise<void>; afterChecks?: () => Promise<void> } = {}): Promise<ValidationReport> {
  checkedOptions(options);
  const capture = await captureSnapshotInputs(configFile);
  const runtime = await validatorInputs();
  let baseline: ValidationReport['baseline'] = { kind: 'explicit-declaration' };
  const previous = new Map<string, SnapshotInput>();
  if (options.baselineFile) {
    const raw = await readFile(options.baselineFile);
    const value = parseAuthoringBaseline(JSON.parse(raw.toString('utf8')), capture.root, capture.config);
    baseline = { kind: 'task-baseline', file: await realpath(options.baselineFile), digest: sha256(raw) };
    for (const input of value.inputs) previous.set(input.file, input);
    // A dependency removed from config is not necessarily a deleted file. Retain
    // baseline scope for extant sibling inputs so change classification is honest.
    const oldExternal: string[] = [];
    for (const input of value.inputs) if ((!isWithin(capture.root, path.resolve(capture.root, input.file)) || input.file.split(path.sep).includes('node_modules')) && await stat(relativeInput(capture.root, input.file)).then(() => true, () => false)) oldExternal.push(input.file);
    const oldDirectories: string[] = [];
    for (const directory of value.externalDirectories) if (await stat(relativeInput(capture.root, directory)).then(() => true, () => false)) oldDirectories.push(directory);
    const combinedDirectories = [...new Set([...capture.externalDirectories, ...oldDirectories])].sort();
    const combined = await collectSnapshotInputs(capture.root, [...new Set([...oldExternal, ...capture.inputs.filter(input => (!isWithin(capture.root, path.resolve(capture.root, input.file)) || input.file.split(path.sep).includes('node_modules'))).map(input => input.file)])], combinedDirectories);
    for (const input of capture.inputs) if (combined.inputs.find(current => current.file === input.file)?.digest !== input.digest) throw new SnapshotError('stale_input', `Input changed while comparing the task baseline: ${input.file}`);
    Object.assign(capture, combined, { externalDirectories: combinedDirectories });
  }
  let loaded: Awaited<ReturnType<typeof loadConfig>> | undefined;
  // Loading configuration is read-only. Compilation and executable extensions
  // are never run on the original project.
  try { loaded = await loadConfig(path.join(capture.root, capture.config)); } catch { /* Snapshot compiler diagnoses invalid YAML/config. */ }
  const contentDir = path.resolve(capture.root, String((loaded?.value.site as any)?.contentDir ?? 'content'));
  if (!isWithin(capture.root, contentDir) || contentDir === capture.root) throw new SnapshotError('unsafe_path', 'Authoring validation requires content inside the project configuration directory.');
  const authored = capture.inputs.filter(input => isWithin(contentDir, path.resolve(capture.root, input.file)) && /\.mdx?$/.test(input.file)).map(input => input.file);
  const selected = new Set<string>();
  if (baseline.kind === 'task-baseline') {
    for (const file of new Set([...previous.keys(), ...capture.inputs.map(input => input.file)])) {
      const old = previous.get(file), current = capture.inputs.find(input => input.file === file);
      if (old?.digest !== current?.digest || old?.mode !== current?.mode) selected.add(file);
    }
  } else {
    for (const file of options.files ?? []) {
      const absolute = relativeInput(capture.root, file);
      const normalized = path.relative(capture.root, absolute);
      if (normalized.split(path.sep).some(part => excludedNames.has(part) || part === '.env' || part.startsWith('.env.'))) throw new SnapshotError('invalid_input', `Selected file is excluded from capture: ${file}`);
      if (!isWithin(capture.root, absolute) && !capture.inputs.some(input => input.file === normalized)) throw new SnapshotError('invalid_input', `Select an existing captured dependency: ${file}`);
      selected.add(normalized);
    }
    for (const id of options.ids ?? []) {
      let matched = false;
      for (const file of authored) {
        try {
          const doc = await readDocument(path.join(capture.root, file), loaded?.value.frontmatter, undefined, capture.buffers.get(file)!.toString('utf8'));
          if (doc.frontmatter.id === id) { selected.add(file); matched = true; }
        } catch { /* Broken pages can be explicitly selected by path. */ }
      }
      if (!matched) throw new SnapshotError('invalid_input', `No authored page with ID ${id}; select a broken or deleted page by file path.`);
    }
  }
  const changed = [...selected].sort().map(file => {
    const old = previous.get(file), current = capture.inputs.find(input => input.file === file);
    return { file, operation: (!current ? 'deleted' : baseline.kind === 'explicit-declaration' ? 'declared' : !old ? 'created' : 'modified') as ValidationReport['changed'][number]['operation'], beforeDigest: old?.digest ?? null, digest: current?.digest ?? null };
  });
  // Configuration, snippets, source dependencies and deletions can affect any
  // page. Use conservative complete-site coverage rather than missing companions.
  const broad = [...selected].some(file => !authored.includes(file));
  const affected = broad ? authored : authored.filter(file => selected.has(file));
  const contentDigest = sha256(JSON.stringify(capture.inputs));
  const snapshotId = sha256(JSON.stringify([capture.config, contentDigest, runtime.digest, baseline, changed, !!options.runConfiguredChecks]));
  const directory = options.artifactsDirectory ? await authoringArtifactPath(capture.root, options.artifactsDirectory) : await realpath(await mkdtemp(path.join(os.tmpdir(), 'shoalrun-validation-')));
  if (options.artifactsDirectory) { await mkdir(path.dirname(directory), { recursive: true }); await mkdir(directory); }
  const tree = path.join(directory, 'tree'), shadow = path.join(tree, path.basename(capture.root)), site = path.join(directory, 'site');
  const report: ValidationReport = { schemaVersion: 1, kind: 'shoalrun-authoring-validation', status: 'incomplete', snapshotId, project: capture.root, config: capture.config, baseline, changed, inputs: capture.inputs, excluded: capture.excluded, externalDirectories: capture.externalDirectories, contentDigest, configDigest: capture.configDigest, validatorDigest: runtime.digest, runtimeDependencies: [], dependencies: [], checks: [], findings: [],
    coverage: { scope: 'complete-captured-project', authored, affected, rendered: [], notRendered: [...affected] },
    artifacts: { directory, project: shadow, site, report: path.join(directory, 'report.json'), digest: null, lifecycle: 'Retained local validation artifacts. Remove this artifact directory when finished; it is separate from working-tree source. No preview service is started.' },
    freshness: { current: true, checkedAt: new Date().toISOString() } };
  const addError = (error: unknown) => report.findings.push(validationFinding(error, capture, shadow, loaded));
  const absentInputsUnchanged = async () => {
    for (const input of changed) if (input.digest === null && await stat(path.resolve(capture.root, input.file)).then(() => true, () => false)) return false;
    return true;
  };
  try {
    for (const input of capture.inputs) {
      const target = path.resolve(shadow, input.file);
      if (!isWithin(tree, target)) throw new SnapshotError('unsafe_path', `Cannot materialize ${input.file}`);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, capture.buffers.get(input.file)!, { flag: 'wx' });
      await chmod(target, input.mode);
    }
    // Preserve the repository boundary for sibling Walkthrough sources without
    // copying Git metadata or making the working tree a build destination.
    if (await stat(path.join(path.dirname(capture.root), '.git')).then(() => true, () => false)) await mkdir(path.join(tree, '.git'));
    await hooks.afterCapture?.();
    if (!await confirmSnapshotInputs(capture) || !await absentInputsUnchanged()) throw new SnapshotError('stale_input', 'Working tree changed during snapshot capture; retry validation.');
    const stagedConfig = path.join(shadow, capture.config);
    loaded = await loadConfig(stagedConfig);
    if (capture.configDigest && loaded.digest !== capture.configDigest) throw new SnapshotError('stale_input', 'Captured configuration does not match the inspected configuration; retry.');
    // Local executable metadata/highlighting modules are not a provider-free
    // inspection primitive. Report unavailable instead of executing unknown code.
    const config: any = loaded.value;
    if (config.metadata?.provider || config.outputs?.html?.highlighting?.module) {
      report.checks.push({ id: 'compile', status: 'unavailable', explanation: 'Custom executable metadata/highlighting modules are not supported by snapshot validation yet.' });
      report.findings.push(finding('validation.extension-unavailable', 'This project configures an executable metadata/highlighting extension; it was not invoked.', 'Use the existing trusted build workflow, or remove the extension only if project policy permits.', 'review-needed'));
    } else {
      for (const file of affected) {
        try {
          const doc = await readDocument(path.join(shadow, file), loaded.value.frontmatter, undefined, capture.buffers.get(file)!.toString('utf8'));
          report.findings.push(...authoringHints(doc.body, file));
          if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(doc.frontmatter.id)) report.findings.push({ ...finding('validation.identity', 'Page IDs must begin with a letter/digit and contain only letters, digits, dots, underscores or hyphens.', 'Choose a stable ID and update its references.'), file, reference: 'guide.frontmatter-reference' });
        } catch (error) { addError(error); }
      }
      try {
        const manifest = await compile(stagedConfig, site, {}, { authoringFiles: new Set(affected.map(file => path.join(shadow, file))) });
        report.dependencies = manifest.dependencies.map(file => isWithin(tree, file) ? path.relative(shadow, file) : file);
        for (const dependency of manifest.dependencies) {
          if (isWithin(tree, dependency)) {
            if (!capture.buffers.has(path.relative(shadow, dependency))) throw new SnapshotError('unsupported_dependency', `Compiler dependency was not captured: ${path.relative(shadow, dependency)}`);
          } else if (isWithin(framework, dependency) || dependency === iconLicenseFile) report.runtimeDependencies.push({ file: dependency, digest: sha256(await readFile(dependency)), mode: (await stat(dependency)).mode & 0o777 });
          else throw new SnapshotError('unsupported_dependency', `Compiler attempted to use an uncaptured dependency: ${dependency}`);
        }
        report.coverage.rendered = (manifest.authoringSources ?? []).map(doc => ({ id: doc.id, file: path.relative(shadow, doc.file), route: doc.url, markdown: doc.markdownUrl }));
        report.coverage.notRendered = affected.filter(file => !report.coverage.rendered.some(doc => doc.file === file));
        for (const file of report.coverage.notRendered) report.findings.push({ ...finding('validation.excluded-page', 'This affected authored page did not render in any enabled publication.', 'Correct its publication/locale selection or enable an isolated review publication and validate again.'), file });
        report.checks.push({ id: 'compile', status: 'passed', documents: manifest.documents.length });
        const settings = parseAuditSettings(config.audit);
        if (settings.links) {
          const links = await auditLinks(site, config.site?.origin);
          report.checks.push({ id: 'representations-and-links', status: links.status === 'ok' ? 'passed' : 'failed', documents: links.pages, findings: links.findings.length });
          for (const problem of links.findings) {
            const document = report.coverage.rendered.find(doc => doc.route === problem.target || doc.markdown === problem.target);
            report.findings.push({ ...finding('validation.link', problem.message, 'Repair the link/anchor in the authored source and validate again.'), ...(document ? { file: document.file } : {}) });
          }
        } else report.checks.push({ id: 'representations-and-links', status: 'skipped', explanation: 'Disabled by audit.links; compiler document-link validation still ran.' });
        if (settings.focusedContracts) {
          const review = await auditFocusedContracts(site);
          report.checks.push({ id: 'focused-contracts', status: review.status === 'ok' ? 'passed' : 'failed', findings: review.failures.length });
          for (const failure of review.failures) report.findings.push(finding('validation.focused-contract', failure.message, 'Repair the API contract/example and validate again.'));
        } else report.checks.push({ id: 'focused-contracts', status: 'skipped', explanation: 'Disabled by audit.focusedContracts.' });
        if (settings.api) {
          const sources = manifest.dependencies.filter(file => /\.(?:json|ya?ml)$/.test(file) && !loaded!.dependencies.includes(file));
          for (const source of sources) {
            // Only OpenAPI documents are passed to the canonical API auditor.
            const raw = await readFile(source, 'utf8');
            if (!/(?:"openapi"\s*:|^openapi\s*:)/m.test(raw)) continue;
            const review = await auditReference(source);
            report.checks.push({ id: `api:${path.relative(shadow, source)}`, status: review.status === 'ok' ? 'passed' : 'failed', findings: review.failures.length });
            for (const failure of review.failures) report.findings.push({ ...finding('validation.api-example', failure.message, 'Repair the API example/contract and validate again.'), file: path.relative(shadow, source) });
          }
        } else report.checks.push({ id: 'api-examples', status: 'skipped', explanation: 'Disabled by audit.api.' });
        for (let index = 0; index < settings.tests.length; index++) {
          const spec = settings.tests[index];
          if (!options.runConfiguredChecks) { report.checks.push({ id: `test:${spec.id}`, status: 'skipped', explanation: 'Configured commands require an explicit --run-checks request under harness execution permissions.' }); continue; }
          const result = await runAuditTest(spec, shadow, {
            SHOALRUN_VALIDATION_SITE: site, SHOALRUN_VALIDATION_SNAPSHOT: snapshotId,
            // CommonJS checks can use the installed tool's dependencies without
            // copying node_modules or resolving against the author's live tree.
            NODE_PATH: checkModulePaths,
          });
          const unavailable = result.findings.some(item => /ENOENT|EACCES|MODULE_NOT_FOUND|ERR_MODULE_NOT_FOUND/.test(item.message));
          report.checks.push({ id: result.id, status: result.status === 'ok' ? 'passed' : unavailable ? 'unavailable' : 'failed' });
          for (const item of result.findings) report.findings.push({ ...finding('validation.project-check', item.message.split(shadow + path.sep).join(''), 'Inspect the configured check output, repair actionable errors or make the validator available, then validate again.', unavailable ? 'review-needed' : 'error'), ...configFindingLocation(loaded, ['audit', 'tests', String(index)], capture, shadow) });
        }
        if (settings.evals) report.checks.push({ id: 'evals', status: 'skipped', explanation: 'Harness/model evaluations are not executed by the provider-free snapshot validator.' });
      } catch (error) {
        const unavailable = error instanceof SnapshotError && error.code === 'unsupported_dependency' || /Could not find Chrome|Browser was not found|no executable was found|Failed to launch the browser process|spawn .*ENOENT/.test((error as Error).message);
        report.checks.push({ id: 'compile-and-checks', status: unavailable ? 'unavailable' : 'failed', explanation: (error as Error).message.split(shadow + path.sep).join('') });
        const diagnostic = validationFinding(error, capture, shadow, loaded);
        if (unavailable) { diagnostic.code = 'validation.validator-unavailable'; diagnostic.severity = 'review-needed'; diagnostic.nextAction = 'Make the renderer/dependency available in the captured environment and validate again.'; }
        report.findings.push(diagnostic);
      }
    }
    await hooks.afterChecks?.();
    // A trusted check may create cache/output in excluded locations, but cannot
    // change or remove any captured input and still receive a passing report.
    const stagedCapture = { root: shadow, inputs: capture.inputs, externalDirectories: capture.externalDirectories };
    if (!await confirmSnapshotInputs(stagedCapture)) report.findings.push(finding('validation.snapshot-modified', 'A build or configured check changed the captured project inputs.', 'Fix the check so it leaves source inputs unchanged; validate a new snapshot.'));
  } catch (error) {
    if (error instanceof SnapshotError && error.code === 'stale_input') {
      report.findings.push(finding('validation.stale-input', error.message, 'Retry capture after concurrent edits stop.'));
      report.freshness.current = false;
    } else addError(error);
  }
  let runtimeDependencyChanged = false;
  for (const dependency of report.runtimeDependencies) if (sha256(await readFile(dependency.file).catch(() => Buffer.alloc(0))) !== dependency.digest) runtimeDependencyChanged = true;
  if (!await confirmSnapshotInputs(capture) || !await absentInputsUnchanged() || (await validatorInputs()).digest !== runtime.digest || runtimeDependencyChanged || baseline.file && sha256(await readFile(baseline.file).catch(() => Buffer.alloc(0))) !== baseline.digest) {
    report.freshness.current = false;
    report.findings.push(finding('validation.stale-input', 'Working-tree, baseline or validator inputs changed during validation.', 'Validate the current working tree again; this report describes only the captured inputs.'));
  }
  report.freshness.checkedAt = new Date().toISOString();
  report.status = !report.freshness.current ? 'stale' : report.findings.some(item => item.severity === 'error') || report.checks.some(check => check.status === 'failed') ? 'failed' : report.checks.some(check => check.status === 'unavailable') ? 'unavailable' : report.checks.some(check => check.status === 'skipped') ? 'incomplete' : 'ok';
  report.artifacts.digest = await validationArtifactDigest(site);
  await writeFile(report.artifacts.report, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  return report;
}

/** Shared reader for retained reports; this never runs project code. */
export async function readValidationReport(reportFile: string): Promise<ValidationReport> {
  const raw = await readFile(reportFile, 'utf8');
  let report: ValidationReport;
  try { report = JSON.parse(raw); }
  catch { throw new SnapshotError('invalid_input', 'Validation report must be valid JSON'); }
  if (!report || report.schemaVersion !== 1 || report.kind !== 'shoalrun-authoring-validation' || !Array.isArray(report.inputs) || !Array.isArray(report.externalDirectories) || !Array.isArray(report.runtimeDependencies) || !Array.isArray(report.changed) || report.changed.some(item => !item || !modes.has(item.operation))) throw new SnapshotError('invalid_input', 'Expected a version-1 authoring validation report');
  if (!report.baseline || !report.coverage || !Array.isArray(report.coverage.rendered) || !Array.isArray(report.coverage.affected) || !Array.isArray(report.coverage.notRendered) || !Array.isArray(report.checks) || !Array.isArray(report.findings) || !report.artifacts || !report.freshness || typeof report.project !== 'string' || !path.isAbsolute(report.project) || typeof report.snapshotId !== 'string' || !/^[a-f0-9]{64}$/.test(report.snapshotId)) throw new SnapshotError('invalid_input', 'Malformed authoring validation report');
  for (const input of report.inputs) relativeInput(report.project, input.file);
  return report;
}

/** Refresh applicability without rebuilding, applying or mutating source. */
export async function authoringValidationStatus(reportFile: string) {
  const report = await readValidationReport(reportFile);
  let missingInputCreated = false;
  for (const input of report.changed) if (input.digest === null && await stat(relativeInput(report.project, input.file)).then(() => true, () => false)) missingInputCreated = true;
  const changed = missingInputCreated || sha256(JSON.stringify(report.inputs)) !== report.contentDigest || !await confirmSnapshotInputs({ root: report.project, inputs: report.inputs, externalDirectories: report.externalDirectories });
  const runtime = await validatorInputs();
  let baselineChanged = false, dependencyChanged = false;
  if (report.baseline.file) baselineChanged = sha256(await readFile(report.baseline.file).catch(() => Buffer.alloc(0))) !== report.baseline.digest;
  for (const dependency of report.runtimeDependencies) if (sha256(await readFile(dependency.file).catch(() => Buffer.alloc(0))) !== dependency.digest) dependencyChanged = true;
  const artifactChanged = await validationArtifactDigest(report.artifacts.site) !== report.artifacts.digest || !await confirmSnapshotInputs({ root: report.artifacts.project, inputs: report.inputs, externalDirectories: report.externalDirectories });
  const current = report.freshness.current && !changed && !baselineChanged && !dependencyChanged && !artifactChanged && runtime.digest === report.validatorDigest;
  return { schemaVersion: 1, status: current ? report.status : 'stale', snapshotId: report.snapshotId, report: path.resolve(reportFile), current, changed: { source: changed, baseline: baselineChanged, validator: runtime.digest !== report.validatorDigest || dependencyChanged, artifacts: artifactChanged }, nextAction: current ? 'Review the reported coverage and findings.' : 'Run docs validate again for the current working tree; old findings and previews do not verify new edits.' };
}

export const validationFailure = (error: unknown) => ({ schemaVersion: 1, status: 'error', error: { code: error instanceof SnapshotError ? error.code : 'internal_error', message: error instanceof Error ? error.message : 'Snapshot validation failed' } });
