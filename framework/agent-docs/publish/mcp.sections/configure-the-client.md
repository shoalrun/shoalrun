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
