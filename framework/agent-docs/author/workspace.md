---
id: guide.authoring-workspace
title: Check working-tree documentation edits
summary: Discover a project, capture a baseline, edit files, and validate an
  isolated copy.
type: how-to
area: authoring
subarea: authoring-agent-workflows
audiences:
  - authors
subjectLifecycle: experimental
canonical: /author/workspace
---

# Check working-tree documentation edits

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Write with agents > Project tools > Check edits

**Updated: 2026-10-19.**

**Status: Experimental.**

Use this procedure from your documentation project directory, containing `docs.config.yaml`, with `@shoalrun/cli` installed. [Getting started](https://www.shoalrun.com/start.md) explains how to install the private alpha package from GitHub Packages. You need Node.js 22.12 or newer; a framework source checkout and a separate authoring provider key are not required. Your coding agent uses its own model and file tools. Replace the example page path with your project's path.

Framework contributors can instead build the source checkout and run `node framework/dist/cli.js <command>` from its root. The examples below use the installed package.

## Read project guidance

```sh
npx --no-install shoalrun docs project --section guidance --config docs.config.yaml
npx --no-install shoalrun docs project --query "installation" --config docs.config.yaml
npx --no-install shoalrun docs source AGENTS.md --config docs.config.yaml
npx --no-install shoalrun docs search "page metadata" --json
npx --no-install shoalrun docs read guide.frontmatter --json
```

Read applicable instructions and reviewed examples before editing. Discovery works without a selected page. Inspect the findings section when discovery reports findings; follow pagination when a section exceeds its response budget.

## Record the starting files

```sh
npx --no-install shoalrun docs baseline --out .shoalrun/task-baseline.json --config docs.config.yaml
```

Choose a new baseline filename for each task. The baseline includes earlier local edits and untracked files; it compares later changes with this starting state rather than Git HEAD. It runs no checks.

## Edit and validate

Edit ordinary MDX and configuration files using your agent's file tools. Preserve unrelated edits and review changes to identity, navigation, relationships, and publication metadata.

```sh
npx --no-install shoalrun docs validate --baseline .shoalrun/task-baseline.json --config docs.config.yaml
```

For an existing edit without a baseline, declare its scope explicitly:

```sh
npx --no-install shoalrun docs validate --file content/install.mdx --config docs.config.yaml
```

Validation compiles a separate capture. Read the returned status, coverage, findings, skipped checks, and artifact paths. A failure needs correction and another validation. An incomplete or unavailable result needs investigation; it is not a passing result. Configured shell checks require explicit `--run-checks` and your harness's execution authorization.

## Confirm the result still applies

```sh
npx --no-install shoalrun docs validation-status /path/from/result/report.json
```

Use the actual report path returned by validation. A stale result requires another validation.

## Review and preview the snapshot

```sh
npx --no-install shoalrun docs review /path/from/result/report.json --format markdown
npx --no-install shoalrun docs preview /path/from/result/report.json --port 8771
```

The preview command stays running and returns a local review URL plus HTML and Markdown URLs for every affected page that rendered. Open the review URL in your browser. It shows the task baseline, changed files, checks, findings, dependencies, and artifacts. Previewing a failed or incomplete result does not make it pass. A failed compile can leave no site to preview; read its findings with `docs review` first.

The server uses a private copy of the captured build. Each HTML page shows the snapshot status and a link back to the review. Source changes make that preview stale; the displayed content remains the captured version. A baseline contains digests rather than earlier file contents, so retain the task diff with your harness. The report does not attribute all dirty files to your task.

After a revision, stop the preview with Ctrl-C, validate again, and start a preview using the new report path. The server never watches or rebuilds source. Ctrl-C or SIGTERM removes its private serving copy; the validation artifacts remain. Remove only the reported validation artifact directory when finished. A forced process kill can leave the serving copy behind; its path is in the startup result.

Review facts, examples, supporting sources, and the task diff before accepting the edit. Use your normal review and publication process afterward.

## Related reading

### Read first

- [Authoring tools for your coding agent](https://www.shoalrun.com/author/agent-overview.md) — Understand how your coding agent uses Shoalrun tools and human review. (Status: experimental.)

### Reference while working

- [Authoring tools commands](https://www.shoalrun.com/author/workspace/commands.md) — Look up discovery and snapshot validation commands. (Status: experimental.)

- [Example writing guide](https://www.shoalrun.com/author/writing-style.md) — Review the example guidance before approving a writing plan.

### Related topics

- [Apply a checked edit plan](https://www.shoalrun.com/author/authoring-agent.md) — Use the checked edit commands with your existing coding agent. (Status: experimental.)
