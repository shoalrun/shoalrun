---
id: guide.analytics
title: Bring your own analytics
summary: Send documentation interaction events to your analytics service through
  an optional browser adapter.
type: reference
canonical: /author/analytics
---

# Bring your own analytics

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Customize > Analytics

**Updated: 2026-10-17.**

Parent page: [Full Markdown page](/author/analytics.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [Measure MCP tool usage](https://www.shoalrun.com/publish/mcp-analytics.md) — Measure documentation tool calls separately from browser interactions.

Shoalrun sends documentation interactions to an analytics service through an **adapter**: a browser module you supply to initialize the service and deliver events. Analytics is off by default. Shoalrun includes no service SDK, storage, visitor identity, or delivery queue.

## Adapter exports and consent

Implement these exports in your browser module:

| Export          | Required | Contract                                                                                                              |
| --------------- | -------- | --------------------------------------------------------------------------------------------------------------------- |
| `track(event)`  | Yes      | Receive an event; may return a promise. The adapter owns delivery, batching, retries, and flushing before navigation. |
| `init(context)` | No       | Initialize the service or await consent; may return a promise. Events start after it resolves.                        |

The read-only context provides `page` properties, `setEnabled(boolean)`, and `track(name, properties, element?)`. Import or initialization failures disable analytics for the page. Thrown or rejected `track` calls are caught without interrupting controls or navigation; Shoalrun does not retry them.

Events are discarded while initialization is pending or delivery is disabled. After initialization, Shoalrun sends `page_view` if enabled. To delay collection, await consent in `init`, or call `setEnabled(false)` and enable delivery from your consent callback. In the latter case, call `track('page_view')` after enabling to count the current page.

You can also disable delivery through the public hook:

```js
globalThis.shoalrunAnalytics?.setEnabled(false);
```

Connect consent changes to your SDK too. Disabling Shoalrun does not stop SDK-generated events, unload the SDK, or revoke data already sent.
