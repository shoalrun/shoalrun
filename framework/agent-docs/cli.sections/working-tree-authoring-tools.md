---
id: reference.cli
title: CLI reference
summary: Commands, arguments, defaults, output, and errors.
type: reference
area: authoring
subarea: authoring-command-line
canonical: /cli
---

# CLI reference

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Reference > CLI reference

**Updated: 2026-10-27.**

Parent page: [Full Markdown page](/cli.md)

The private `@shoalrun/cli` package supplies the `shoalrun` command. It needs Node.js 22.12 or newer. Follow [Getting started](https://www.shoalrun.com/start.md) to install it from GitHub Packages, then run commands as `npx --no-install shoalrun <command>`. Framework contributors can build the source checkout and run `node framework/dist/cli.js <command>` from its root.

Commands that return data print JSON to standard output. On an error, the CLI prints `{"status":"error","message":"..."}` to standard error and exits with code 1. A config argument defaults to `docs.config.yaml` in the current directory unless noted.

[Diagrams](https://www.shoalrun.com/author/components/diagrams.md) render without a browser: Pele handles Mermaid syntax, and D2 handles D2 source. Development installs include Puppeteer for browser UI tests; production package installs do not need it.

## Working-tree authoring tools

`docs project` discovers pages, guidance, configuration, navigation, relationships, templates, and findings without selecting a page. `docs source FILE` reads bounded project-relative source passages. Both return JSON and accept `--config FILE`.

`docs baseline --out FILE` records the current working tree. `docs validate` checks a separate capture using a baseline or explicit file/page selectors. `docs validation-status REPORT` checks whether a retained result still applies. `docs review REPORT` presents that snapshot as JSON or Markdown. `docs preview REPORT` serves its exact build locally and returns a browser review URL plus affected HTML/Markdown URLs. These tools make no authoring provider calls and do not apply or publish edits.

See [Authoring tools commands](https://www.shoalrun.com/author/workspace/commands.md) for selectors, budgets, artifact paths, statuses, and check execution limits. Follow [Check working-tree documentation edits](https://www.shoalrun.com/author/workspace.md) for a complete procedure. Existing context/plan/apply commands remain supported.
