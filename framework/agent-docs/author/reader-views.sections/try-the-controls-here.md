---
id: guide.reader-filters
title: Reader views
summary: Reader-view configuration, page and section marks, controls, and
  agent-facing behavior.
type: reference
area: discovery
subarea: discovery-reader-views
canonical: /author/reader-views
---

# Reader views

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Reader views

**Updated: 2026-10-25.**

Parent page: [Full Markdown page](/author/reader-views.md)

A reader view changes which pages appear in navigation and search. It also controls document cards and marked sections within pages. The site still publishes one URL for each page. A first-time visitor sees all content; a choice is saved in the browser and added to the URL so it can be shared.

Reader views are visibility controls, not access controls. All published page and section content remains available in site files and Markdown twins. Use `access.policy` to exclude a page from a public build, and host-level authorization to protect private content.

To build separate sites from the same source using these facets, use [build-time page selection](https://www.shoalrun.com/publish/single-source-sites.md) with `site.contentFilter`. That selector excludes unmatched pages from the output. A browser reader view continues to affect visibility within a published site.

## Try the controls here

### Filter the navigation

This site's **Focus** dropdown changes navigation, search, and document cards. The same control appears in the header on every page. Your choice persists across visits and can be shared in the URL.

- Choose **Write documentation** to bring forward pages about metadata, authoring, components, and API documentation. Pages about styling and deployment leave the navigation and search results.
- Choose **Configure & publish** to bring forward styling, search, chat, hosting, and deployment. Authoring-specific pages leave the navigation and search results.
- Choose **All** to see both paths. Foundational pages, such as [How Shoalrun works](https://www.shoalrun.com/concepts.md), stay in every view.

All published pages still work at their direct URLs. A focus choice is a reading aid, not an access rule.

This site's `focus` facet has `write` and `configure` choices. Generated API references use a `typeDefaults` mark of `write`. It also retains an internal `audience` facet for the hosted chat's author view and a `persona` facet for the page-only examples below. The header shows only Focus. These machine IDs contain no spaces; the longer labels are only shown to readers.

### Filter examples on this page

The controls below use a separate `persona` facet and `scope="page"`. They change the examples below without changing this site's navigation or search. Choose a reader to see one example, or use the controls to show both.

[Show UI example](https://www.shoalrun.com/author/reader-views?pageView=persona%3Aui)

[Show developer example](https://www.shoalrun.com/author/reader-views?pageView=persona%3Adeveloper)

**For Reader: UI reader.**

**UI example**

In a dashboard guide, show the menu names and screen actions a reader needs. This section appears when **UI reader** is selected.

**For Reader: Developer.**

**Developer example**

In an API guide, show the request, required fields, and expected response. This section appears when **Developer** is selected.

**Show all** in the multi-select keeps both sections visible on this page. **Follow site view** removes the page-only choice and returns to the site's current reader view. The page-only choice is shareable with **Copy view link** and is not saved across visits.
