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

**Updated: 2026-10-29.**

Parent page: [Full Markdown page](/author/navigation.md)

The `navigation` setting controls the site's left menu. It can be a list in `docs.config.yaml` or import a separate YAML file. Add guides, tutorials, concepts, and reference pages by their stable document IDs. Nodes appear in the order you write them.

Each node has a stable `id` for the menu entry. It needs exactly one of these targets:

- `doc` places any page, including a guide or API reference, by its stable document ID.
- `label` with `items` makes a group of pages or nested groups.
- `operation` places an API reference by stable operation ID.
- `generated` fills in API references from the registered OpenAPI source.

The menu follows document IDs rather than file paths or slugs. Moving a source file or changing a page URL does not require a navigation edit. A `doc` node uses the page title by default; set `label` when the menu needs a shorter name. Pages omitted from navigation can still be built and linked from other pages.

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

The section links appear below the masthead on docs and wide pages. Landing and splash pages hide them by default. Set `showNavigationTabs: true` or `false` in page frontmatter to override the layout default; see [page layouts](https://www.shoalrun.com/styling/layouts.md). On smaller screens, Menu opens a drawer containing these section links and the current sidebar. Closing the drawer restores focus and the article's scroll position. Without JavaScript, Menu links to navigation below the article and section links remain in a native disclosure. They inherit each theme's typography and colors. Site-wide search still includes all sections; the sidebar filter searches only the current sidebar. Reader views can filter that sidebar without changing tab membership or agent discovery.

### Agent discovery across tabs

Both `/llms.min.txt` and `/llms.txt` keep every published page and add links to a scoped text index for each tab and publication. Follow the published `indexUrl`; do not construct it from the page's URL. Each scoped index links to all of that tab's Markdown pages and back to the global index, which also includes shared pages and pages omitted from navigation.

Each member page's Markdown identifies its navigation section, stable tab ID, and scoped index. Its breadcrumbs include the tab. `documents.json` publishes a `navigationTabs` catalog and a matching `navigationTab` record on each member page. Records contain `id`, `label`, `variant`, `url`, `markdownUrl`, and `indexUrl`. Both search indexes carry page membership too. The generated offline documentation bundle includes the scoped indexes.

Tab selection never removes page content from Markdown, filters the published inventory, or requires browser state. Navigation tabs provide links between pages; the [Tabs component](https://www.shoalrun.com/author/components/tabs.md) groups content inside one page. Neither replaces access policy or host authorization.
