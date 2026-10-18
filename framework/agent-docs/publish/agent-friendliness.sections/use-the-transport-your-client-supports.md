---
id: guide.agent-friendliness
title: Agent-friendly documentation
summary: See how interactive docs become readable Markdown, then discover pages
  and verify their contents.
type: explanation
canonical: /publish/agent-friendliness
---

# Agent-friendly documentation

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Get started > Agent-friendly documentation

**Updated: 2026-10-17.**

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

## Use the transport your client supports

A fetch-only agent can read the published files over HTTP. It needs no CLI, repository access, JavaScript, or MCP connection. Hosts must serve Markdown with the correct media type and apply content negotiation at HTML page URLs. Missing Markdown pages return HTTP `404` with compact recovery links. The [hosting and negotiation reference](https://www.shoalrun.com/publish/content-negotiation.md) describes the contract; verify it on the deployed host.

The private Shoalrun package also bundles this framework's own documentation. `shoalrun docs search` and `shoalrun docs read` use that bundle by default; `--site DIRECTORY` selects another built site. These are local tools for users with the package, not requirements imposed on public readers.

`shoalrun docs mcp` exposes the local search/read core over stdio. You can also [connect to this site’s public HTTP MCP endpoint](https://www.shoalrun.com/connect/mcp.md). The local read tool applies a token budget and can truncate a response; fetch the published twin when you need complete bytes for digest verification. See [the MCP reference](https://www.shoalrun.com/publish/mcp.md) for its current contract.

Shoalrun does not automatically generate a reader skill for every site. Its maintained authoring skills guide an author's existing agent through writing and validation; teams remain responsible for reviewing their instructions. The [non-goals](https://www.shoalrun.com/non-goals.md) explain that boundary.
