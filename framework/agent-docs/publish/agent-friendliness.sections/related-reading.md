---
id: guide.agent-friendliness
title: Agent-friendly documentation
summary: See how interactive docs become readable Markdown, then discover pages
  and verify their contents.
type: explanation
area: discovery
subarea: discovery-agents
canonical: /publish/agent-friendliness
---

# Agent-friendly documentation

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Search, chat, and agent access > Agent-friendly documentation

**Updated: 2026-10-27.**

Parent page: [Full Markdown page](/publish/agent-friendliness.md)

Shoalrun lets people use an interactive documentation page while agents read a Markdown copy of the same instructions. Tabs, closed disclosures, and reader choices should not make essential content disappear from that copy.

The build checks that it knows how to turn each component into readable Markdown. If it does not, it stops with an error. Each generated Markdown page also has a SHA-256 digest, a fingerprint of its bytes. An agent can compare it with the fetched file to verify that the bytes match the published manifest.

Try the example below. Switch the client tab, open **Retry detail**, and choose a reader. Then compare what is visible with the Markdown underneath, which retains both clients, the retry advice, and both reader sections. You can also open [this page's actual Markdown](https://www.shoalrun.com/publish/agent-friendliness.md).

## Related reading

### Read first

- [Publishing and agent representations](https://www.shoalrun.com/publish/output.md) — Know which HTML, Markdown, and manifest files the build writes.

### Next steps

- [Connect an MCP client](https://www.shoalrun.com/publish/mcp.md) — Connect a tool-capable client to bundled or built documentation.

- [Content negotiation](https://www.shoalrun.com/publish/content-negotiation.md) — Serve the Markdown twin when an agent asks for it.

### Related topics

- [Configure the agent discovery block](https://www.shoalrun.com/publish/agent-discovery.md) — Understand how HTML guidance, Markdown, and discovery files serve different readers.

- [Focused OpenAPI contracts](https://www.shoalrun.com/api-docs/focused-contracts.md) — Focused contracts are how agents find exact API details without the full spec.

- [Connect an MCP client](https://www.shoalrun.com/publish/mcp.md) — Understand the published Markdown and discovery surfaces alongside MCP.

- [Non-goals](https://www.shoalrun.com/non-goals.md) — See how published Markdown and discovery files help agents read a site.

- [Use this site's MCP](https://www.shoalrun.com/connect/mcp.md) — Understand the Markdown and discovery outputs behind the tools.
