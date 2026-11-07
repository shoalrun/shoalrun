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

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Search, chat, and agent access > MCP > Connect an MCP client

**Updated: 2026-11-07.**

Parent page: [Full Markdown page](/publish/mcp.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [Measure MCP tool usage](https://www.shoalrun.com/publish/mcp-analytics.md) — Optionally measure tool calls through a server adapter.

Connect an MCP client to built documentation through read-only tools. Use stdio for a client-launched local process, or enable an HTTP endpoint on Node or in a generated Vercel function. Both use the same search and Markdown reading core.

The HTTP endpoint currently supports one explicitly selected public publication. The generated Vercel endpoint is deployed and verified on this site. Netlify and Cloudflare adapters aren't implemented. Analytics is off by default; an optional [server adapter](https://www.shoalrun.com/publish/mcp-analytics.md) can measure tool calls.

You need Node.js 22.12 or newer, the installed Shoalrun CLI, and a client that supports MCP stdio or Streamable HTTP. Follow [Getting started](https://www.shoalrun.com/start.md) to install the public npm package.

## Discover product releases before searching

Since 0.1.0-alpha.18

Call `get_publications` with `{}` when the product or release is unknown. It reads the built publication catalog and returns `publications`, `total`, `offset`, budget metadata, and an optional `nextOffset`. Each publication carries its product when present, channel, version, and language. The optional `products` list contains concise metadata only for products represented on that response page. A default version is reported only when available in the selected scope. It doesn't return page inventories or the private customer profile.

The tool defaults to 20 entries and a 2,048-token budget. `limit` accepts 1–100, `offset` is a nonnegative whole number, and `maxTokens` accepts 256–100000. The budget may reduce the number of entries. Follow the returned `nextOffset`, rather than adding the requested limit yourself. Stop when it's absent. If one entry can't fit, increase the token budget. Keep the filters and built site unchanged while paging; rediscover after rebuilding.

For example, discover releases with `{"product":"payments","limit":5}`, then search with an available coordinate:

```json
{"query":"retry a payment","product":"payments","channel":"production","version":"v3","language":"en","limit":5}
```

A local stdio server can list the publications available in its built site. A hosted HTTP endpoint lists only its configured publication, and rejects an explicitly different product or release. A customer build lists only its compiled edition. Products with independently named releases aren't expanded into combinations: Payments v3 and Reporting v1 are two publication choices.

Follow each search result’s `read.tool` and `read.arguments` exactly. Those arguments retain the product alongside the other publication fields. A stable page ID such as `guide.start` can exist in both products; dropping the product can make the request ambiguous or select the wrong documentation. Catalog discovery doesn't change keyword ranking or make CLI/MCP search semantic.
