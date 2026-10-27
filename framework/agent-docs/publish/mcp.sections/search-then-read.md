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

**Updated: 2026-10-27.**

Parent page: [Full Markdown page](/publish/mcp.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [Measure MCP tool usage](https://www.shoalrun.com/publish/mcp-analytics.md) — Optionally measure tool calls through a server adapter.

Connect an MCP client to built documentation through four read-only tools. Use stdio for a client-launched local process, or enable an HTTP endpoint on Node or in a generated Vercel function. Both use the same search and Markdown reading core.

The HTTP endpoint currently supports one explicitly selected public publication. The generated Vercel endpoint is deployed and verified on this site. Netlify and Cloudflare adapters are not implemented. Analytics is off by default; an optional [server adapter](https://www.shoalrun.com/publish/mcp-analytics.md) can measure tool calls.

You need Node.js 22.12 or newer, the installed Shoalrun CLI, and a client that supports MCP stdio or Streamable HTTP. Follow [Getting started](https://www.shoalrun.com/start.md) to install the public npm package.

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
