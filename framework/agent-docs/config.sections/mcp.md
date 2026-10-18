---
id: reference.config
title: Configuration reference
summary: Every top-level setting in docs.config.yaml, with defaults, validation
  rules, and links to the full guides.
type: reference
canonical: /config
---

# Configuration reference

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Reference > Configuration reference

**Updated: 2026-10-17.**

Parent page: [Full Markdown page](/config.md)

**Page reading path** — these links apply to the full page.

**Read first**

- [How Shoalrun works](https://www.shoalrun.com/concepts.md) — Understand publications, stable IDs, and config composition before changing settings.

A project's config starts at `docs.config.yaml`. The CLI looks for that name by default, and `shoalrun scaffold -n` searches parent directories for it. For the configuration workflow, composition rules, and debugging, start with [configure your project](https://www.shoalrun.com/configuration.md). This page lists every top-level key. Keys with a dedicated guide link there for the full rules. For complete, working configs, see [example configs](https://www.shoalrun.com/config/examples.md).

The root file must be a YAML mapping with `schemaVersion: 1`. YAML is parsed strictly: duplicate keys fail. Any top-level key not listed here fails with `unknown setting <key>`. Keys nested inside `site`, `apis`, `publications`, and `outputs` are not all checked yet, so check spelling there carefully.

```yaml title="docs.config.yaml"
schemaVersion: 1
site:
  title: Example documentation
publications:
  defaults: { channel: production, version: current, language: en }
  channels:
    production: { pathPrefix: "" }
  versions:
    current: { pathPrefix: "" }
  enabled:
    - { channel: production, version: current }
navigation: { $include: ./config/nav.yaml }
```

## `mcp`

Enable a read-only HTTP MCP endpoint on Node or in Vercel output for one public publication:

```yaml title="docs.config.yaml"
mcp:
  enabled: true
  access: public
  path: /mcp
  publication: { channel: production, version: current, language: en }
```

`path` defaults to `/mcp` and is mounted beneath `site.basePath`. The build rejects conflicting output routes. `enabled` must be a boolean, and enabled configurations require `access: public` and all three publication coordinates.

Optional `allowedHosts` lists exact hostnames without ports or wildcards. Optional `allowedOrigins` lists exact HTTP(S) browser origins. `site.origin` contributes its hostname and origin automatically; the local Node server also permits loopback requests. Unknown settings fail validation.

Omit the section, set `mcp: false`, or set `enabled: false` to disable it. The Node server reads generated settings, and `shoalrun vercel build` packages an independent function automatically. Read-only SDK calls have been verified on this site’s production Vercel endpoint. See [connect an MCP client](https://www.shoalrun.com/publish/mcp.md) for setup and request limits.

Optional `mcp.analytics.module` names a local `.js` or `.mjs` server adapter exporting `capture(event)` and optional `flush()`. It resolves relative to the declaring config file. The build copies the module and its dependencies without executing it. Relative imports must stay within its directory. Credentials belong in runtime environment variables.

Optional `mcp.analytics.consent` contains `header` and `value`. When configured, only requests with that exact header value can load or call the analytics adapter. Other requests can use the documentation tools without tracking. The header must be a lowercase custom `x-` name; forwarded, Vercel, and MCP protocol headers are reserved. The value is a case-sensitive policy identifier of up to 64 letters, digits, dots, underscores, or hyphens.

The header gate is off when omitted or set to `false`; readers then need no special client configuration for analytics. Use the gate only when your deployment requires explicit caller opt-in. In that mode, removing the header stops collection on future requests. This feature does not determine your privacy obligations. See [analytics safeguards](https://www.shoalrun.com/publish/mcp-analytics.md).

Optional `mcp.analytics.clientMetadata: true` adds normalized client labels and model labels from a fixed registry when supported request metadata is present. It defaults to `false`. Labels are unverified; raw headers, unrelated metadata, queries, and intent are excluded.

Optional `mcp.analytics.intent` and `mcp.analytics.conversationIds` are booleans that default to `false`. An adapter’s optional `instrument(server, options)` hook implements them. The PostHog example can add context/model arguments and conversation handles while excluding raw queries and results. Its context argument requests a fixed intent category. Free-text or invalid values are replaced with a per-tool category before analytics delivery; raw intent is never stored by that example. Other adapters must implement their own safeguards.

Omit `mcp.analytics` or set it to `false` to disable collection. It is independent of browser analytics and does not instrument stdio. See [measure MCP tool usage](https://www.shoalrun.com/publish/mcp-analytics.md) for fields, service mappings, and a PostHog example.
