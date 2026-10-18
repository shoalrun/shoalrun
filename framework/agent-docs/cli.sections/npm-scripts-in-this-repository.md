---
id: reference.cli
title: CLI reference
summary: Every shoalrun command, its arguments and defaults, what it prints, and
  when it fails.
type: reference
canonical: /cli
---

# CLI reference

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Reference > CLI reference

**Updated: 2026-10-18.**

Parent page: [Full Markdown page](/cli.md)

The private `@shoalrun/cli` package supplies the `shoalrun` command. It needs Node.js 22.12 or newer. Follow [Getting started](https://www.shoalrun.com/start.md) to install it from GitHub Packages, then run commands as `npx --no-install shoalrun <command>`. Framework contributors can build the source checkout and run `node framework/dist/cli.js <command>` from its root.

Commands that return data print JSON to standard output. On an error, the CLI prints `{"status":"error","message":"..."}` to standard error and exits with code 1. A config argument defaults to `docs.config.yaml` in the current directory unless noted.

[Diagrams](https://www.shoalrun.com/author/components/diagrams.md) render without a browser: Pele handles Mermaid syntax, and D2 handles D2 source. Development installs include Puppeteer for browser UI tests; production package installs do not need it.

## npm scripts in this repository

`npm run docs:format` checks authored page formatting with the repository's Vale policy. `npm run docs:lint` runs the broader prose rules. `npm run docs:check` combines configured project checks, a temporary build, API audits, and local link checks. See [formatting policy](https://www.shoalrun.com/author/templates.md) for customization.

Run the docs scripts from the repository root; run the framework build, demo, and preview scripts from `framework/`.

| Script                        | What it does                                                                                                   |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `npm run build`               | Compiles the TypeScript to `dist/`.                                                                            |
| `npm test`                    | Builds and runs the test suite, which also builds these docs.                                                  |
| `npm run docs:build`          | Builds these docs to `docs/dist/` from the repository root.                                                    |
| `npm run docs:preview`        | Builds and serves these docs at `http://127.0.0.1:8770/`.                                                      |
| `npm run docs:search-preview` | Serves the already built and indexed docs at `http://127.0.0.1:8770/` with the local semantic search endpoint. |
| `npm run docs:dev`            | Watches and serves these docs at `http://127.0.0.1:8770/`.                                                     |
| `npm run docs:vercel`         | Builds these docs as Vercel output.                                                                            |
| `npm run docs:lint`           | Runs Vale on the README, these docs, and `example/content`.                                                    |
| `npm run demo`                | Builds the example project to `example/dist/`.                                                                 |
| `npm run preview`             | Builds and serves the example project.                                                                         |
| `npm run api-preview`         | Builds a preview site from any local OpenAPI file. See below.                                                  |

`preview.mjs` serves `DOCS_PREVIEW_ROOT` (default `example/dist`) on `DOCS_PREVIEW_PORT` (default `8765`) at `127.0.0.1`. It ignores `PORT`.

### Preview a private OpenAPI file

```sh
npm run api-preview -- <openapi-file> <directory> (--all | <operationId>...) [--nav <layout.yaml>]
```

Generates a throwaway project in `<directory>` with one reference page per selected operation, then builds it to `<directory>/site`. It **deletes and rewrites `<directory>/content`**, so use an empty directory outside the repository. The script refuses a directory that has files unless an earlier run created it; each run leaves a `.shoalrun-api-preview` marker file. Serve the result with `DOCS_PREVIEW_ROOT=<directory>/site node preview.mjs`. The optional layout file groups operations in navigation; see [navigation](https://www.shoalrun.com/author/navigation.md).
