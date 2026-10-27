---
id: guide.mcp-analytics
title: Measure MCP tool usage
summary: Send optional server events to your analytics service without changing
  the documentation tools.
type: how-to
area: discovery
subarea: discovery-mcp
canonical: /publish/mcp-analytics
---

# Measure MCP tool usage

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Search, chat, and agent access > MCP > Measure MCP tool usage

**Updated: 2026-10-26.**

Parent page: [Full Markdown page](/publish/mcp-analytics.md)

**Page reading path** — these links apply to the full page.

**Read first**

- [Connect an MCP client](https://www.shoalrun.com/publish/mcp.md) — Enable and verify the HTTP endpoint before adding analytics.

Add a server adapter to measure calls to your [HTTP MCP endpoint](https://www.shoalrun.com/publish/mcp.md). Analytics is off by default. Enabling MCP does not enable tracking, and the browser analytics setting does not count tool calls.

Your adapter chooses the service and sends the events. Shoalrun packages it for Node or the generated Vercel function. This setting does not instrument stdio, direct Markdown requests, or browser page views.

## Adapter exports

Create a local `.js` or `.mjs` server module. Export `capture(event)` and, if your service queues events, `flush()`:

```js title="mcp-analytics/adapter.mjs"
export async function capture(event) {
  // Send event to your service using its server SDK or HTTP API.
}

export async function flush() {
  // Send queued events before the HTTP response completes.
}
```

`capture` runs after each tool call, including failures. `flush` sends queued events before the response completes. Both can be asynchronous. Each has a one-second wait limit; analytics failures leave tool results unchanged. Set network timeouts in your adapter because Shoalrun cannot cancel a timed-out operation.

Module paths resolve relative to the config file. Use static imports and install SDK dependencies in your project. Keep credentials in the server environment, since adapter files are copied into the build.
