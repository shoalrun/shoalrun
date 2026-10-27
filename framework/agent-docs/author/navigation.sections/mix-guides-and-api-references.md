---
id: guide.navigation-lifecycle
title: Organize site navigation
summary: Arrange guides, reference pages, and other documents into a clear site menu.
type: how-to
area: appearance
subarea: appearance-navigation
canonical: /author/navigation
---

# Organize site navigation

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Configure and customize > Navigation > Overview

**Updated: 2026-10-27.**

Parent page: [Full Markdown page](/author/navigation.md)

The `navigation` setting controls the site's left menu. It can be a list in `docs.config.yaml` or import a separate YAML file. Add guides, tutorials, concepts, and reference pages by their stable document IDs. Nodes appear in the order you write them.

Each node has a stable `id` for the menu entry. It needs exactly one of these targets:

- `doc` places any page, including a guide or API reference, by its stable document ID.
- `label` with `items` makes a group of pages or nested groups.
- `operation` places an API reference by stable operation ID.
- `generated` fills in API references from the registered OpenAPI source.

The menu follows document IDs rather than file paths or slugs. Moving a source file or changing a page URL does not require a navigation edit. A `doc` node uses the page title by default; set `label` when the menu needs a shorter name. Pages omitted from navigation can still be built and linked from other pages.

## Mix guides and API references

An API reference is a document too, so `doc: reference.create-payment` works beside a task guide. Use `operation` when you want to place the reference by its stable operation ID instead. That ID is independent of the OpenAPI `operationId`, HTTP path, and page slug.

```yaml
- id: payments
  label: Payments
  items:
    - id: payment-guide
      doc: guide.create-payment
    - id: payment-api
      operation: payments.create
    - id: other-payment-api
      api: payments
      generated: tags
```

`generated: tags` groups the remaining endpoints by their first OpenAPI tag. Declared tag order and source operation order are retained **only for those remaining endpoints**. To override the position of a generated reference, add its stable operation ID as an explicit `operation:` entry at the desired point in this YAML list. You do not need to create an MDX page. An explicit `doc` or `operation` placement wins regardless of where the generator appears, so the same endpoint appears once. Leave out the generator when you want to choose every menu entry yourself. Navigation resolves separately for each channel, version, and language.

An API might tag every `/Query/` route as `Query`, while readers look for `GET /Query/widgets` under **Widgets**. Place its stable operation ID among the widget operations:

```yaml
- id: widgets
  label: Widgets
  items:
    - { id: get-widget, operation: widgets.getWidget }
    - { id: query-widgets, operation: widgets.queryWidgets }
    - { id: create-widget, operation: widgets.createWidget }
    - { id: other-widgets, api: widgets, generated: tags }
```

The menu shows Get widget, Query widgets, then Create widget in that order, regardless of the OpenAPI tag or source order. The `id` values name menu entries; the `operation` values select reference pages. The tag generator fills only endpoints not already placed. This works whether the reference is generated at build time or comes from an authored MDX page. For complete control, list every operation or document and omit `generated: tags`.
