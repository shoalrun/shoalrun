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

**Updated: 2026-10-27.**

Parent page: [Full Markdown page](/publish/mcp.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [Measure MCP tool usage](https://www.shoalrun.com/publish/mcp-analytics.md) — Optionally measure tool calls through a server adapter.

Connect an MCP client to built documentation through four read-only tools. Use stdio for a client-launched local process, or enable an HTTP endpoint on Node or in a generated Vercel function. Both use the same search and Markdown reading core.

The HTTP endpoint currently supports one explicitly selected public publication. The generated Vercel endpoint is deployed and verified on this site. Netlify and Cloudflare adapters are not implemented. Analytics is off by default; an optional [server adapter](https://www.shoalrun.com/publish/mcp-analytics.md) can measure tool calls.

You need Node.js 22.12 or newer, the installed Shoalrun CLI, and a client that supports MCP stdio or Streamable HTTP. Follow [Getting started](https://www.shoalrun.com/start.md) to install the public npm package.

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
