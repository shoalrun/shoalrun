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

## Generate a Vercel endpoint

With the public MCP configuration above, generate deployment output from your project:

```sh
shoalrun vercel build docs.config.yaml .vercel/output
```

No extra MCP flag, Ask configuration, embeddings, or model key is required. The command packages the four tools and their selected public documentation in a Node function at the configured endpoint. Internal runtime files stay out of the public static output. Follow [Publish on Vercel](https://www.shoalrun.com/publish/vercel.md) to deploy the complete output directory.

The function trusts `site.origin`, explicit allowed hosts, and Vercel’s reserved deployment host variables. It does not trust arbitrary forwarded hosts or other projects’ preview domains. Deployment protection may block an MCP client from reaching a preview; check that host setting if a client cannot connect.

Returned Markdown links use the URLs generated at build time. Set the intended origin before building; request headers do not rewrite the documentation identity. Per-instance limits are not global deployment limits. Configure host-level traffic controls before opening a public endpoint.

Local package tests cover SDK clients and the generated function. Read-only SDK calls have also been verified at this site’s production Vercel endpoint. Named desktop-client checks remain separate.
