---
id: guide.navigation-lifecycle
title: Organize site navigation
summary: Arrange guides, reference pages, and other documents into a clear site menu.
type: how-to
canonical: /author/navigation
---

# Organize site navigation

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Customize > Navigation > Overview

**Updated: 2026-10-17.**

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

## Split navigation into tabs

Use navigation tabs for parallel sections such as Guides, API reference, and Recipes. Mark a top-level group with `tab: true` and name its landing page by stable document ID:

```yaml title="config/nav.yaml"
- id: guides
  label: Guides
  tab: true
  landing: guide.overview
  items:
    - { id: overview, doc: guide.overview }
    - { id: first-page, doc: guide.add-page }
- id: api
  label: API reference
  tab: true
  landing: guide.api-references
  items:
    - { id: api-intro, doc: guide.api-references }
    - { id: generated, api: notes, generated: tags }
```

Replace the example IDs and API name with your project's values. A tab ID uses lowercase letters, digits, and hyphens and starts with a letter. Tabs require a label, nonempty items, and a landing document inside those items. Nested tabs fail the build. A published page can belong to only one tab, or to shared navigation; placing it in both fails the build. Tabs whose items have no pages in a publication are omitted. A nonempty tab whose landing page is unavailable in that publication fails the build.

Each tab links to its landing page. The current page's URL selects its tab and sidebar on the server. Opening a direct link, following a search result, or navigating without JavaScript selects the same section. Groups outside tabs remain shared navigation. A page outside every tab shows the shared navigation with no tab selected. Existing navigation lists work without adding tabs. Tab placement does not change page URLs or publication routes.

The section links appear below the masthead on docs and wide pages. Landing and splash pages hide them by default. Set `showNavigationTabs: true` or `false` in page frontmatter to override the layout default; see [page layouts](https://www.shoalrun.com/styling/layouts.md). On smaller screens they use a Sections disclosure. They inherit each theme's typography and colors. Site-wide search still includes all sections; the sidebar filter searches only the current sidebar. Reader views can filter that sidebar without changing tab membership or agent discovery.

### Agent discovery across tabs

Both `/llms.min.txt` and `/llms.txt` keep every published page and add links to a scoped text index for each tab and publication. Follow the published `indexUrl`; do not construct it from the page's URL. Each scoped index links to all of that tab's Markdown pages and back to the global index, which also includes shared pages and pages omitted from navigation.

Each member page's Markdown identifies its navigation section, stable tab ID, and scoped index. Its breadcrumbs include the tab. `documents.json` publishes a `navigationTabs` catalog and a matching `navigationTab` record on each member page. Records contain `id`, `label`, `variant`, `url`, `markdownUrl`, and `indexUrl`. Both search indexes carry page membership too. The generated offline documentation bundle includes the scoped indexes.

Tab selection never removes page content from Markdown, filters the published inventory, or requires browser state. Navigation tabs provide links between pages; the [Tabs component](https://www.shoalrun.com/author/components/tabs.md) groups content inside one page. Neither replaces access policy or host authorization.

## Hide group page counts

Navigation groups show their page counts by default. To omit the counts from the HTML menu, set `outputs.html.navigation.showCounts` to `false`:

```yaml title="docs.config.yaml"
outputs:
  html:
    navigation:
      showCounts: false
```

The setting applies to every group, including nested groups and API navigation. The menu filter still finds pages and hides empty groups. Set `showCounts: true`, or omit it, to show counts again. This setting does not change Markdown output.

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

## HTML, Markdown, and agents

The build resolves the navigation list before publishing either format. HTML documentation pages show the current tab's hierarchy and shared navigation as links inside expandable groups. Without tabs, the sidebar shows the full hierarchy. The active page is marked `aria-current="page"`. JavaScript adds the sidebar filter; the links and groups remain usable without it. A page's breadcrumb trail also follows its navigation position.

The Markdown twin does **not** repeat the full sidebar on every page. It puts that page's breadcrumb path near the title—for example, `Write documentation > Components > Callouts`. The [document manifest](https://www.shoalrun.com/documents.json) records the same ordered path as a `breadcrumbs` array with labels and URLs where a level has a page. `/llms.txt` lists every published page with a link to its Markdown twin, including pages omitted from the sidebar.

An agent can use `/llms.txt` to discover pages and `/documents.json` to recover their hierarchy, then read the Markdown pages. Changing only how YAML files are split leaves the rendered navigation and breadcrumb paths unchanged; the manifest still records the included files as build dependencies. Moving or relabeling a page changes its HTML navigation, Markdown breadcrumb, and manifest path. The node's `search` words help only the HTML sidebar filter; they do not affect Markdown or agent search.

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

## Fill an API tag group

Set `api` and `tag` on a group, then add `generated: remaining` inside `items`:

```yaml
- id: reports-tools
  label: Reports tools
  api: payments
  tag: Reports
  items:
    - id: reports-rest
      generated: remaining
```

The build rejects unknown operation IDs, duplicate placements, and duplicate tag generators.

## Local API preview

The local API preview creates one page per source operation through the same compiler. With `--nav layout.yaml`, its layout can use source operation IDs; the preview converts them to stable IDs in its generated config:

```yaml
navigation:
  - id: featured
    label: Featured endpoints
    items:
      - operation: createPayment
  - generated: tags
```

The preview layout must cover every selected operation directly or through `generated: tags`. An authored project may intentionally omit pages from navigation.

## Subject lifecycle labels

Set `subjectLifecycle` to `beta`, `in-development`, `experimental`, or `deprecated` in page frontmatter. Navigation and page headers show a text badge. Markdown and the document manifest carry the same status.

OpenAPI `deprecated: true` marks an endpoint as deprecated and cannot be overridden by an editorial label. The preview layout can also assign a label by source operation ID. Labels communicate maturity; they do not control access.

For a deprecated subject, add [deprecation guidance](https://www.shoalrun.com/author/frontmatter.md) with optional dates, replacement, and migration references. These details appear in the article and Markdown resources; navigation keeps its concise status badge.

See [current limitations](https://www.shoalrun.com/status.md) for the remaining navigation and authoring work.

## Related reading

### Reference while working

- [Configuration reference](https://www.shoalrun.com/config.md) — Look up every field a navigation item accepts.

### Related topics

- [Generate and select API pages](https://www.shoalrun.com/api-docs/generate.md) — Generate the API reference pages that fill a tag group in the menu.

- [Breadcrumbs](https://www.shoalrun.com/author/components/breadcrumbs.md) — Understand the breadcrumb trails generated from navigation groups.
