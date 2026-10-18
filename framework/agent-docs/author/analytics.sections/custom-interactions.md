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

## Custom interactions

Site scripts can emit events from existing controls. For example, this site’s table-of-contents toggle calls the hook after hiding the panel:

```js
globalThis.shoalrunAnalytics?.track(
  'toc_visibility_change',
  { visible: false },
  document.querySelector('.toc-visibility-toggle')
);
```

The arguments are the event name, properties, and optional element for component context. Page properties are added automatically. The optional chain skips the call when analytics is unconfigured.

This hook does not register MDX components: unknown components fail the build. Use the [supported components](https://www.shoalrun.com/author/components.md) or register a [trusted component plugin](https://www.shoalrun.com/author/components/custom.md) with shared HTML and Markdown content.

Event names start with a lowercase letter and contain at most 64 lowercase letters, digits, or underscores.

Custom properties have these limits:

- Names start with a letter and contain at most 64 letters, digits, or underscores. `constructor` and `prototype` are reserved.
- Each call accepts up to 32 properties.
- Values can be strings of up to 256 characters, finite numbers, booleans, or arrays of up to 32 such values.
- Objects, nulls, and unsupported values are omitted.

`track` returns `true` when the adapter is invoked, not when delivery succeeds. It returns `false` if disabled, pending, invalid, or synchronously failed. Asynchronous failures are caught. The hook’s `enabled` property reports readiness and delivery state.
