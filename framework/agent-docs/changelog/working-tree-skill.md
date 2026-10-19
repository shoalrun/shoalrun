---
id: change.working-tree-skill
title: Portable working-tree authoring workflow
summary: Guide existing coding agents through discovery, native editing,
  validation, and snapshot review.
type: changelog-entry
area: authoring
subarea: authoring-agent-workflows
canonical: /changelog/working-tree-skill
date: 2026-10-13
---

# Portable working-tree authoring workflow

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Changelog](https://www.shoalrun.com/.well-known/shoalrun/navigation/changelog-tab-50f26fe22670.txt) (ID: changelog-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Changelog](https://www.shoalrun.com/changelog.md) > Changelog > Portable working-tree authoring workflow

**Published: 2026-10-13.**

This change concerns the private prototype; no package release or deployment is claimed.

The `shoalrun-author` skill now uses ordinary working-tree edits by default. It guides project discovery, policy and evidence reads, baseline capture, native edits, and required companions. The agent then validates a separate capture and presents its matching HTML/Markdown preview for review. It preserves earlier local edits and keeps task-diff attribution with the harness.

Affected drafts render in snapshot validation without changing their access policy. Existing checked plan/apply clients can still choose that workflow explicitly. The authoring guides now distinguish these two paths and remove obsolete instructions to change draft access for a review copy.

Give your coding agent the installed skill file and use the public CLI alongside its usual editing tools. No separate authoring service or model configuration is required.

## Related reading

### Next steps

- [Use the bundled agent skills](https://www.shoalrun.com/contribute/agent-skills.md) — Load the portable authoring skill in your existing coding agent.

### Reference while working

- [Check working-tree documentation edits](https://www.shoalrun.com/author/workspace.md) — Follow the baseline, validation, and matching-preview procedure. (Status: experimental.)
