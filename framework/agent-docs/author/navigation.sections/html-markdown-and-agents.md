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

Parent page: [Full Markdown page](/author/navigation.md)

The `navigation` setting controls the site's left menu. It can be a list in `docs.config.yaml` or import a separate YAML file. Add guides, tutorials, concepts, and reference pages by their stable document IDs. Nodes appear in the order you write them.

Each node has a stable `id` for the menu entry. It needs exactly one of these targets:

- `doc` places any page, including a guide or API reference, by its stable document ID.
- `label` with `items` makes a group of pages or nested groups.
- `operation` places an API reference by stable operation ID.
- `generated` fills in API references from the registered OpenAPI source.

The menu follows document IDs rather than file paths or slugs. Moving a source file or changing a page URL does not require a navigation edit. A `doc` node uses the page title by default; set `label` when the menu needs a shorter name. Pages omitted from navigation can still be built and linked from other pages.

## HTML, Markdown, and agents

The build resolves the navigation list before publishing either format. HTML documentation pages show the current tab's hierarchy and shared navigation as links inside expandable groups. Without tabs, the sidebar shows the full hierarchy. The active page is marked `aria-current="page"`. JavaScript adds the sidebar filter; the links and groups remain usable without it. A page's breadcrumb trail also follows its navigation position.

The Markdown twin does **not** repeat the full sidebar on every page. It puts that page's breadcrumb path near the title—for example, `Write documentation > Components > Callouts`. The [document manifest](https://www.shoalrun.com/documents.json) records the same ordered path as a `breadcrumbs` array with labels and URLs where a level has a page. `/llms.txt` lists every published page with a link to its Markdown twin, including pages omitted from the sidebar.

An agent can use `/llms.txt` to discover pages and `/documents.json` to recover their hierarchy, then read the Markdown pages. Changing only how YAML files are split leaves the rendered navigation and breadcrumb paths unchanged; the manifest still records the included files as build dependencies. Moving or relabeling a page changes its HTML navigation, Markdown breadcrumb, and manifest path. The node's `search` words help only the HTML sidebar filter; they do not affect Markdown or agent search.
