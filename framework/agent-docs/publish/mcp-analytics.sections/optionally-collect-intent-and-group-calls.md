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

## Optionally collect intent and group calls

Intent describes why an agent called a tool. The PostHog adapter below supports separate `intent` and `conversationIds` switches, both off by default. Enable them alongside its module:

```yaml title="docs.config.yaml"
mcp:
  enabled: true
  access: public
  publication: { channel: production, version: current, language: en }
  analytics:
    module: ./mcp-analytics/posthog.mjs
    clientMetadata: true
    intent: true
    conversationIds: true
```

With intent enabled, the SDK adds a `context` argument asking for exactly one category: `discovery`, `setup`, `troubleshooting`, `configuration`, `reference_lookup`, `comparison`, `migration`, or `other`. Only these values can reach analytics. The adapter trims whitespace and normalizes case; it never stores an explanation or extracts a category from arbitrary text.

An empty, invalid, or free-text value falls back to `discovery` for `search_docs` or `reference_lookup` for reading tools. PostHog marks the fallback as `inferred`. It describes the tool action, not a verified user goal, and does not invoke a model. Accepted client categories are also unverified claims.

The SDK still accepts a string argument, so an agent might send private text despite the instruction. The outbound allowlist replaces that text before delivery. Raw queries, complete arguments, and returned documentation remain excluded.

The endpoint creates a fresh server for every HTTP request. PostHog’s SDK can carry a stable session token for legacy clients. Conversation IDs also let clients reuse a handle across requests: the SDK adds a `conversation_id` argument and can return a handle for the agent to echo. Grouping depends on the client keeping its SDK token or echoing that handle. Reconnecting or ignoring the handle can split activity.

These are analytics labels, not authentication. Client metadata capture in this SDK mode can also add an `llm_model` argument. It lets clients such as OpenCode report a model when no supported metadata field is available. Reported values remain unverified. Reconnect the client after enabling these options so it refreshes its tool schemas.

An adapter can export `instrument(server, options)` to configure its SDK before serving the request. Return `true` to let that SDK own event capture; return `false` to retain Shoalrun’s `capture(event)` path. The options include these flags, build/publication identity, and helpers for normalized client/model labels and published resource IDs. Delivery still uses the adapter’s `flush()`.

The PostHog example uses the existing low-level SDK server and resolves original tool argument names for stateless requests. Its outbound property allowlist drops raw headers, arguments, responses, and exception bodies. Other services need their own implementation of this optional hook.
