---
id: guide.authoring-agent-overview
title: Authoring tools for your coding agent
summary: Understand project discovery, working-tree editing, snapshot
  validation, and human review.
type: explanation
area: authoring
subarea: authoring-agent-workflows
audiences:
  - authors
subjectLifecycle: experimental
canonical: /author/agent-overview
---

# Authoring tools for your coding agent

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Write with agents > Project tools > Tools overview

**Updated: 2026-10-26.**

**Status: Experimental.**

Shoalrun supplies documentation tools for existing coding agents. Your agent supplies its model, file editing, repository exploration, and execution permissions. Shoalrun supplies canonical writing guidance, templates, project discovery, and checks. The tools make no authoring provider calls.

## Discover before editing

Project discovery works without selecting a page. It lists pages, configured guidance, templates, navigation, relationships, and findings. Topic searches help your agent find candidates across the project. Source reads return bounded passages and file digests. Bundled documentation search and reads explain framework behavior; your project's guidance governs local conventions.

## Edit and check

The default is to edit ordinary working-tree files using your agent's file tools. A baseline records the current files, including earlier local changes. Snapshot validation captures those files and compiles a separate copy, so checking a draft does not rewrite the project. Results identify affected pages, findings, skipped checks, and retained artifacts. A freshness check tells you whether those results still apply after further edits.

Existing checked plan/apply commands remain available for clients that need them. Their digest checks and application protections are preserved.

## Review and release

Compiler checks establish structural validity. They do not establish factual accuracy, clear writing, or a successful reader task. Review the diff, supporting evidence, and rendered documentation before using your project's release process.

Local previews serve the exact captured build and show its freshness. Review reports list task scope, affected HTML/Markdown, findings, checks, and dependencies. The portable authoring skill guides this working-tree workflow. Independent author trials remain a separate release gate. No public package release is claimed here.

## Related reading

### Next steps

- [Check working-tree documentation edits](https://www.shoalrun.com/author/workspace.md) — Discover the project and check a working-tree edit. (Status: experimental.)

### Reference while working

- [Authoring tools commands](https://www.shoalrun.com/author/workspace/commands.md) — Look up discovery, baseline, validation, and freshness commands. (Status: experimental.)

- [Design a writing guide](https://www.shoalrun.com/author/design-writing-guides.md) — Give both people and models useful project writing guidance.

### Go deeper

- [How snapshot validation works](https://www.shoalrun.com/author/agent-workflow.md) — Understand capture coverage, checks, artifacts, and freshness. (Status: experimental.)
