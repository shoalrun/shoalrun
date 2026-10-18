---
id: change.authoring-preview
title: Authoring snapshot previews and review reports
summary: Review affected pages, findings, coverage, and freshness beside an
  exact snapshot preview.
type: changelog-entry
canonical: /changelog/authoring-preview
date: 2026-10-13
---

# Authoring snapshot previews and review reports

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Changelog](https://www.shoalrun.com/.well-known/shoalrun/navigation/changelog-tab-50f26fe22670.txt) (ID: changelog-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Changelog](https://www.shoalrun.com/changelog.md) > Changelog > Authoring snapshot previews and review reports

**Published: 2026-10-13.**

This change concerns the private prototype; no package release or deployment is claimed.

`docs review REPORT` presents a validated snapshot as JSON or Markdown. It identifies the task baseline, changed files and dependencies, findings, check coverage, and affected HTML/Markdown artifacts. Baselines contain digests rather than earlier contents; retain the task diff with your existing harness.

`docs preview REPORT` serves a private copy of that exact build on a loopback address. It returns a browser review URL and routes for every affected page that rendered. HTML pages display freshness and a review link. Source edits make the preview stale rather than replacing its content; validate again and restart from the new report. Changed artifacts prevent startup or serving.

Ctrl-C or SIGTERM closes the foreground server and removes its serving copy. Validation artifacts remain available separately. Failed or skipped checks retain their actual status while previewing. The tools make no authoring provider calls and do not apply edits, commit, or publish.

Snapshot builds preserve captured freshness history. Configured checks can declare sibling files and directories with `audit.tests[].inputs`; validation captures those inputs and tracks their changes. Compiler checks do not replace factual or editorial review.

## Related reading

### Next steps

- [Check working-tree documentation edits](https://www.shoalrun.com/author/workspace.md) — Validate working-tree edits and open the matching snapshot review. (Status: experimental.)

### Reference while working

- [Authoring tools commands](https://www.shoalrun.com/author/workspace/commands.md) — Look up review formats, preview lifecycle, statuses, and limits. (Status: experimental.)
