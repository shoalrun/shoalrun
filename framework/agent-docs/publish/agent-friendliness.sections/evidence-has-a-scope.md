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

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Get started > Agent-friendly documentation

**Updated: 2026-10-26.**

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

## Evidence has a scope

Compiler tests, the example above, and digest checks establish specific behavior. They do not substitute for task evaluation or independent factual review. AFDocs checks also inspect discovery, Markdown availability, and HTTP behavior; parity findings need review because authors can intentionally tailor each format.

A local build and passing Node-host checks do not establish what a production host currently serves. Run the deployment checks against the published origin after releasing a build. The [output reference](https://www.shoalrun.com/publish/output.md) and [deployment checker](https://www.shoalrun.com/publish/deployment-check.md) describe the artifacts and live checks separately.
