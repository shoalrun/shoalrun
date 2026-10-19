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

**Updated: 2026-10-19.**

Parent page: [Full Markdown page](/author/analytics.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [Measure MCP tool usage](https://www.shoalrun.com/publish/mcp-analytics.md) — Measure documentation tool calls separately from browser interactions.

Shoalrun sends documentation interactions to an analytics service through an **adapter**: a browser module you supply to initialize the service and deliver events. Analytics is off by default. Shoalrun includes no service SDK, storage, visitor identity, or delivery queue.

## HTML, Markdown, and agents

Instrumentation runs only in the browser and leaves Markdown and discovery artifacts unchanged. Agents that fetch Markdown or call tools without running page JavaScript are not counted.

To measure those requests, collect CDN or hosting logs, add a server request hook, or enable the separate [MCP analytics adapter](https://www.shoalrun.com/publish/mcp-analytics.md). Include cache hits: origin logs alone miss responses served by a CDN. Shoalrun does not install a request collector.

Measure discovery indexes, Markdown pages and sections, negotiated responses, and tool calls. Record the actual response representation because HTML and Markdown can share a URL. Keep health checks, `HEAD`, failures, and cache revalidation separate from successful body responses.

Send a separate server event such as `documentation_request` with path, representation, status, cache status, page ID when known, and a request ID for deduplication. Keep these counts separate from browser page views. Avoid raw headers, IP addresses, query strings, and page bodies by default.

A user agent is a claimed identity, not a verified one. People can fetch Markdown, and agents can use ordinary browsers; classify representation and claimed client separately. Requests do not prove reading, comprehension, or citation. Correlating them into sessions requires an explicit client or integration identifier; timing and IP address are unreliable.
