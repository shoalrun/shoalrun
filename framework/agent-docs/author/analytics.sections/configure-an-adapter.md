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

## Configure an adapter

Point `analytics.module` at a local `.js` or `.mjs` file:

```yaml title="docs.config.yaml"
analytics:
  module: ./analytics.js
```

Paths resolve relative to the declaring config file, including included files. The build copies the module to `/assets/analytics-adapter.js` without executing or bundling it. Supply a self-contained module or use browser-resolvable imports; relative imports resolve from the copied asset directory. The file becomes public browser code.

For example, if your page already initializes a client named `myAnalytics`, forward events to its `capture` method:

```js title="analytics.js"
export function track(event) {
  globalThis.myAnalytics.capture(event.name, event.properties);
}
```

Replace the client and method with your service’s API. Set `analytics: false`, or omit the setting, to exclude the runtime, adapter, and page context. Unknown settings, unsupported extensions, and missing files fail the build.
