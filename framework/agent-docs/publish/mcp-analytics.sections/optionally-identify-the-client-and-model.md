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

## Optionally identify the client and model

The harness is the application running the agent, such as Cursor or Claude Code. To collect available client and model labels, explicitly enable `clientMetadata` in your adapter config:

```yaml title="docs.config.yaml"
mcp:
  enabled: true
  access: public
  publication: { channel: production, version: current, language: en }
  analytics:
    module: ./mcp-analytics/adapter.mjs
    clientMetadata: true
```

This option defaults to `false`. Shoalrun recognizes a fixed set of client names from MCP identity metadata or product tokens in selected headers. It discards raw headers and unrelated metadata. Client versions must match a bounded numeric version format.

Model capture currently recognizes `model` in Codex’s `x-codex-turn-metadata`. It accepts labels from a fixed model-name registry, normalizes supported provider prefixes, and drops other values. A recognized family prefix alone does not qualify; custom deployment names and unknown models are omitted. Other clients may supply no supported model field; missing labels remain absent. The harness name does not establish which model it uses.

Both labels are unverified client claims. Use them for usage reports, never authentication, access control, or billing. No user fingerprint or cross-request identity cache is added.

OpenCode can also be recognized by the presence of its documented session metadata marker. Shoalrun discards that identifier; it records only the client label. Client-specific markers do not establish the model.
