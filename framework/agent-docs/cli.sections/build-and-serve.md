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

## Build and serve

### `build`

```sh
shoalrun build [config] [output] [--source-commit SHA] [--release-label LABEL]
```

Compiles the site. `output` defaults to `site-dist`. Prints `{ "status": "ok", "documents": <count>, "operations": <count> }`.

The build writes to a temporary directory, then **deletes `output` and replaces it**. Don't point it at a directory with other files. The build stops before deleting anything if `output` contains the project or content directory, sits inside the content directory, or holds a file the build reads. It also writes the [frontmatter reference](https://www.shoalrun.com/author/frontmatter-reference.md) to `.shoalrun/` beside the config; add `.shoalrun/` to `.gitignore`.

Every build writes `/build-info.json` with the build ID and resolved config digest. `--source-commit` adds a full 40- or 64-character Git commit hash; `--release-label` adds a short, public release name. The command uses only the values you pass. Neither flag selects a publication or deployment destination. See [use Git branches for separate docs sites](https://www.shoalrun.com/publish/revisions.md).

### `docs changes`

```sh
shoalrun docs changes CURRENT-SNAPSHOT --since PREVIOUS-SNAPSHOT
```

Compares two local `documents.sync.json` files and prints JSON with build IDs, `buildChanged`, `metadataChanged`, and `added`, `changed`, and `removed` page records. Page identity includes its publication variant. The command validates both snapshots and rejects unsupported schema versions, invalid records, and duplicate identities. It reads files only; it does not fetch pages or modify a cache. Keep saved snapshots outside the replaced build directory. See [incremental sync](https://www.shoalrun.com/publish/output.md).

### `serve`

```sh
shoalrun serve <site-directory> [--host HOST] [--port PORT]
```

Serves a built site. `--host` defaults to `127.0.0.1`. The port comes from `--port`, then the `PORT` environment variable, then `8765`. The server:

- Returns the Markdown twin when a request asks for `text/markdown`. See [content negotiation](https://www.shoalrun.com/publish/content-negotiation.md).
- Applies `redirects.json` and the content types in `resource-headers.json`.
- Sends `/` to the home page when no page has the slug `/`: the page with ID `guide.overview`, then `/reference`, then the first page.
- Adds a trailing slash to page paths with a 301, and returns a plain-text 404 for missing files.

It serves plain HTTP with no compression or cache headers. To host it publicly, bind a public `--host` such as `0.0.0.0` and put a TLS proxy in front.

### `dev`

```sh
shoalrun dev [config] [output] [--port PORT]
```

Builds the project, serves it at `127.0.0.1:8765` by default, watches the directory containing the config, and refreshes open pages after a successful rebuild. `output` defaults to `site-dist`; `--port` overrides `PORT`. A failed rebuild prints its error and keeps serving the last successful build. Fix the source to trigger another build. Restart the command after changing framework TypeScript or files outside the config directory. Also restart after editing a `metadata.provider` module or a custom highlighting module, because Node loads each module once.

### `search`

```sh
shoalrun search <site-directory> <query> [--channel C] [--version V] [--language L] [--limit N]
```

Searches a built site's `search-index.json` without a server. Quote queries with spaces. It returns JSON with the selected publication, total matches, and up to eight ranked results by default. Each result includes a page ID, HTML URL, Markdown URL, title, summary, type, score, and a short body excerpt. A section match links to its heading in the HTML URL.

```sh
shoalrun search docs/dist "nullable response" --limit 5
```

If the index contains multiple publications, select one with `--channel`, `--version`, and `--language`. The CLI refuses to mix them. `--limit` accepts 1 through 100. Build with the default lexical search provider, or enable `index: true` for a custom provider. The command reports a missing index instead of rebuilding the site.

### `docs search` and `docs read`

```sh
shoalrun docs search "configure navigation"
shoalrun docs read guide.navigation-lifecycle --json --max-tokens 4096
shoalrun docs search "search provider" --site docs/dist --limit 5
```

These commands use Shoalrun's bundled documentation by default. Pass `--site DIRECTORY` to search or read a built site's own documentation instead. `docs search` prints JSON results with document IDs and excerpts; `docs read` prints generated Markdown, or structured page data with `--json`. Both accept `--max-tokens` (default 4096; range 256–100000) and publication selectors `--channel`, `--version`, and `--language`. Search also accepts `--limit` (default 8; range 1–100). JSON results include `budget` metadata; plain Markdown reads report truncation on standard error. Increase the budget when a page is truncated. They need no project config, site build, browser, network, or agent-specific protocol. An agent can search for a task, read the matching page, and then run the ordinary project commands. The bundled docs are generated from this site's sources and checked against the self-doc build in the test suite.

### `docs mcp`

```sh
shoalrun docs mcp
shoalrun docs mcp --site docs/dist
```

Starts a read-only MCP server over stdio. The default source is the bundled Shoalrun docs; `--site` selects a built site. The server exposes `search_docs`, `get_page`, `get_outline`, and `get_section`. They share the search/read core and token budgets with the CLI. Standard output is reserved for protocol messages. See [connect an MCP client](https://www.shoalrun.com/publish/mcp.md).

Documentation search/read errors use `{ "status": "error", "error": { "code": "...", "message": "..." } }`. Codes distinguish `invalid_input`, `unknown_page`, `missing_index`, and `internal_error`. JSON mode sends errors to standard output and exits 1; plain reads send errors to standard error. Other commands retain the general CLI error shape described above.

### `eval prepare`, `eval check`, `eval snapshot`, and `eval compare`

```sh
shoalrun eval prepare <site-directory> --tasks FILE --out REPORT
shoalrun eval check <site-directory> --tasks FILE --report REPORT
shoalrun eval snapshot <site-directory> > SNAPSHOT.json
shoalrun eval compare CURRENT.json --since PREVIOUS.json
```

`prepare` reads a YAML or JSON task file and writes a JSON report template for the built documentation. All tasks start skipped, runner details are unrecorded, and review is null. Existing report files are never overwritten. The command does not execute tasks or grade answers.

`check` validates a completed report against the current task definitions and built output. It prints JSON findings and outcomes, and exits 1 for stale reports, malformed data, invalid citations, incomplete judgments, or required tasks that did not pass. A missing report is a reported failure. Invalid tasks or an unreadable site fail before a report can be produced. See [evaluate agent tasks](https://www.shoalrun.com/publish/evals.md) for the schemas and audit hook.

`snapshot` prints a JSON file inventory and exact-output digest. `compare` validates two inventories and lists added, changed, and removed paths; it exits 1 when builds differ or inputs are invalid. These commands diagnose freshness without running or approving an evaluation. New report templates also include the inventory, so a stale report can show file differences in `details.buildChanges`.

### `vercel build`

```sh
shoalrun vercel build [config] [output] [--source-commit SHA] [--release-label LABEL] [--chat]
```

Writes a Vercel Build Output API directory. `output` defaults to `.vercel/output`. It accepts the same public build provenance flags as `build` and includes `/build-info.json` in the static output. `--chat` adds the optional hosted chat function; the build fails if you request it and the function cannot be added. See [Publish on Vercel](https://www.shoalrun.com/publish/vercel.md) and [Host the chat on Vercel](https://www.shoalrun.com/chat/host.md).
