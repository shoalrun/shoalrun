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

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > MCP > Measure MCP tool usage

**Updated: 2026-10-19.**

Parent page: [Full Markdown page](/publish/mcp-analytics.md)

**Page reading path** — these links apply to the full page.

**Read first**

- [Connect an MCP client](https://www.shoalrun.com/publish/mcp.md) — Enable and verify the HTTP endpoint before adding analytics.

Add a server adapter to measure calls to your [HTTP MCP endpoint](https://www.shoalrun.com/publish/mcp.md). Analytics is off by default. Enabling MCP does not enable tracking, and the browser analytics setting does not count tool calls.

Your adapter chooses the service and sends the events. Shoalrun packages it for Node or the generated Vercel function. This setting does not instrument stdio, direct Markdown requests, or browser page views.

## Enable analytics

Add your server adapter to the MCP configuration. Readers do not need to change their client settings:

```yaml title="docs.config.yaml"
mcp:
  enabled: true
  access: public
  publication: { channel: production, version: current, language: en }
  analytics:
    module: ./mcp-analytics/adapter.mjs
```
