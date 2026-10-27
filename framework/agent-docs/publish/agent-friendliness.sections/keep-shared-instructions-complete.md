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

## Keep shared instructions complete

Supported tabs and disclosures expand into readable Markdown sections. Reader-marked sections remain present with readable labels, even when a reader choice hides them in interactive HTML. Snippets and API examples resolve during the build. Unknown components and unsupported dynamic MDX fail compilation.

The example above preserves the instructions while changing how they are presented. HTML still has tabs, disclosures, and reader controls. Markdown presents the content in reading order. The formats do not need identical bytes to be useful.

Authors can deliberately tailor sections to each format with [Only](https://www.shoalrun.com/author/components/only.md). Review those choices for missing prerequisites, warnings, or shared product facts. A build gate can reject an unknown component; it cannot decide whether an intentional omission makes a task impossible. Similarly, [reader views](https://www.shoalrun.com/author/reader-views.md) are presentation controls. They do not authorize access or remove published content from the site's files.
