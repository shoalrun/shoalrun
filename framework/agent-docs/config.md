---
id: reference.config
title: Configuration reference
summary: Find configuration settings by topic and compose a project configuration.
type: reference
area: publishing
subarea: publishing-configuration
canonical: /config
---

# Configuration reference

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Reference > Configuration reference > Overview

**Updated: 2026-10-27.**

A project's configuration starts at `docs.config.yaml`. The CLI looks for that name by default, and `shoalrun scaffold -n` searches parent directories for it. For a guided workflow, start with [Configure your project](https://www.shoalrun.com/configuration.md). For complete working projects, see [Example configs](https://www.shoalrun.com/config/examples.md).

## Find a setting

Each reference below contains the field definitions, defaults, validation rules, and examples for its topic.

| Reference                                                                          | Configuration keys                                                                                                                    |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| [Site and theme settings](https://www.shoalrun.com/config/site.md)                 | `site`, `theme`                                                                                                                       |
| [Publications and routing settings](https://www.shoalrun.com/config/publishing.md) | `publications`, `navigation`, `redirects`                                                                                             |
| [Authoring and content settings](https://www.shoalrun.com/config/content.md)       | `authoring`, `frontmatter`, `variables`, `snippets`, `templates`, `callouts`, `badges`, `cookbooks`, `relationships`, `readerFilters` |
| [API and audit settings](https://www.shoalrun.com/config/apis.md)                  | `apis`, `audit`                                                                                                                       |
| [Search and integration settings](https://www.shoalrun.com/config/integrations.md) | `search`, `mcp`, `analytics`                                                                                                          |
| [Output and export settings](https://www.shoalrun.com/config/outputs.md)           | `metadata`, `exports`, `outputs`                                                                                                      |

## Start a configuration file

The root file must be a YAML mapping with `schemaVersion: 1`. YAML is parsed strictly: duplicate keys fail. Unknown top-level keys fail with `unknown setting <key>`. See the focused references for validation rules within each setting.

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

## Split and combine config files

These directives compose configuration values. Paths resolve relative to the file declaring them. For complete examples, merge order, and troubleshooting, follow [Configure your project](https://www.shoalrun.com/configuration.md).

### `$include`

`{ $include: ./path.yaml }` replaces a value at any depth with the contents of another YAML file. The mapping can have no other keys. Included files can include others; a cycle fails with `Configuration cycle` and the chain of files. Normal inheritance rules apply to the resolved value.

### `extends`

A top-level `extends: [./base.yaml]` layers one or more presets in order, followed by the current file. Mappings merge key by key; lists and scalar values replace earlier values. Presets may extend other presets. A top-level `extends` always names config files, including in an included file; it cannot serve another purpose there.

### `$concat` and `$remove`

`{ $concat: [...] }` appends items to an inherited list, or becomes the list when none is inherited. It also accepts included lists. `{ $remove: [name, ...] }` removes inherited mapping keys by name or list items by `id`; it fails when nothing is inherited.

Run `shoalrun config explain <key> docs.config.yaml` to inspect a value's source and overrides. See the [CLI reference](https://www.shoalrun.com/cli.md) for other inspection commands.

## Settings by key

Use these links to jump directly to a setting in its focused reference.

### `search`

See [search settings](https://www.shoalrun.com/config/integrations.md#search).

### `authoring`

See [authoring settings](https://www.shoalrun.com/config/content.md#authoring).

### `site`

See [site settings](https://www.shoalrun.com/config/site.md#site).

#### `site.agentDiscovery`

See [site.agentDiscovery settings](https://www.shoalrun.com/config/site.md#site-agentdiscovery).

#### Content freshness

See [Content freshness settings](https://www.shoalrun.com/config/site.md#content-freshness).

### `theme`

See [theme settings](https://www.shoalrun.com/config/site.md#theme).

### `publications`

See [publications settings](https://www.shoalrun.com/config/publishing.md#publications).

### `navigation`

See [navigation settings](https://www.shoalrun.com/config/publishing.md#navigation).

### `redirects`

See [redirects settings](https://www.shoalrun.com/config/publishing.md#redirects).

### `apis`

See [apis settings](https://www.shoalrun.com/config/apis.md#apis).

### `audit`

See [audit settings](https://www.shoalrun.com/config/apis.md#audit).

#### Agent evaluation reports

See [Agent evaluation reports settings](https://www.shoalrun.com/config/apis.md#agent-evaluation-reports).

### `cookbooks`

See [cookbooks settings](https://www.shoalrun.com/config/content.md#cookbooks).

### `relationships`

See [relationships settings](https://www.shoalrun.com/config/content.md#relationships).

### `variables`

See [variables settings](https://www.shoalrun.com/config/content.md#variables).

### `snippets`

See [snippets settings](https://www.shoalrun.com/config/content.md#snippets).

### `callouts`

See [callouts settings](https://www.shoalrun.com/config/content.md#callouts).

### `badges`

See [badges settings](https://www.shoalrun.com/config/content.md#badges).

### `templates`

See [templates settings](https://www.shoalrun.com/config/content.md#templates).

### `readerFilters`

See [readerFilters settings](https://www.shoalrun.com/config/content.md#readerfilters).

### `frontmatter`

See [frontmatter settings](https://www.shoalrun.com/config/content.md#frontmatter).

### `mcp`

See [mcp settings](https://www.shoalrun.com/config/integrations.md#mcp).

### `analytics`

See [analytics settings](https://www.shoalrun.com/config/integrations.md#analytics).

### `metadata`

See [metadata settings](https://www.shoalrun.com/config/outputs.md#metadata).

### `exports`

See [exports settings](https://www.shoalrun.com/config/outputs.md#exports).

### `outputs`

See [outputs settings](https://www.shoalrun.com/config/outputs.md#outputs).

#### Agent discovery index

See [Agent discovery index settings](https://www.shoalrun.com/config/outputs.md#agent-discovery-index).

## Related reading

### Read first

- [How Shoalrun works](https://www.shoalrun.com/concepts.md) — Understand publications, stable IDs, and config composition before changing settings.

### Related topics

- [CLI reference](https://www.shoalrun.com/cli.md) — Build, serve, and inspect a config from the command line.

- [Example configs](https://www.shoalrun.com/config/examples.md) — The same settings, combined into complete, working files.
