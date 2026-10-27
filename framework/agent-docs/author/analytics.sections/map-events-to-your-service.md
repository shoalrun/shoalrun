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

## Map events to your service

Your adapter translates Shoalrun events into the service’s names, properties, and SDK calls. Use these rules when choosing mappings:

- Use the service’s native page-view event or API for its standard traffic reports. Check required properties as well as the name.
- Choose one source for each measurement. Disable equivalent automatic SDK events when the adapter supplies them.
- Keep content interactions as custom events unless a native event matches their meaning and required properties.
- Preserve page and component IDs, publication context, and `schemaVersion`. Check the destination’s limits on names and values.
- Use the SDK’s separate APIs for identification, grouping, exceptions, or replay; renaming an interaction does not enable these features.

Document each source, destination, property conversion, and automatic SDK feature you enable. Shoalrun has no universal page-exit or scroll-depth event. Verify one page visit and one content interaction in the destination, check they are counted once, and confirm native events populate the intended dashboard.
