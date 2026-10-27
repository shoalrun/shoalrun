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

## Audit a project and API sources

### `check`

```sh
shoalrun check [config] [--json]
```

Run before pushing. Prints a readable PASS/FAIL summary; `--json` prints the structured audit report for CI. With no config argument, discovers `docs.config.yaml` in the current directory or a parent. Runs configured tests, local API checks, a temporary build, focused-contract checks, and local HTML and Markdown link checks. Exits with code 1 if a check fails. Existing site output is preserved. See [local checks](https://www.shoalrun.com/publish/audit.md).

### `audit`

```sh
shoalrun audit [config]
```

Runs the configured project audit, including enabled reference checks, focused contracts, test commands, and evaluation reports. Prints JSON and exits with code 1 when the audit fails. It does not call an authoring model or judge prose claims. See [audit settings](https://www.shoalrun.com/publish/audit.md).

### `api audit`

```sh
shoalrun api audit <openapi-file>
```

Renders every operation in an OpenAPI file. It checks that each operation has a unique `operationId`, that HTML field anchors are unique, and that every named example appears in both HTML and Markdown. Prints counts, sizes, and a `failures` list. Exits with code 1 when anything fails.

### `api import` and `api refresh`

```sh
shoalrun api import https://api.example.com/openapi.yaml --output apis/remote
shoalrun api refresh apis/remote --output apis/remote-next
```

`api import` downloads an HTTPS OpenAPI document and its same-origin relative `$ref` files into a new local snapshot directory. It writes `openapi.yaml`, rewritten local references, and `source-lock.json` with each source URL and SHA-256 digest. Configure `source: { kind: file, path: ./apis/remote/openapi.yaml }` to build from the snapshot without a network request. `api refresh` downloads the same URLs again and reports added, removed, and changed files. If anything changed, it writes a complete new snapshot to `--output` and leaves the current one intact. Without `--output`, it chooses a digest-named sibling directory and reports that path. Point `source.path` to the new directory, run `api review`, and update `publicReview.digest` before a normal build. If nothing changed, no new directory is written.

Imports accept public HTTPS hosts on the standard port. Credentials, URL queries, redirects, cross-origin references, private network addresses, and oversized sources are rejected. A source that needs those features requires a separate, reviewed download into local files.

### `api focused-audit`

```sh
shoalrun api focused-audit <site-directory>
```

Checks every [focused contract](https://www.shoalrun.com/api-docs/focused-contracts.md) in a built site. Each contract must:

- Be OpenAPI 3.0 or 3.1 with `info`.
- Contain exactly one operation, with an `operationId`.
- Use only internal `#/components/` references that resolve, including discriminator mappings.
- Be linked from its page's Markdown twin.
  Prints the contract count, total and largest size, and failures. Exits with code 1 when anything fails.

### `api review`

```sh
shoalrun api review <config-file> --output <local-directory>
```

Builds a local candidate without requiring the current `publicReview.digest`. Its JSON report lists each API's candidate digest, public pages, focused contracts, full-source downloads, and input hashes. Inspect the candidate for private material, then pin the digest in the API config. A normal build fails when the digest is missing or stale. Use a local output directory outside the repository; the candidate can contain sensitive material.

### `api materialize`

```sh
shoalrun api materialize <api-id> <config> (--all | --operation ID | --route "METHOD /path")... [--output content/subdirectory]
```

Writes one-time draft MDX references from a registered local OpenAPI source. Repeat `--operation` and `--route` to select several endpoints; `--all` selects every endpoint and cannot be combined with selectors. `--route` uses an exact uppercase method and OpenAPI path. The default output is `content/api/<api-id>/`, and a custom output must stay inside the configured content directory. The JSON result lists written and skipped files. Existing matching pages are left untouched; conflicting files or unknown selectors stop the command. It does not alter config or navigation. See [Generate and select API pages](https://www.shoalrun.com/api-docs/generate.md) for the review and publishing workflow.

### `api select`

```sh
shoalrun api select <api-id> <config> --output <selection-file>
```

Walks the default publication's OpenAPI operations and asks whether to generate a reference page for each. Answer `y` or `yes`, `n` or `no`, or press Enter to keep the current choice. `q` or `quit` cancels. Any other answer, or the end of input, cancels without writing. When every choice is made, it writes `pathPrefix` and an `include` list to the output file. See [generate and select API pages](https://www.shoalrun.com/api-docs/generate.md).
