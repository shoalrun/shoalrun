---
id: reference.config-integrations
title: Search and integration settings
summary: Configure search synonyms, the read-only MCP endpoint, and browser analytics.
type: reference
area: publishing
subarea: publishing-configuration
canonical: /config/integrations
---

# Search and integration settings

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Reference](https://www.shoalrun.com/.well-known/shoalrun/navigation/reference-tab-50f26fe22670.txt) (ID: reference-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Reference](https://www.shoalrun.com/cli.md) > Configuration reference > Search and integration

**Updated: 2026-10-27.**

Configure search synonyms, the read-only MCP endpoint, and browser analytics. These keys belong in `docs.config.yaml` or an included configuration file. For file composition and validation commands, see [Configure your project](https://www.shoalrun.com/configuration.md). Use the [configuration index](https://www.shoalrun.com/config.md) to find another setting.

## `search`

Optional. `search.synonyms` is a list of groups of two or more words or phrases. Each term in a group can find the others, with exact matches ranked higher. A term can appear in only one group. Use `$include` to keep the groups in a project-owned YAML file. The [site search guide](https://www.shoalrun.com/author/search.md) shows the format and which search paths use it.

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

## `analytics`

Analytics is disabled by default. Configure a local browser adapter to receive interaction events:

```yaml title="docs.config.yaml"
analytics:
  module: ./analytics.js
```

The adapter must export `track(event)` and can export an asynchronous `init(context)`. `module` resolves relative to the declaring config file and is copied to the public assets without being executed during the build. `analytics: false` disables it. Shoalrun emits documented events; your adapter owns the service, consent, and delivery. See [bring your own analytics](https://www.shoalrun.com/author/analytics.md).

## Related reading

### Read first

- [Organize project configuration](https://www.shoalrun.com/configuration.md) — Learn how files combine and how to validate configuration changes.

### Reference while working

- [Configuration reference](https://www.shoalrun.com/config.md) — Find configuration settings in another topic.
