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

**Updated: 2026-10-24.**

The private `@shoalrun/cli` package supplies the `shoalrun` command. It needs Node.js 22.12 or newer. Follow [Getting started](https://www.shoalrun.com/start.md) to install it from GitHub Packages, then run commands as `npx --no-install shoalrun <command>`. Framework contributors can build the source checkout and run `node framework/dist/cli.js <command>` from its root.

Commands that return data print JSON to standard output. On an error, the CLI prints `{"status":"error","message":"..."}` to standard error and exits with code 1. A config argument defaults to `docs.config.yaml` in the current directory unless noted.

[Diagrams](https://www.shoalrun.com/author/components/diagrams.md) render without a browser: Pele handles Mermaid syntax, and D2 handles D2 source. Development installs include Puppeteer for browser UI tests; production package installs do not need it.

## Start a project

### `init`

```sh
shoalrun init [directory] [--starter minimal|api-docs]
```

Copies a bundled starter into `directory` (default `.`). `minimal` is the default; `api-docs` includes the fictional Cedar Parcel API, an overview and quickstart, a local OpenAPI file, generated references, search, and a color-mode toggle. Its README explains customization and deployment. Existing unrelated files stay in place, but any destination file collision stops the command before it copies anything. Existing destination directories must be real directories, not symlinks or files. The command prints JSON with the starter, absolute directory, copied files, and the next validate and build commands. Run those commands from the created directory, then replace fixture content and example domains. `init` does not install packages or deploy the site.

## Build and serve

### `build`

```sh
shoalrun build [config] [output] [--source-commit SHA] [--release-label LABEL]
```

Compiles the site. `output` defaults to `site-dist`. Prints `{ "status": "ok", "documents": <count>, "operations": <count> }`.

The build writes to a temporary directory, then **deletes `output` and replaces it**. Don't point it at a directory with other files. The build stops before deleting anything if `output` contains the project or content directory, sits inside the content directory, or holds a file the build reads. It also writes the [frontmatter reference](https://www.shoalrun.com/author/frontmatter-reference.md) to `.shoalrun/` beside the config; add `.shoalrun/` to `.gitignore`.

Every build writes `/build-info.json` with the build ID and resolved config digest. `--source-commit` adds a full 40- or 64-character Git commit hash; `--release-label` adds a short, public release name. The command uses only the values you pass. Neither flag selects a publication or deployment destination. See [use Git branches for separate docs sites](https://www.shoalrun.com/publish/revisions.md).

### `export`

```sh
shoalrun export [config] --out DIRECTORY [--target NAME]
  [--format markdown|html|both] [--document ID]...
  [--channel C --version V --language L] [--public-base /help/] [--review]
```

Exports whole public pages from source as resolved Markdown and passive HTML fragments, with a versioned manifest, referenced assets, and notices. No navigation, facets, website theme, or prior website build is required. `--out` is required. Without `--target`, the command exports all eligible pages in one enabled publication; select all three publication coordinates when more than one is enabled. `--document` can be repeated. Command options override the named target's formats, document selection, publication, and public base.

Named targets live under `exports` in the project config. Their optional page-facet filter is independent of `site.contentFilter` and navigation. Public access, enabled publication, and language still determine eligibility. Invalid selections and missing link or asset dependencies fail before a previous export is replaced. An unrelated nonempty destination or a source directory cannot be replaced.

The command prints JSON with status, absolute output directory, publication, formats, document count and IDs, asset count, bundle digest, API review digests, and diagnostics. `--review` can write a candidate with `status: needs-review` and exit code 2. Pin the reviewed digests and repeat the normal command before distributing it. See [export content into an application](https://www.shoalrun.com/publish/content-export.md) for target fields, output contracts, and the help-drawer example.

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

## Author pages

### `scaffold`

Short form, from inside a project:

```sh
shoalrun scaffold <template> -n <target-file> [options]
```

For example, `shoalrun scaffold guide -n content/pagination.mdx` uses the built-in `guide` template and derives the page ID `guide.pagination`.

Explicit form:

```sh
shoalrun scaffold <template> <config> <target-file> --id ID --title TITLE --summary SUMMARY --slug SLUG [options]
```

The short form finds `docs.config.yaml` in the current directory or a parent, and derives the ID, title, summary, and slug from the target path. `--new` is the same as `-n`.

| Option                                   | Meaning                                                                                                                                  |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `--config FILE`                          | Config file to use (short form only).                                                                                                    |
| `--id`, `--title`, `--summary`, `--slug` | Page values. Required in the explicit form; they override derived values in the short form.                                              |
| `--channel`, `--version`, `--language`   | Publication. Defaults come from `publications.defaults`; the combination must be enabled.                                                |
| `--operation ID`                         | A stable operation ID for the page. Repeat it for several. It must be an operation declared in `apis.*.operations`, not a generated one. |

The target must be a `.md` or `.mdx` file inside the content directory, and must not exist yet. The slug must start with `/`. The new page has draft access. Prints the template, page ID, file path, publication, and access. See [templates](https://www.shoalrun.com/author/templates.md) for how values are derived.

### `docs context`, `docs plan`, and `docs apply`

These commands support a reviewable edit to existing pages and loaded YAML config files:

```sh
shoalrun docs context guide.welcome [--config docs.config.yaml]
shoalrun docs plan --request-file edit-request.json --out edit-plan.json [--config docs.config.yaml]
shoalrun docs apply edit-plan.json [--config docs.config.yaml] --check
shoalrun docs apply edit-plan.json [--config docs.config.yaml]
```

`docs context` reports a stable page ID's authored sources and digests, navigation placements, relationships, and configuration owners. It also returns configured authoring directives and guide and exemplar paths. It does not return a generated API reference as an authored page.

The request file contains full replacement text for each existing file, relative to the project config directory:

```json
{
  "edits": [
    { "file": "content/welcome.mdx", "content": "---\nid: guide.welcome\n...\n---\n\nRevised page text.\n" }
  ]
}
```

`docs plan` records the exact replacements and a SHA-256 digest of each original file. Each request edit can also include `baseDigest`, the lowercase SHA-256 digest of the UTF-8 source text used to write the candidate. If the current source differs, planning fails. Include this digest from the source your agent read before drafting. It refuses to overwrite an existing plan. The plan can be reviewed as JSON or with a diff tool. Edits can replace existing `.md`/`.mdx` files in the content directory and YAML files loaded by the config. Symlink targets and paths outside the project are rejected.

`docs apply --check` verifies the original digests, copies the project to a temporary directory, inserts the proposed text, and builds the candidate site. It reports affected published document IDs and routes without changing the source. Run `docs apply` without `--check` to repeat validation and write the files. A stale digest or failed build stops the write. The command does not run configured `audit.tests`, commit, deploy, or establish that technical claims are correct. Run `shoalrun audit` and review the rendered pages before publication.

### `ingredient draft` and `recipe draft`

```sh
shoalrun ingredient draft --spec FILE --out FILE [--config FILE] [--check]
shoalrun recipe draft --spec FILE --out FILE [--config FILE] [--check]
```

`ingredient draft` takes a spec naming one explicitly configured API operation and a named inline request example. It copies the generated cURL request and first inline 2xx response example into a draft `type: ingredient` page. It supports outgoing requests in the default publication. `recipe draft` takes a project-owned spec with ordered ingredient file paths and assembles a draft `type: recipe` page for a customer goal. It rejects duplicate ingredient IDs and publication mismatches. Ingredients can declare `workflow.inputs`, `workflow.outputs`, `workflow.prerequisites`, and `workflow.check`; recipe specs can declare initial `inputs` and a final `outcome`. The assembler checks handoffs, rejects missing inputs and duplicate output names, and includes shared prerequisites once. Neither command executes a request or uses a model. See [assemble recipes from ingredients](https://www.shoalrun.com/author/recipe-drafts.md) for YAML fields and review workflow.

With `--check`, either command prints the proposed MDX and reports `would-create`, `unchanged`, or `would-change`; it writes nothing and does not build a preview. Without it, the command creates the output file and refuses to overwrite an existing one. A person or agent finishes and verifies the complete recipe before publication.

## Inspect config and operations

These commands print configuration and API operation details for inspection.

| Command                                                                               | Prints                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shoalrun config validate [config]`                                                   | `status`, the config `digest`, the number of files read, and a `contrast` result for the palette and modes the site shows. Fails with the build's contrast messages when a color pair fails. |
| `shoalrun config resolve [config]`                                                    | The fully merged config `value`, its `digest`, and the list of files read.                                                                                                                   |
| `shoalrun config graph [config]`                                                      | The root file and every file it includes or extends.                                                                                                                                         |
| `shoalrun config explain <key> [config]`                                              | The value at a dotted key, such as `site.title` or `navigation.0.id`, the file that set it, and the files it overrode.                                                                       |
| `shoalrun operation inspect <id> [config] [--channel C] [--version V] [--language L]` | Each publication where a stable operation ID has a reference page.                                                                                                                           |

`operation inspect` compiles the whole project without writing a site. When the operation isn't found in the selected publications, it prints `"status": "missing-variant"` and still exits with code 0. Put flags after the optional config path. An unknown or repeated flag fails before the project is compiled.

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

## Search and chat

These commands are optional. They read a site you have already built, and a normal `shoalrun build` never runs them. See [Search and chat](https://www.shoalrun.com/search-and-chat.md) for the distinctions between site search, passage retrieval, and answers.

### `index`

```sh
shoalrun index <site-directory> [--embed [--config FILE] [--provider voyage|openai] [--model MODEL] [--dimension N] [--base-url URL] [--key-env NAME]]
```

Optional. Run it after `shoalrun build`. The build doesn't need it, and skipping it changes nothing about your site. It splits a built site into passages and writes `ai/chunks.json` in that directory. It reads `documents.json`, each page's Markdown twin, and `search-index.json` when present, and replaces any earlier file. It prints JSON with the page count, passage count, and output path. It fails when the directory has no `documents.json`, or when a page's Markdown path leaves the site directory.

Without `--embed`, the command makes no network requests. With `--embed`, it also sends each passage to an embedding API and writes `ai/embeddings.json` and `ai/embeddings.bin`. Shoalrun has no default provider or model. The [`retrieval.embeddings`](https://www.shoalrun.com/chat/settings.md) setting in your config chooses them. The command finds `docs.config.yaml` in the current directory or a parent, or you can name a file with `--config`. The flags override the config. Pass both `--provider` and `--model` and the command needs no config at all.

| Option        | Value                                                                                                                                                                       |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--provider`  | `voyage` reads `VOYAGE_API_KEY`. `openai` calls OpenAI's embeddings API, or any server that copies it, such as Ollama, vLLM, or a LiteLLM proxy. It reads `OPENAI_API_KEY`. |
| `--model`     | The embedding model ID.                                                                                                                                                     |
| `--dimension` | The vector size. Voyage accepts 256, 512, 1024 (the default), or 2048. Other models need it unless Shoalrun knows the model's size.                                         |
| `--base-url`  | `openai` only. An OpenAI-style server, such as `http://localhost:11434/v1` for Ollama. The default is `https://api.openai.com/v1`.                                          |
| `--key-env`   | The name of the environment variable that holds the key. Servers on `localhost` need no key.                                                                                |

All embedding options need `--embed`. A rerun embeds only passages whose text changed. The JSON summary then adds an `embeddings` object with the model, dimension, and counts of embedded and reused passages.

See [Passage index](https://www.shoalrun.com/chat/passage-index.md) for the chunking rules and file formats.

### `serve --search`

```sh
shoalrun serve <site-directory> --search --config docs.config.yaml [--port PORT]
```

Optional local preview for a custom browser search provider. Run `shoalrun build` and `shoalrun index` first. The server adds `/__shoalrun/search`, which returns page and section links from lexical passage retrieval or combines it with semantic retrieval when current vectors exist. It reads query embedding settings from `retrieval.embeddings` and the key from the environment. It runs only on a loopback address and accepts same-origin JSON requests. It does not add the chat panel or call a chat model. A site needs a [custom provider](https://www.shoalrun.com/author/search.md) to call the endpoint; the built-in search provider continues to use `/search-index.json`.

The local `serve --search` command is a preview server. The optional Vercel `--chat` build packages the same search handler as `/__shoalrun/search`, alongside `/__shoalrun/ask`, with shared rate and embedding budgets.

### `ask`

```sh
shoalrun ask <site-directory> "<question>" [--config FILE] [--model MODEL] [--passages N] [--reader-view FACET=CHOICE[,CHOICE]]... [--channel C --version V --language L] [--no-rerank] [--no-direct] [--no-escalate] [--no-cards] [--json]
```

Optional. It answers one question from your built docs, with citations. It needs a site that you have run [`shoalrun index`](#index) on, and a [`chat`](https://www.shoalrun.com/chat/settings.md) section in your config. The build doesn't need any of this, and skipping it changes nothing about your site. Quote the question.

The command searches the passages, using vector search too when the site has vectors, and optionally reorders the best results with Jev. Then it decides. If the docs don't cover the question, it says so and makes no call to the model. Otherwise it sends the best passages to the model and prints the answer, followed by a `Sources` list. Each source is a passage the answer cites, with a link. A citation to a passage that wasn't sent is removed, and an answer with no citation prints a warning on standard error. Text in the passages is treated as untrusted and can't instruct the model. Code that isn't in the passages, and sentences that the cited docs don't support, are listed as notes. See [How an answer is checked](https://www.shoalrun.com/chat/checks.md).

Standard error also shows how the answer was made: the search mode, the decision, the Jev score, the model, the tokens, and the time. Any layer that failed, such as Jev or the query embedding, is listed as a note, and the answer falls back to plain search. `--json` prints the full result as JSON instead, including every passage the model saw and the support score of every checked sentence.

| Option                                 | Value                                                                                        |
| -------------------------------------- | -------------------------------------------------------------------------------------------- |
| `--config`                             | The config to read. The default is `docs.config.yaml` in the current directory or a parent.  |
| `--model`                              | Overrides `chat.model`.                                                                      |
| `--passages`                           | Overrides `chat.passages`.                                                                   |
| `--reader-view`                        | Overrides `chat.readerView`, as `facet=choice[,choice]`. Repeat it for more than one filter. |
| `--channel`, `--version`, `--language` | The publication to search. Needed only when the site has more than one.                      |
| `--no-rerank`                          | Skips Jev even when `chat.rerank` is set.                                                    |
| `--no-direct`                          | Always uses the model, even when `chat.direct` would show an excerpt.                        |
| `--no-escalate`                        | Skips the escalation model even when `chat.escalate` is set.                                 |
| `--no-cards`                           | Skips answer cards even when `chat.cards` is set.                                            |
| `--json`                               | Prints the result as JSON.                                                                   |

The command answers one question at a time. It reads `OPENAI_API_KEY`, or the variable that `chat.keyEnv` names, and `JEV_API_KEY`, or the variable that `chat.rerank.keyEnv` names, when you use a scorer. It fails with a clear message when the chat section, the chat key, or `ai/chunks.json` is missing. Without the scorer's key, the scorer counts as down, as [chat settings](https://www.shoalrun.com/chat/settings.md) explain.

### `answers`

```sh
shoalrun answers <site-directory> --questions FILE [--config FILE] [--model MODEL] [--reader-view FACET=CHOICE[,CHOICE]]...
```

Optional. It builds [answer cards](https://www.shoalrun.com/chat/prepared-answers.md) from a list of questions and writes `ai/answers.json`. The list is YAML or JSON: plain strings, or mappings with `question` and `aliases`. It needs a site that you have indexed with `--embed`, and the same `chat` config as `ask`. This build step uses embeddings and the configured scorer. It calls the chat model for questions that pass the coverage gate. It never reuses a direct excerpt or another card. It embeds kept questions and aliases, then keeps only answers that passed every check. It prints JSON with the number of cards, the questions it skipped and why, and the output path. It replaces any earlier file, so keep the question list in your repository and rerun it after the docs change.

### `ask-log`

```sh
shoalrun ask-log (<log-file> | --kv --config FILE [--days N]) [--min-repeats N] [--limit N] [--cards-out FILE] [--json]
```

Optional. It reads a log made by `serve --ask --log` and prints the report described in [Keep a record of questions](https://www.shoalrun.com/chat/host.md). `--limit` sets how many rows each list shows, and `--json` prints the full report as JSON.

### `chat`

```sh
shoalrun chat pause|resume|status --config FILE
```

Optional. It switches a hosted chat off and on through the store that `chat.budget.store` names. See [Turn the chat off](https://www.shoalrun.com/chat/host.md).

### `serve --ask`

```sh
shoalrun serve <site-directory> --ask [--config FILE] [--model MODEL] [--log FILE] [--public-preview] [--reader-view FACET=CHOICE[,CHOICE]]... [--port PORT]
```

Optional. It serves a built and indexed site with a local chat panel, so you can try `shoalrun ask` in a browser. An **Ask** button appears on every page, and the panel keeps the conversation so follow-up questions work. Each answer has a "How this answer was made" line with the search mode, the decision, the Jev score, the tokens, and the time. A sentence that fails the claims check, or code that isn't in the docs, appears under the answer as a warning.

`--public-preview` shows the reader-facing panel with the recording notice and a Turnstile check using Cloudflare's test keys. Answers still use your configured model and API credits; counters remain in memory.

This is a local preview and nothing more:

- It runs only on a loopback address (`127.0.0.1`, `localhost`, or `::1`), because every question spends your API credits. It refuses `--host 0.0.0.0` and any other address.
- `serve --ask` adds the panel and the `/__shoalrun/ask` endpoint for local preview. `shoalrun vercel build --chat` adds the hosted panel and function. Ordinary `build` and `dev` do not add chat.
- The endpoint refuses requests from other web sites and from unknown host names, requires JSON, caps the request size, and allows 20 questions a minute.

It reads the same `chat` and `retrieval` config as `ask`, and the keys from the environment. Stop it with the usual interrupt.

## Working-tree authoring tools

`docs project` discovers pages, guidance, configuration, navigation, relationships, templates, and findings without selecting a page. `docs source FILE` reads bounded project-relative source passages. Both return JSON and accept `--config FILE`.

`docs baseline --out FILE` records the current working tree. `docs validate` checks a separate capture using a baseline or explicit file/page selectors. `docs validation-status REPORT` checks whether a retained result still applies. `docs review REPORT` presents that snapshot as JSON or Markdown. `docs preview REPORT` serves its exact build locally and returns a browser review URL plus affected HTML/Markdown URLs. These tools make no authoring provider calls and do not apply or publish edits.

See [Authoring tools commands](https://www.shoalrun.com/author/workspace/commands.md) for selectors, budgets, artifact paths, statuses, and check execution limits. Follow [Check working-tree documentation edits](https://www.shoalrun.com/author/workspace.md) for a complete procedure. Existing context/plan/apply commands remain supported.

## Related reading

### Related topics

- [Configuration reference](https://www.shoalrun.com/config.md) — Build, serve, and inspect a config from the command line.
