import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { authoringValidationStatus, readValidationReport, type ValidationReport } from './authoring-validation.js';
import { isWithin, sha256, SnapshotError } from './authoring-snapshot.js';

export type AuthoringReview = {
  schemaVersion: 1; kind: 'shoalrun-authoring-review'; snapshotId: string;
  status: ValidationReport['status']; validationStatus: ValidationReport['status'];
  freshness: Awaited<ReturnType<typeof authoringValidationStatus>> & { reportChanged: boolean };
  baseline: ValidationReport['baseline']; changed: ValidationReport['changed'];
  dependencies: Array<{ file: string; digest: string | null; source: 'captured-project' | 'validator' }>;
  checks: ValidationReport['checks']; findings: ValidationReport['findings']; coverage: ValidationReport['coverage'];
  pageSelection: 'affected-authored-pages' | 'complete-rendered-project';
  pages: Array<{ id: string; file: string; route: string; markdown: string; origin: 'authored' | 'generated'; htmlArtifact: string; markdownArtifact: string }>;
  artifacts: ValidationReport['artifacts'];
  diff: { available: false; basis: ValidationReport['baseline']; explanation: string };
  evidence: { status: 'harness-owned'; links: string[] };
  reviewers: { status: 'not-run'; results: never[] }; dispositions: never[];
  nextAction: string;
};

export function reviewArtifact(site: string, route: string, html = false) {
  if (typeof route !== 'string' || !route.startsWith('/') || route.startsWith('//') || /[\\\0\r\n?#]/.test(route) || route.split('/').some(part => part === '..' || part === '.')) throw new SnapshotError('unsafe_path', 'Invalid review artifact route');
  const file = path.resolve(site, `.${route}`, ...(html ? ['index.html'] : []));
  if (!isWithin(path.resolve(site), file)) throw new SnapshotError('unsafe_path', 'Review artifact escapes the site');
  return file;
}

// Pin the report bytes. Editing/replacing the report never switches an existing
// preview to another snapshot or makes it appear current.
export async function pinnedValidationStatus(reportFile: string, report: ValidationReport, reportDigest: string) {
  const check = async () => sha256(await readFile(reportFile).catch(() => Buffer.alloc(0))) === reportDigest;
  if (await check()) {
    const status = await authoringValidationStatus(reportFile);
    if (await check()) return { ...status, reportChanged: false };
  }
  return { schemaVersion: 1, status: 'stale' as const, snapshotId: report.snapshotId, report: path.resolve(reportFile), current: false, changed: { source: false, baseline: false, validator: false, artifacts: false }, reportChanged: true, nextAction: 'The validation report changed or was removed. Validate again and start a new preview from the new report.' };
}

export function assembleAuthoringReview(report: ValidationReport, freshness: AuthoringReview['freshness']): AuthoringReview {
  const affected = new Set(report.coverage.affected);
  const authored = new Set(report.coverage.authored);
  // Config/dependency/deletion scope is conservative in validation. Include all
  // generated API operations too, rather than showing only authored MDX pages.
  const broad = report.changed.some(change => !authored.has(change.file));
  const pages = report.coverage.rendered.filter(page => broad || affected.has(page.file)).map(page => ({ ...page, origin: authored.has(page.file) ? 'authored' as const : 'generated' as const, htmlArtifact: reviewArtifact(report.artifacts.site, page.route, true), markdownArtifact: reviewArtifact(report.artifacts.site, page.markdown) }));
  const inputs = new Map(report.inputs.map(input => [input.file, input.digest]));
  return {
    schemaVersion: 1, kind: 'shoalrun-authoring-review', snapshotId: report.snapshotId,
    status: freshness.status, validationStatus: report.status, freshness,
    baseline: report.baseline, changed: report.changed,
    dependencies: report.dependencies.map(file => ({ file, digest: inputs.get(file) ?? report.runtimeDependencies.find(input => input.file === file)?.digest ?? null, source: inputs.has(file) ? 'captured-project' : 'validator' })),
    checks: report.checks, findings: report.findings, coverage: report.coverage, pageSelection: broad ? 'complete-rendered-project' : 'affected-authored-pages', pages, artifacts: report.artifacts,
    diff: { available: false, basis: report.baseline, explanation: report.baseline.kind === 'task-baseline' ? 'The task baseline records file digests, not earlier file contents. Changes below belong to that baseline; use your harness to retain and review the corresponding diff.' : 'Explicit selectors declare scope, not a before-state. No Git HEAD or whole-dirty-tree diff is attributed to this task.' },
    evidence: { status: 'harness-owned', links: [] }, reviewers: { status: 'not-run', results: [] }, dispositions: [],
    nextAction: freshness.current ? report.status === 'ok' ? 'Review the affected HTML/Markdown, task diff and supporting evidence before accepting the edit.' : 'Resolve findings and skipped/unavailable checks, then validate again. A preview is not a passing result.' : freshness.nextAction,
  };
}

export async function loadPinnedReview(reportFile: string) {
  const raw = await readFile(reportFile);
  const report = await readValidationReport(reportFile);
  const digest = sha256(raw);
  if (sha256(await readFile(reportFile)) !== digest) throw new SnapshotError('stale_input', 'Report changed while reading; retry.');
  return { report, digest, review: assembleAuthoringReview(report, await pinnedValidationStatus(reportFile, report, digest)) };
}

/** Read a review without writes, providers, application or publication. */
export async function authoringReview(reportFile: string): Promise<AuthoringReview> {
  return (await loadPinnedReview(reportFile)).review;
}

const cell = (value: string) => value.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/[\r\n]/g, ' ');
export function authoringReviewMarkdown(review: AuthoringReview) {
  const lines = ['# Authoring review', '', `Snapshot: ${review.snapshotId}`, '', `Status: **${review.status}**. Validation result: ${review.validationStatus}. Current: ${review.freshness.current}.`, '', review.nextAction,
    '', '## Task scope', '', `Baseline: ${review.baseline.kind}${review.baseline.file ? ` (${review.baseline.file}; digest ${review.baseline.digest})` : ''}.`, '', review.diff.explanation,
    '', '| File | Change | Before digest | Snapshot digest |', '| --- | --- | --- | --- |',
    ...review.changed.map(item => `| ${cell(item.file)} | ${item.operation} | ${item.beforeDigest ?? 'unknown'} | ${item.digest ?? 'deleted'} |`),
    '', '## Affected pages', '', `Page selection: ${review.pageSelection}.`, '', '| Source / ID | Origin | HTML route | Markdown route |', '| --- | --- | --- | --- |',
    ...review.pages.map(page => `| ${cell(page.file)} / ${cell(page.id)} | ${page.origin} | ${cell(page.route)} | ${cell(page.markdown)} |`),
    '', `Not rendered: ${review.coverage.notRendered.join(', ') || 'none'}.`,
    '', '## Checks', '', ...review.checks.map(check => `- ${check.id}: ${check.status}${check.explanation ? ` — ${check.explanation}` : ''}`),
    '', '## Findings', '', ...review.findings.flatMap(finding => [`- ${finding.severity}: ${finding.code}${finding.file ? ` at ${finding.file}${finding.location ? `:${finding.location.line}:${finding.location.column}` : ''}` : ''}`, `  ${finding.explanation}`, `  Next: ${finding.nextAction}${finding.reference ? ` Reference: ${finding.reference}.` : ''}`, ...(finding.relatedFiles?.length ? [`  Related sources: ${finding.relatedFiles.join(', ')}.`] : [])]),
    ...(review.findings.length ? [] : ['No findings reported. Check coverage and skipped checks before accepting the result.']),
    '', '## Dependencies', '', ...review.dependencies.map(input => `- ${input.file}: ${input.digest ?? 'digest unavailable'} (${input.source})`),
    '', '## Artifacts and review limits', '', `Captured project: ${review.artifacts.project}`, `Built site: ${review.artifacts.site}`, `Validation report: ${review.artifacts.report}`, '', review.artifacts.lifecycle,
    '', 'Evidence gathering remains with your harness. No semantic reviewer ran; no author dispositions are recorded. Compiler success does not establish factual accuracy or reader usefulness.', ''];
  return lines.join('\n');
}
