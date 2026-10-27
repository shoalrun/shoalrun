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
