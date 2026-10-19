---
id: change.agent-readiness
title: Agent discovery, verified Markdown, and incremental sync
summary: Find the right page with less context, verify its contents, and fetch
  only what changed.
type: changelog-entry
area: discovery
subarea: discovery-agents
canonical: /changelog/2026-10-14-agent-readiness
date: 2026-10-14
---

# Agent discovery, verified Markdown, and incremental sync

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Changelog](https://www.shoalrun.com/.well-known/shoalrun/navigation/changelog-tab-50f26fe22670.txt) (ID: changelog-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Changelog](https://www.shoalrun.com/changelog.md) > Changelog > Agent discovery, verified Markdown, and incremental sync

**Published: 2026-10-14.**

Agents can now find pages through smaller indexes, check which build they are reading, and compare saved page inventories before fetching updates.

- **Smaller discovery files.** `llms.min.txt` lists page IDs, titles, summaries, and Markdown links. `search-index.min.json` adds headings without article text. Markdown 404 responses point to these compact files.
- **Incremental sync.** Clients can check `build-info.json` for a new build, then compare `documents.sync.json` with their saved snapshot to find added, changed, and removed pages. They can fetch only the pages that need updating instead of downloading the full manifest and every page again. `shoalrun docs changes CURRENT-SNAPSHOT --since PREVIOUS-SNAPSHOT` performs the comparison locally.
- **Verifiable responses.** Markdown responses include a fingerprint that lets clients check whether a page changed without downloading it again, plus a link to its manifest record. Focused API contracts now use their actual content digest in the URL, allowing a one-year immutable cache policy.
- **Clearer examples.** Fictional pages carry a machine-readable `demo` flag. The refreshed agent-friendly guide puts working tabs, a disclosure, and reader choices beside the Markdown an agent receives.

[Try the example and see what an agent reads](https://www.shoalrun.com/publish/agent-friendliness.md). The [output reference](https://www.shoalrun.com/publish/output.md) covers the files, digests, and sync workflow.
