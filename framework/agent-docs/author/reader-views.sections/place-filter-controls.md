---
id: guide.reader-filters
title: Reader views
summary: Reader-view configuration, page and section marks, controls, and
  agent-facing behavior.
type: reference
canonical: /author/reader-views
---

# Reader views

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Reader views

**Updated: 2026-10-01.**

Parent page: [Full Markdown page](/author/reader-views.md)

A reader view changes which pages appear in navigation and search. It also controls document cards and marked sections within pages. The site still publishes one URL for each page. A first-time visitor sees all content; a choice is saved in the browser and added to the URL so it can be shared.

Reader views are visibility controls, not access controls. All published page and section content remains available in site files and Markdown twins. Use `access.policy` to exclude a page from a public build, and host-level authorization to protect private content.

## Place filter controls

The site config above puts a compact reader dropdown in the header and removes the sidebar control. `controls.sidebar` defaults to `true`; `controls.header` is optional. Both can be present, and they stay in sync. Each header control accepts `facet`, `display: select` or `checks`, and an optional `label`. Omit `facet` to show every configured facet.

Authors can place the same controls inside a page:

```mdx
<ReaderFilter facet="audience" display="select" label="I use…" />
<ReaderFilter facet="product" display="checks" />
```

`select` allows one choice per facet and includes **All**. `checks` allows multiple choices and includes **Show all** and **Copy view link**. `<ReaderFilter />` controls every facet. The component is interactive in HTML and omitted from the Markdown twin; marked content and `ReaderChoice` links remain in Markdown.

Set `scope="page"` on an in-page `ReaderChoice` or `ReaderFilter` to control only marked sections and cards on the current page. The site-wide choice still controls navigation and search. Page-only choices use the `pageView` URL parameter for sharing; they do not enter local storage. With no page-only choice, the page follows the site view. A page-scoped multi-select includes **Follow site view** to return to that state. The default scope is `site`.
