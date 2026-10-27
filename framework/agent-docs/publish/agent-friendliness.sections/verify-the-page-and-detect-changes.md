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

## Verify the page and detect changes

Page identity is the stable document ID plus channel, version, and language. Different publication variants can share an ID, so comparing IDs alone can confuse their records.

The manifest exposes three distinct signals:

| Signal               | What it establishes                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------ |
| Page `digest`        | SHA-256 of the complete generated Markdown bytes. Compare it with the bytes you fetched.                     |
| Page `contentDigest` | A resolved article-content fingerprint used for freshness tracking. It is not the hash of the Markdown file. |
| Top-level `buildId`  | Identity of the assembled publication, including pages, contracts, assets, and metadata.                     |

An author-set `verified` date is also available in the manifest. It records supplied review metadata, separately from `updated`; it is not proof that an external reviewer approved the page.

For a long-lived client, save the sync snapshot and poll the small build-information file. An unchanged build ID means the saved inventory still applies. When the ID changes, compare the current snapshot with the saved one and refresh added or changed pages. Remove records that disappeared. The comparison includes route moves, metadata changes, and removed publication variants.

The local command is `shoalrun docs changes CURRENT-SNAPSHOT --since PREVIOUS-SNAPSHOT`. Static hosts retain no snapshot history; clients keep their own baseline. If a deployment changes between the manifest and page requests, retry until the fetched Markdown matches its advertised digest. The [published outputs reference](https://www.shoalrun.com/publish/output.md) gives the fields, comparison procedure, and limits.
