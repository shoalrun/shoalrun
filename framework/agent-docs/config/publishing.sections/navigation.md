---
id: reference.config-publishing
title: Publications and routing settings
summary: Configure versions, languages, navigation, and redirects.
type: reference
area: publishing
subarea: publishing-configuration
canonical: /config/publishing
---

# Publications and routing settings

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Reference > Configuration reference > Publications and routing

**Updated: 2026-10-27.**

Parent page: [Full Markdown page](/config/publishing.md)

**Page reading path** — these links apply to the full page.

**Read first**

- [Organize project configuration](https://www.shoalrun.com/configuration.md) — Learn how files combine and how to validate configuration changes.

Configure versions, languages, navigation, and redirects. These keys belong in `docs.config.yaml` or an included configuration file. For file composition and validation commands, see [Configure your project](https://www.shoalrun.com/configuration.md). Use the [configuration index](https://www.shoalrun.com/config.md) to find another setting.

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
