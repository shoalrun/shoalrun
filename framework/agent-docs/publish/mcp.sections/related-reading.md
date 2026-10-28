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

**Updated: 2026-10-28.**

Parent page: [Full Markdown page](/publish/mcp.md)

Connect an MCP client to built documentation through four read-only tools. Use stdio for a client-launched local process, or enable an HTTP endpoint on Node or in a generated Vercel function. Both use the same search and Markdown reading core.

The HTTP endpoint currently supports one explicitly selected public publication. The generated Vercel endpoint is deployed and verified on this site. Netlify and Cloudflare adapters are not implemented. Analytics is off by default; an optional [server adapter](https://www.shoalrun.com/publish/mcp-analytics.md) can measure tool calls.

You need Node.js 22.12 or newer, the installed Shoalrun CLI, and a client that supports MCP stdio or Streamable HTTP. Follow [Getting started](https://www.shoalrun.com/start.md) to install the public npm package.

## Related reading

### Next steps

- [Measure MCP tool usage](https://www.shoalrun.com/publish/mcp-analytics.md) — Optionally measure tool calls through a server adapter.

### Reference while working

- [CLI reference](https://www.shoalrun.com/cli.md) — Look up shared search and read flags and error behavior.

### Related topics

- [Content delivery and agents](https://www.shoalrun.com/content-delivery/agents.md) — Use existing documentation MCP tools for contextual reads. (Status: in development.)

- [Agent-friendly documentation](https://www.shoalrun.com/publish/agent-friendliness.md) — Understand the published Markdown and discovery surfaces alongside MCP.
