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

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Customize > Analytics

**Updated: 2026-10-26.**

Parent page: [Full Markdown page](/author/analytics.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [Measure MCP tool usage](https://www.shoalrun.com/publish/mcp-analytics.md) — Measure documentation tool calls separately from browser interactions.

Shoalrun sends documentation interactions to an analytics service through an **adapter**: a browser module you supply to initialize the service and deliver events. Analytics is off by default. Shoalrun includes no service SDK, storage, visitor identity, or delivery queue.

## Event format

Each event has `schemaVersion`, `name`, and `properties`. For example:

```json
{
  "schemaVersion": 1,
  "name": "content_tab_change",
  "properties": {
    "pageId": "guide.example",
    "pageUrl": "/example",
    "documentType": "reference",
    "channel": "production",
    "version": "current",
    "language": "en",
    "navigationSectionId": "docs",
    "componentId": "clients:tabs:1",
    "componentType": "tabs",
    "headingId": "clients",
    "tabIndex": 1,
    "tabId": "clients-2"
  }
}
```

Every event includes page identity and publication properties; `navigationSectionId` appears only for pages in a navigation tab. `pageUrl` is the published path without query or fragment. Custom properties cannot replace page identity.

Events associated with an element add component context. `componentId` uses `data-analytics-id`, then the element’s HTML ID, then its heading, kind, and position. Generated IDs can change when content moves. `componentType` is `tabs`, `walkthrough`, `disclosure`, `code`, or `control`; `headingId` identifies the preceding article heading when available.
