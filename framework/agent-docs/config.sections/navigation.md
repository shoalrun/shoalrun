---
id: reference.config
title: Configuration reference
summary: Every top-level setting in docs.config.yaml, with defaults, validation
  rules, and links to the full guides.
type: reference
area: publishing
subarea: publishing-configuration
canonical: /config
---

# Configuration reference

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Reference > Configuration reference

**Updated: 2026-10-19.**

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

## `navigation`

A list of sidebar nodes. Each node has a unique `id` and exactly one of `doc`, `operation`, `generated`, or `items`. Unknown node keys fail. See [navigation](https://www.shoalrun.com/author/navigation.md).

| Key         | Meaning                                                                                                                                       |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`        | Unique node ID. Required.                                                                                                                     |
| `doc`       | A page ID.                                                                                                                                    |
| `operation` | A stable operation ID; shows that operation's reference page.                                                                                 |
| `items`     | Child nodes, optionally loaded from another YAML list with `$include`; makes the node a group. Groups need a `label`.                         |
| `label`     | Menu text. Defaults to the page title for `doc` and `operation` nodes.                                                                        |
| `search`    | Extra words for the sidebar navigation filter, separate from site-wide search. Allowed on page and operation nodes, not groups or generators. |
| `api`       | Limits a group or generator to one API. Children inherit it.                                                                                  |
| `tab`       | Set `true` on a top-level group to give it a navigation tab and sidebar. Requires `landing`; nested tabs are rejected.                        |
| `landing`   | Stable ID of a page inside the tab's items. The tab links to that page in each publication.                                                   |
| `tag`       | An OpenAPI tag for a group that uses `generated: remaining`.                                                                                  |
| `generated` | `tags` or `remaining`. Adds generated reference pages.                                                                                        |

Pages and groups:

```yaml title="config/nav.yaml"
- id: start
  doc: guide.overview
- id: guides
  label: Guides
  items:
    - id: first-payment
      doc: guide.create-payment
      label: Your first payment
      search: checkout charge
    - id: errors
      doc: guide.handle-errors
```

Mix authored pages, a pinned API operation, and generated reference pages grouped by OpenAPI tag:

```yaml title="config/nav.yaml"
- id: payments
  label: Payments API
  api: payments
  items:
    - id: payment-guide
      doc: guide.create-payment
    - id: create-payment
      operation: payments.create
    - id: other-payment-pages
      generated: tags
```

Fill one hand-made group with the remaining operations for a tag:

```yaml title="config/nav.yaml"
- id: reports
  label: Reports
  api: payments
  tag: Reports
  items:
    - id: report-guide
      doc: guide.reports
    - id: report-operations
      generated: remaining
```
