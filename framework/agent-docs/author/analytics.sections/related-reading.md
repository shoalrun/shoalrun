---
id: guide.analytics
title: Bring your own analytics
summary: Send documentation interaction events to your analytics service through
  an optional browser adapter.
type: reference
area: quality
subarea: quality-analytics
canonical: /author/analytics
---

# Bring your own analytics

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Configure and customize > Analytics

**Updated: 2026-10-26.**

Parent page: [Full Markdown page](/author/analytics.md)

Shoalrun sends documentation interactions to an analytics service through an **adapter**: a browser module you supply to initialize the service and deliver events. Analytics is off by default. Shoalrun includes no service SDK, storage, visitor identity, or delivery queue.

## Related reading

### Next steps

- [Measure MCP tool usage](https://www.shoalrun.com/publish/mcp-analytics.md) — Measure documentation tool calls separately from browser interactions.

### Reference while working

- [Site search](https://www.shoalrun.com/author/search.md) — Configure the search provider whose displayed outcomes analytics records.

- [Reader views](https://www.shoalrun.com/author/reader-views.md) — Define reader facets and understand their browser interactions.

- [Configuration reference](https://www.shoalrun.com/config.md) — Find the project-level analytics module setting.

### Related topics

- [Measure MCP tool usage](https://www.shoalrun.com/publish/mcp-analytics.md) — Collect browser interactions through the separate browser adapter.
