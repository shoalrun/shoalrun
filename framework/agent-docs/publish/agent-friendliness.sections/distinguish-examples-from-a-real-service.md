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

**Page reading path** — these links apply to the full page.

**Read first**

- [Publishing and agent representations](https://www.shoalrun.com/publish/output.md) — Know which HTML, Markdown, and manifest files the build writes.

**Next steps**

- [Connect an MCP client](https://www.shoalrun.com/publish/mcp.md) — Connect a tool-capable client to bundled or built documentation.

- [Content negotiation](https://www.shoalrun.com/publish/content-negotiation.md) — Serve the Markdown twin when an agent asks for it.

Shoalrun lets people use an interactive documentation page while agents read a Markdown copy of the same instructions. Tabs, closed disclosures, and reader choices should not make essential content disappear from that copy.

The build checks that it knows how to turn each component into readable Markdown. If it does not, it stops with an error. Each generated Markdown page also has a SHA-256 digest, a fingerprint of its bytes. An agent can compare it with the fetched file to verify that the bytes match the published manifest.

Try the example below. Switch the client tab, open **Retry detail**, and choose a reader. Then compare what is visible with the Markdown underneath, which retains both clients, the retry advice, and both reader sections. You can also open [this page's actual Markdown](https://www.shoalrun.com/publish/agent-friendliness.md).

## Distinguish examples from a real service

Pages under configured `outputs.llms.fictionalPrefixes` carry `demo: true` in the document manifest and both search indexes. The plain-text indexes retain their fictional-example labels. Software can filter these records without interpreting prose. `demo: false` means unmarked; it does not certify that a service exists or is available.

API-reference pages can also link to a focused, digest-addressed OpenAPI contract containing one operation and its local definitions. This gives an agent an exact contract without requiring the complete API description. The [focused-contract reference](https://www.shoalrun.com/api-docs/focused-contracts.md) explains the export and audit checks.

An API catalog, when configured, links a declared endpoint to its description and documentation. This site's example endpoint uses a reserved `.test` domain and does not describe a live service. A contract or catalog entry is a description, not permission to execute an operation.
