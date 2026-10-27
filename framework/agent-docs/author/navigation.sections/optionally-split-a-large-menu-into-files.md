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

**Updated: 2026-10-27.**

Parent page: [Full Markdown page](/author/navigation.md)

The `navigation` setting controls the site's left menu. It can be a list in `docs.config.yaml` or import a separate YAML file. Add guides, tutorials, concepts, and reference pages by their stable document IDs. Nodes appear in the order you write them.

Each node has a stable `id` for the menu entry. It needs exactly one of these targets:

- `doc` places any page, including a guide or API reference, by its stable document ID.
- `label` with `items` makes a group of pages or nested groups.
- `operation` places an API reference by stable operation ID.
- `generated` fills in API references from the registered OpenAPI source.

The menu follows document IDs rather than file paths or slugs. Moving a source file or changing a page URL does not require a navigation edit. A `doc` node uses the page title by default; set `label` when the menu needs a shorter name. Pages omitted from navigation can still be built and linked from other pages.

## Optionally split a large menu into files

You can keep the whole navigation in one file, as this site's `config/nav.yaml` does. When a menu becomes difficult to edit, an `items` list can include another YAML file. Shoalrun resolves each `$include` relative to the file that contains it, so groups can include smaller groups.

One possible layout is:

- config

  - nav.yaml

  - nav

    - author.yaml

    - components.yaml

The files above could contain:

```yaml title="docs.config.yaml"
navigation: { $include: ./config/nav.yaml }
```

```yaml title="config/nav.yaml"
- id: author
  label: Write documentation
  items: { $include: ./nav/author.yaml }
```

```yaml title="config/nav/author.yaml"
- id: components
  label: Components
  items: { $include: ./components.yaml }
- { id: first-page, doc: guide.first-page }
```

```yaml title="config/nav/components.yaml"
- { id: component-index, doc: guide.components }
- { id: component-callout, doc: guide.component.callout }
```

Each fragment contains the list for its `items`, without an extra `items:` wrapper. The order of included items is their order in the sidebar. The build tracks included files as dependencies and rejects cycles.

To join two lists inside one group, replace the single include above with [`$concat`](https://www.shoalrun.com/config.md):

```yaml title="config/nav/author.yaml"
- id: components
  label: Components
  items:
    $concat:
      - { $include: ./components-basics.yaml }
      - { $include: ./components-more.yaml }
```

```yaml title="config/nav/components-basics.yaml"
- { id: component-index, doc: guide.components }
- { id: component-callout, doc: guide.component.callout }
```

```yaml title="config/nav/components-more.yaml"
- { id: component-tabs, doc: guide.component.tabs }
- { id: component-fields, doc: guide.component.fields }
```

The Components group shows the two basics first, then Tabs and Fields. Each included file is a YAML list, and `$concat` joins them in the listed order. Splitting files changes authoring organization only; the rendered menu uses the resolved list.
