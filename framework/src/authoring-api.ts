// Optional authoring tools use this versioned surface instead of dist internals.
export const authoringApiVersion = 1;
export { loadConfig } from './config.js';
export { docsContext, docsPlan, docsApply } from './docs-author.js';
export { compile } from './compiler.js';
export { validateAuthoringGuidance } from './authoring-guidance.js';
export { inspectAuthoringProject, readAuthoringSource, projectToolSchemaVersion, projectSections, ProjectToolError, projectToolFailure } from './authoring-project.js';
export type { ProjectOptions, ProjectSection, ProjectFinding } from './authoring-project.js';
export { bundledDocumentation, searchDocumentation, getDocumentationPage, getDocumentationOutline, getDocumentationSection } from './documentation-core.js';
export { captureAuthoringBaseline, writeAuthoringBaseline, snapshotSchemaVersion } from './authoring-snapshot.js';
export type { AuthoringBaseline } from './authoring-snapshot.js';
export { validateAuthoringChanges, authoringValidationStatus } from './authoring-validation.js';
export type { ValidationOptions, ValidationReport, ValidationCheck } from './authoring-validation.js';
export type { ValidationFinding } from './authoring-findings.js';
export { authoringReview, authoringReviewMarkdown } from './authoring-review.js';
export type { AuthoringReview } from './authoring-review.js';
export { startAuthoringPreview } from './authoring-preview.js';
export type { AuthoringPreview, AuthoringPreviewOptions } from './authoring-preview.js';
// Optional capabilities let private authoring clients reject an older package
// before spending provider budget. Existing version-1 update clients still work.
export const authoringCapabilities = ['create-page', 'complete-bundle-validation', 'project-discovery', 'project-source-read', 'documentation-search-read', 'working-tree-validation', 'task-baseline', 'validation-freshness', 'snapshot-preview', 'authoring-review-report'] as const;
