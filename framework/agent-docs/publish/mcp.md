---
id: guide.mcp
title: Connect an MCP client
summary: Connect read-only MCP clients over stdio or HTTP to search and read
  built documentation.
type: how-to
area: discovery
subarea: discovery-mcp
canonical: /publish/mcp
---

# Connect an MCP client

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > MCP > Connect an MCP client

**Updated: 2026-10-19.**

Connect an MCP client to built documentation through four read-only tools. Use stdio for a client-launched local process, or enable an HTTP endpoint on Node or in a generated Vercel function. Both use the same search and Markdown reading core.

The HTTP endpoint currently supports one explicitly selected public publication. The generated Vercel endpoint is deployed and verified on this site. Netlify and Cloudflare adapters are not implemented. Analytics is off by default; an optional [server adapter](https://www.shoalrun.com/publish/mcp-analytics.md) can measure tool calls.

You need Node.js 22.12 or newer, a built copy of Shoalrun, and a client that supports MCP stdio or Streamable HTTP. The compiler and CLI are still a private prototype; there is no public package to install yet.

## Why offer MCP for public docs?

MCP gives tool-capable agents a predictable way to search your docs and request a page or section within a token budget. For example, an agent answering “How do I configure analytics?” can search and follow the returned read instruction. The result includes relevant Markdown, its publication, and a source link.

The documentation can already be public. MCP adds a tool interface; it does not grant access that public Markdown lacks. Agents that can fetch and search your Markdown may not need it. Offer both when your readers use MCP clients, and check whether the tools help them find answers with fewer requests or less content.

To use Shoalrun's own live documentation endpoint, follow [use this site's MCP](https://www.shoalrun.com/connect/mcp.md). The setup below is for hosting your own project's tools.

## Serve a public endpoint on Node

Use this procedure when agents should connect to a URL instead of launching the CLI themselves. Analytics is not enabled by this setting.

1. ### Enable a public publication

   Add the endpoint and the exact channel, version, and language to your project config. The selected publication must contain public pages:

   ```yaml title="docs.config.yaml"
   mcp:
     enabled: true
     access: public
     path: /mcp
     publication: { channel: production, version: current, language: en }
   ```

   The endpoint supplies those publication coordinates when the client omits them. Requests for a different publication are rejected. Its lexical search index is generated even if browser search is disabled.

2. ### Build and serve the site

   With the CLI available as `shoalrun`, build the output and start the Node server:

   ```sh
   shoalrun build docs.config.yaml dist
   shoalrun serve dist --port 8774
   ```

   The server reads the MCP settings from that build. It does not need the source config. With no site base path, the local endpoint is `http://127.0.0.1:8774/mcp`; a base path such as `/docs` makes it `/docs/mcp`.

   Set `mcp: false` or remove the setting and rebuild to disable the endpoint. Restart a non-watching server after replacing its build; watched preview reloads settings with each successful build.

3. ### Connect and check the tools

   Add the endpoint URL in your client’s remote MCP settings. The client should discover the four tools listed below. Search for a known page, then follow the returned read instruction and verify its publication.

   The SDK integration is tested with legacy and automatic protocol negotiation using MCP TypeScript client version `2.2.0`. Compatibility with a specific desktop client or public host still needs its own check.

### Hosts, origins, and limits

Local connections permit the configured loopback host. For a public Node deployment, `site.origin` supplies a trusted hostname and browser origin. Add explicit `mcp.allowedHosts` hostnames for other domains and `mcp.allowedOrigins` origins for browser-based clients. Forwarded host headers are not trusted. Native clients do not need an Origin header.

The endpoint accepts JSON MCP requests through POST; it does not provide a persistent session or standalone event stream. GET and DELETE return 405. Browser preflight uses OPTIONS.

Limits are 64 KiB per request, eight concurrent requests per handler, and a 15-second deadline. Excess concurrent requests return 429 with retry guidance. Tool token budgets still apply. These are process-local controls; configure deployment-level limits before exposing a public service. This is a public endpoint, not an authentication mechanism for private documentation.

## Generate a Vercel endpoint

With the public MCP configuration above, generate deployment output from your project:

```sh
shoalrun vercel build docs.config.yaml .vercel/output
```

No extra MCP flag, Ask configuration, embeddings, or model key is required. The command packages the four tools and their selected public documentation in a Node function at the configured endpoint. Internal runtime files stay out of the public static output. Follow [Publish on Vercel](https://www.shoalrun.com/publish/vercel.md) to deploy the complete output directory.

The function trusts `site.origin`, explicit allowed hosts, and Vercel’s reserved deployment host variables. It does not trust arbitrary forwarded hosts or other projects’ preview domains. Deployment protection may block an MCP client from reaching a preview; check that host setting if a client cannot connect.

Returned Markdown links use the URLs generated at build time. Set the intended origin before building; request headers do not rewrite the documentation identity. Per-instance limits are not global deployment limits. Configure host-level traffic controls before opening a public endpoint.

Local package tests cover SDK clients and the generated function. Read-only SDK calls have also been verified at this site’s production Vercel endpoint. Named desktop-client checks remain separate.

## Choose the documentation source

From `framework/`, start a server for Shoalrun's bundled documentation:

```sh
node dist/cli.js docs mcp
```

For your site's documentation, build it first and pass the output directory. The following example runs from the repository root:

```sh
node framework/dist/cli.js build docs/docs.config.yaml docs/dist
node framework/dist/cli.js docs mcp --site docs/dist
```

Search needs `search-index.json`; page reads need `documents.json` and the generated Markdown files. The server does not rebuild the site or fetch remote pages. Rebuild after editing your site's sources. The shared core reads the built files on each call.

## Configure the client

Enter a stdio server command and arguments in your client's MCP settings. For this checkout, use absolute paths so the client's working directory does not affect resolution:

```json
{
  "command": "node",
  "args": [
    "/absolute/path/to/shoalrun/framework/dist/cli.js",
    "docs",
    "mcp",
    "--site",
    "/absolute/path/to/shoalrun/docs/dist"
  ]
}
```

This is the server entry; the surrounding configuration differs by client. Omit `--site` and its directory to use the bundled Shoalrun docs. Once the CLI is linked or installed locally, the command can instead be `shoalrun` with arguments `docs`, `mcp`, and the optional site selection.

Standard output contains only MCP protocol messages. Diagnostics go to standard error. The process waits for requests and exits when the client closes its input.

## Search, then read

Ask the client to discover the server's tools. It should find:

| Tool          | Required input  | Optional inputs                                        | Result                                                              |
| ------------- | --------------- | ------------------------------------------------------ | ------------------------------------------------------------------- |
| `search_docs` | `query`         | `limit`, `maxTokens`, `channel`, `version`, `language` | Ranked document IDs, links, summaries, and excerpts.                |
| `get_page`    | `id`            | `maxTokens`, `channel`, `version`, `language`          | The page's generated Markdown and publication metadata.             |
| `get_outline` | `id`            | `maxTokens`, `channel`, `version`, `language`          | Top-level section IDs, fetch URLs, digests, and sizes.              |
| `get_section` | `id`, `section` | `maxTokens`, `channel`, `version`, `language`          | One complete section with parent context and nested reader content. |

For example, call `search_docs` with `{"query":"search provider","limit":5,"maxTokens":2048}`, choose a result, and call its `read.tool` with its `read.arguments` exactly. Choose a publication when the index or document ID spans multiple channels, versions, or languages. The server refuses to mix publications.

Search uses the same lexical ranking as the CLI. Titles, summaries, and headings are searchable; article text is bounded. See [search index coverage](https://www.shoalrun.com/author/search.md). The page tool returns generated Markdown, including all reader-marked sections. Reader views remain visibility controls, not access controls.

Search supplies the next call: `read.tool` is `get_section` for a unique matching section, or `get_page` otherwise. Its arguments include the ID, publication, section ID when needed, and a token budget based on the indexed size. Do not guess section IDs or call `get_outline` first. Check `budget.truncated` after a page read and increase the budget if needed.

The result's `markdownUrl` fetches the recommended content directly; `pageMarkdownUrl` always fetches the full page. Use the full page when the section does not answer the question or needs more context. Search prefers the full page for short documents, broad queries, ambiguous headings, or queries spanning multiple sections. Search normally prefers complete lexical matches. With no complete match, results within one meaningful term of the best coverage (at least two matched terms) rank by non-filler field score first. A stronger result missing one meaningful term can outrank complete matches found only in body text; `matchMode: mixed` identifies that case. See [search ranking](https://www.shoalrun.com/author/search.md). A section recommendation also requires an explicit author declaration that its content and repeated introduction are self-contained. Undeclared sections use full-page reads, including indexes built before this declaration existed. The compiler checks heading identity, not prerequisite completeness. `get_outline` remains available for deliberate browsing. Retain publication coordinates and parent/section digests for citations. See [section resources](https://www.shoalrun.com/author/markdown-metadata.md).

## Check budgets and errors

All tools default to `maxTokens: 4096` and accept 256 through 100000. Search defaults to eight results; `limit` accepts 1 through 100.

Successful results include `budget.maxTokens`, `budget.encoding`, `budget.tokens`, and `budget.truncated`. The budget covers the serialized JSON tool payload, including page or search metadata, using the `cl100k_base` tokenizer. `tokens` is a conservative count for that payload. It does not include the MCP envelope or the client's own prompts, and other models can tokenize the same text differently. MCP returns the payload as both text and structured data; the budget applies to one payload, rather than both copies together.

Search drops lower-ranked results to fit. Page reads return a prefix of the Markdown; that prefix can end inside a section or code block. Check `truncated`, then increase the budget if needed. Outline and section reads instead require the complete result to fit; they never truncate code blocks. There is no pagination yet. For pages larger than the maximum budget, fetch their published Markdown directly. If even the metadata cannot fit, the tool reports `invalid_input`.

| Error code        | Meaning                                                      | Next action                                       |
| ----------------- | ------------------------------------------------------------ | ------------------------------------------------- |
| `invalid_input`   | Empty query or ID, invalid budget, or ambiguous publication. | Correct the input or choose a publication.        |
| `unknown_section` | Section ID is absent from the selected page.                 | Request its current outline.                      |
| `unknown_page`    | The stable ID does not exist in the manifest.                | Search for the page's ID.                         |
| `missing_index`   | The required search index or manifest is absent.             | Build the site with the required outputs.         |
| `internal_error`  | Built metadata or a page file cannot be read correctly.      | Rebuild the documentation and inspect the output. |

Tool failures set MCP `isError` and return a structured `error` with `code` and `message`. Protocol or schema validation failures may be reported by the MCP SDK before the documentation core runs. An ordinary search with no matches succeeds with an empty result list.

## Verify the connection

Search for a known page, read the returned ID, and inspect its Markdown. Then request a nonexistent ID: it should return `unknown_page` without stopping the server. Confirm that a small budget sets `truncated` on a long page. These checks exercise the source selection and tool contract without an agent harness.

The tools are read-only and do not expose authoring commands. Stdio makes them available to a local tool-capable client; clients that cannot launch a local process cannot use this transport. They can read published Markdown over HTTP when their tools support fetching URLs. Stdio has no analytics adapter. The optional HTTP adapter records tool outcomes without raw queries.

## Related reading

### Next steps

- [Measure MCP tool usage](https://www.shoalrun.com/publish/mcp-analytics.md) — Optionally measure tool calls through a server adapter.

### Reference while working

- [CLI reference](https://www.shoalrun.com/cli.md) — Look up shared search and read flags and error behavior.

### Related topics

- [Agent-friendly documentation](https://www.shoalrun.com/publish/agent-friendliness.md) — Understand the published Markdown and discovery surfaces alongside MCP.
