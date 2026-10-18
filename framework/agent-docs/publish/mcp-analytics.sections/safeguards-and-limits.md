---
id: guide.mcp-analytics
title: Measure MCP tool usage
summary: Send optional server events to your analytics service without changing
  the documentation tools.
type: how-to
canonical: /publish/mcp-analytics
---

# Measure MCP tool usage

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > MCP > Measure MCP tool usage

**Updated: 2026-10-17.**

Parent page: [Full Markdown page](/publish/mcp-analytics.md)

**Page reading path** — these links apply to the full page.

**Read first**

- [Connect an MCP client](https://www.shoalrun.com/publish/mcp.md) — Enable and verify the HTTP endpoint before adding analytics.

Add a server adapter to measure calls to your [HTTP MCP endpoint](https://www.shoalrun.com/publish/mcp.md). Analytics is off by default. Enabling MCP does not enable tracking, and the browser analytics setting does not count tool calls.

Your adapter chooses the service and sends the events. Shoalrun packages it for Node or the generated Vercel function. This setting does not instrument stdio, direct Markdown requests, or browser page views.

## Safeguards and limits

If you need caller opt-in, the optional [`mcp.analytics.consent` header gate](https://www.shoalrun.com/config.md) records only calls with a matching header. Other callers can still use the tools. Leave it omitted for collection without client setup.

The PostHog example builds each outbound event from allowed fields. It includes tool name, duration, outcome, build/publication identity, and validated public page or section IDs. Optional harness labels come from known names; optional model labels must appear in the fixed registry.

The adapter drops raw arguments, search text, responses, headers, IP properties, error messages, and arbitrary event fields. It disables exception autocapture, requests no person profiles, and disables GeoIP enrichment. These controls apply to analytics delivery, not the documentation response or infrastructure access logs.

Conversation and session IDs support grouping when enabled. They are pseudonymous identifiers, not proof that data is anonymous or that a particular person made the call. Leave grouping off when aggregate tool counts are enough. Never use client labels or intent categories for authentication or billing.

Check PostHog’s **Settings → Project → IP data capture configuration → Discard client IP data** setting as an additional storage control. A network service still receives the source IP of its connection; this server adapter must not forward the caller’s IP. Hosting logs and other services need their own review. See [PostHog storage controls](https://posthog.com/docs/privacy/data-storage).

Test the final delivered payload with a local receiver before changing the adapter or upgrading its SDK. Include names, emails, credentials, URLs, and private text in test arguments and metadata; verify they are absent from captured events. Public page IDs remain useful for usage analysis without recording the agent’s search or explanation. These safeguards do not establish a legal basis for collection or guarantee that all infrastructure stores no personal data.
