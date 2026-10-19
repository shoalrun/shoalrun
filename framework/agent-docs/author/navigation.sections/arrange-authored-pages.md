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

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Customize > Navigation > Overview

**Updated: 2026-10-19.**

Parent page: [Full Markdown page](/author/navigation.md)

The `navigation` setting controls the site's left menu. It can be a list in `docs.config.yaml` or import a separate YAML file. Add guides, tutorials, concepts, and reference pages by their stable document IDs. Nodes appear in the order you write them.

Each node has a stable `id` for the menu entry. It needs exactly one of these targets:

- `doc` places any page, including a guide or API reference, by its stable document ID.
- `label` with `items` makes a group of pages or nested groups.
- `operation` places an API reference by stable operation ID.
- `generated` fills in API references from the registered OpenAPI source.

The menu follows document IDs rather than file paths or slugs. Moving a source file or changing a page URL does not require a navigation edit. A `doc` node uses the page title by default; set `label` when the menu needs a shorter name. Pages omitted from navigation can still be built and linked from other pages.

## Arrange authored pages

```yaml
- id: overview
  doc: guide.overview
- id: learn
  label: Learn
  items:
    - id: first-steps
      doc: guide.first-steps
      label: First steps
    - id: core-concepts
      doc: concept.core
- id: tasks
  label: Tasks
  items:
    - id: create-payment
      doc: guide.create-payment
    - id: handle-errors
      doc: guide.handle-errors
```

Each `doc` value must match a page's frontmatter ID. Groups can contain other groups, so a larger site can place task guides under a product area. Use a structure that matches the reader's tasks; the source directory layout does not control the menu. The build rejects missing document IDs and malformed groups. For a publication where a page has no matching channel, version, or language, its menu entry is omitted. An empty group is omitted too.

Use `search` on an individual page or operation node to add terms to the reader's **sidebar menu filter**. The filter also matches the page label and its group labels. For example, `search: refunds returns` helps readers find a page whose title uses different words. This setting does not add terms to the site-wide search index; [site search](https://www.shoalrun.com/author/search.md) uses page content and search metadata. Groups and generators cannot have `search`.
