---
id: guide.authoring-agent-workflow
title: How snapshot validation works
summary: Understand captured files, affected-page coverage, freshness, and
  validation limits.
type: explanation
area: authoring
subarea: authoring-agent-workflows
audiences:
  - authors
subjectLifecycle: experimental
canonical: /author/agent-workflow
---

# How snapshot validation works

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Write with agents > Project tools > Snapshot validation

**Updated: 2026-10-26.**

**Status: Experimental.**

Snapshot validation checks a captured working tree. Your existing coding agent edits files; Shoalrun records and checks the resulting state.

## Baselines and captures

A baseline records source paths, modes, and digests before a task. It includes preexisting dirty and untracked files. Validation compares with that baseline, or uses explicit file and page selectors, to identify affected pages. Configuration, dependency, and deletion changes can expand coverage to all authored pages.

The capture excludes generated output, dependencies, repository metadata, credentials, and private archives. Files must fit capture limits. Symlinks and absolute dependency references are rejected. Declared sibling dependencies can be captured within the project's parent directory. Capture races produce a failure rather than an apparently current result.

## Checks and artifacts

The compiler renders affected drafts in the captured project while preserving their publication access metadata. It checks metadata, identities, routes, components, navigation, relationships, and document links. Local HTML and Markdown links and configured API contracts are checked in the captured output. External URLs are not requested.

Configured shell checks are skipped by default. With `--run-checks`, trusted project commands run inside the capture under the harness's permissions. This is not an operating-system sandbox; scripts can still access absolute paths or services. Model evaluators are skipped. Executable metadata and highlighting extensions are currently unavailable to snapshot validation.

The result retains the captured project, built site, and JSON report. Remove the reported artifact directory when finished. Compiler success does not replace factual and editorial review.

## Freshness and scope

The report identifies the snapshot and source digests. `docs validation-status` compares current inputs with the report and returns stale when they differ. A report only applies to its recorded coverage and checks. Review skipped and unavailable checks before accepting a result.

Snapshot validation does not apply edits, start a preview server, commit, or publish. Existing checked plan/apply clients retain their own review and freshness protections.

## Matching previews and review reports

`docs review` reads a retained validation report as JSON or Markdown. It associates changed-file operations and digests with the declared baseline and exposes findings, check status, affected routes, dependencies, and artifacts. Baselines retain digests rather than earlier contents, so your harness must retain the task diff. Evidence, semantic review, and author decisions are not inferred by these tools.

`docs preview` makes a separate private copy of the validated site and starts a foreground loopback server. Every affected rendered page has HTML and Markdown URLs. HTML pages link to a browser review and display freshness; the original Markdown output remains unchanged. Replacing source files does not replace the preview's content. Replacing the report makes its pinned preview stale. Artifact changes prevent startup or stop page serving.

After editing, validate again and restart from the new report. Ctrl-C or SIGTERM closes the server and removes only its serving copy. Retained validation artifacts have a separate lifecycle. The preview starts no source watcher or provider requests.

## Related reading

### Next steps

- [Check working-tree documentation edits](https://www.shoalrun.com/author/workspace.md) — Capture a baseline and validate a working-tree edit. (Status: experimental.)

### Reference while working

- [Authoring tools commands](https://www.shoalrun.com/author/workspace/commands.md) — Find commands for discovery and snapshot validation. (Status: experimental.)
