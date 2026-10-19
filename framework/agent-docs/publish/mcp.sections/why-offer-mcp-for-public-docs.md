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

Parent page: [Full Markdown page](/publish/mcp.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [Measure MCP tool usage](https://www.shoalrun.com/publish/mcp-analytics.md) — Optionally measure tool calls through a server adapter.

Connect an MCP client to built documentation through four read-only tools. Use stdio for a client-launched local process, or enable an HTTP endpoint on Node or in a generated Vercel function. Both use the same search and Markdown reading core.

The HTTP endpoint currently supports one explicitly selected public publication. The generated Vercel endpoint is deployed and verified on this site. Netlify and Cloudflare adapters are not implemented. Analytics is off by default; an optional [server adapter](https://www.shoalrun.com/publish/mcp-analytics.md) can measure tool calls.

You need Node.js 22.12 or newer, a built copy of Shoalrun, and a client that supports MCP stdio or Streamable HTTP. The compiler and CLI are still a private prototype; there is no public package to install yet.

## Why offer MCP for public docs?

MCP gives tool-capable agents a predictable way to search your docs and request a page or section within a token budget. For example, an agent answering “How do I configure analytics?” can search and follow the returned read instruction. The result includes relevant Markdown, its publication, and a source link.

The documentation can already be public. MCP adds a tool interface; it does not grant access that public Markdown lacks. Agents that can fetch and search your Markdown may not need it. Offer both when your readers use MCP clients, and check whether the tools help them find answers with fewer requests or less content.

To use Shoalrun's own live documentation endpoint, follow [use this site's MCP](https://www.shoalrun.com/connect/mcp.md). The setup below is for hosting your own project's tools.
