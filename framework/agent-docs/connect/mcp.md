---
id: guide.site-mcp
title: Use this site's MCP
summary: Connect your agent to Shoalrun's public documentation and ask it to
  search, read pages, or fetch sections.
type: how-to
canonical: /connect/mcp
---

# Use this site's MCP

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > MCP > Use this site's MCP

**Updated: 2026-10-17.**

Connect an MCP client to Shoalrun's live documentation at **`https://www.shoalrun.com/mcp`**. You need an agent application that supports remote HTTP MCP servers. No Shoalrun account, API key, custom header, or local installation is required.

This endpoint reads Shoalrun's public documentation. To host an endpoint for your own documentation, use the separate [MCP hosting guide](https://www.shoalrun.com/publish/mcp.md).

## Connect and ask a question

The setting names vary by client. Use its remote MCP server connection settings:

1. ### Add the documentation server

   Create a remote server connection named `shoalrun-docs`. Choose HTTP or Streamable HTTP when your client asks for the transport. Enter this server URL:

   ```text
   https://www.shoalrun.com/mcp
   ```

   Leave authentication and custom headers unset. The URL is an MCP endpoint, not a web page; opening it directly in a browser may show a method error.

2. ### Connect and discover the tools

   Save the connection and enable it. Restart or reconnect the client if it does not refresh its tools automatically.

   Look for `search_docs`, `get_page`, `get_outline`, and `get_section` under the connection. Your client may prefix their names with `shoalrun-docs`.

3. ### Ask the agent to use the documentation

   Try this request in your agent:

   > Use the Shoalrun docs MCP to find how to configure analytics. Read the relevant documentation and give me the answer with source links.

   Inspect the agent's tool activity. It should call `search_docs` and follow a returned read instruction. Answers and links alone do not prove that it used MCP.

## What the tools do

These tools only read published documentation. They cannot edit your files, change a project, or deploy a site.

| Tool          | Use                                                  |
| ------------- | ---------------------------------------------------- |
| `search_docs` | Find relevant pages and suggested read instructions. |
| `get_page`    | Read a Markdown page by its stable document ID.      |
| `get_outline` | List a page's sections and their exact IDs.          |
| `get_section` | Read one section by page ID and section ID.          |

Use IDs returned by the tools rather than guessing them from a page title or URL. When a tool says the result does not fit its token budget, retry with the recommended `maxTokens` value. Do not treat an incomplete response as the complete documentation.

## If the connection fails

Check that your client supports remote HTTP MCP and that the URL ends in `/mcp`. A client that only launches local stdio commands cannot connect directly to this URL.

If tools are missing after saving, reconnect the server or restart the client. If the client insists on an API key or OAuth login, check that you selected an unauthenticated remote connection. This endpoint does not provide an OAuth login.

This site's MCP analytics measures tool usage, available harness/model labels, and fixed intent categories. It excludes raw queries, free-text intent, returned content, and request headers. Session grouping uses pseudonymous IDs. Hosting access logs are separate; see the [analytics safeguards](https://www.shoalrun.com/publish/mcp-analytics.md).

No private test settings are needed to use the tools or supply supported metadata. Missing or unrecognized labels remain absent; the server does not guess them.

## Related reading

### Next steps

- [Connect an MCP client](https://www.shoalrun.com/publish/mcp.md) — Host the same documentation tools for your own project.

### Related topics

- [Agent-friendly documentation](https://www.shoalrun.com/publish/agent-friendliness.md) — Understand the Markdown and discovery outputs behind the tools.
