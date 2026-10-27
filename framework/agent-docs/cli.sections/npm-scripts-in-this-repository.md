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

**Updated: 2026-10-26.**

Parent page: [Full Markdown page](/cli.md)

The private `@shoalrun/cli` package supplies the `shoalrun` command. It needs Node.js 22.12 or newer. Follow [Getting started](https://www.shoalrun.com/start.md) to install it from GitHub Packages, then run commands as `npx --no-install shoalrun <command>`. Framework contributors can build the source checkout and run `node framework/dist/cli.js <command>` from its root.

Commands that return data print JSON to standard output. On an error, the CLI prints `{"status":"error","message":"..."}` to standard error and exits with code 1. A config argument defaults to `docs.config.yaml` in the current directory unless noted.

[Diagrams](https://www.shoalrun.com/author/components/diagrams.md) render without a browser: Pele handles Mermaid syntax, and D2 handles D2 source. Development installs include Puppeteer for browser UI tests; production package installs do not need it.

## npm scripts in this repository

These scripts belong to Shoalrun's docs repository. Installing `@shoalrun/cli` in another project provides the `shoalrun` command; it does not add these npm scripts. Run the scripts below from the docs repository root.

| Script                             | What it does                                                                                                         |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `npm run docs:build`               | Builds this site to `docs/dist/`.                                                                                    |
| `npm run docs:preview`             | Serves the existing build at `http://127.0.0.1:8770/`. Run `docs:build` first.                                       |
| `npm run docs:dev`                 | Watches the source, builds, and serves the site at `http://127.0.0.1:8770/`.                                         |
| `npm run docs:check`               | Checks the existing build, skills, card icons, recipe compositions, and agent-facing output. Run `docs:build` first. |
| `npm run docs:audit`               | Runs the configured project audit, including a temporary build.                                                      |
| `npm run docs:format`              | Checks formatting in `docs/content` with the repository's Vale policy.                                               |
| `npm run docs:lint`                | Runs the broader prose rules on `docs/content`.                                                                      |
| `npm run docs:vercel`              | Generates the site's Vercel deployment output.                                                                       |
| `npm run deploy:check -- <origin>` | Checks a deployed site's HTTP responses.                                                                             |

See [formatting policy](https://www.shoalrun.com/author/templates.md) to configure prose checks and [deployment checks](https://www.shoalrun.com/publish/deployment-check.md) for the HTTP checker. To document an OpenAPI file in your own project, follow [Add an OpenAPI API](https://www.shoalrun.com/publish/api-references.md) and [Generate and select API pages](https://www.shoalrun.com/api-docs/generate.md).
