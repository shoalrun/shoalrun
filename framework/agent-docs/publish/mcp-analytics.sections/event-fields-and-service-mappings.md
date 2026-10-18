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

## Event fields and service mappings

Every event has the following fields. Arguments, search text, returned content, raw request headers, IP addresses, and user identity are excluded:

| Field                 | Meaning                                                                          |
| --------------------- | -------------------------------------------------------------------------------- |
| `name`                | Always `mcp_tool_call`.                                                          |
| `tool`                | `search_docs`, `get_page`, `get_outline`, or `get_section`.                      |
| `durationMs`          | Tool execution time before analytics delivery.                                   |
| `isError`             | Whether the documentation tool failed.                                           |
| `errorCode`           | Error category when the tool failed.                                             |
| `pageId`, `sectionId` | Published IDs when a successful read returns them.                               |
| `buildId`             | Identity of the served build.                                                    |
| `publication`         | Served `channel`, `version`, and `language`.                                     |
| `client`              | Optional normalized client name, bounded version, source, and `verified: false`. |
| `model`               | Optional model label, source, and `verified: false`.                             |

Map these fields to your service’s event and property names. A service with native MCP analytics may require its SDK or reserved event names. A general event service can receive `mcp_tool_call` with these properties. The PostHog example below uses its native MCP SDK.

Tool counts show usage, not comprehension. This adapter supplies no user or conversation identifier, so do not treat calls as unique people or agent sessions. Basic event capture leaves tool definitions and results unchanged. The optional SDK features below add analytics arguments and conversation handles.
