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

## Start a project

### `init`

```sh
shoalrun init [directory] [--starter minimal|api-docs]
```

Copies a bundled starter into `directory` (default `.`). `minimal` is the default; `api-docs` includes the fictional Cedar Parcel API, an overview and quickstart, a local OpenAPI file, generated references, search, and a color-mode toggle. Its README explains customization and deployment. Existing unrelated files stay in place, but any destination file collision stops the command before it copies anything. Existing destination directories must be real directories, not symlinks or files. The command prints JSON with the starter, absolute directory, copied files, and the next validate and build commands. Run those commands from the created directory, then replace fixture content and example domains. `init` does not install packages or deploy the site.
