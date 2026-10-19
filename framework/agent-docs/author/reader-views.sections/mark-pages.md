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

**Updated: 2026-10-19.**

Parent page: [Full Markdown page](/author/reader-views.md)

A reader view changes which pages appear in navigation and search. It also controls document cards and marked sections within pages. The site still publishes one URL for each page. A first-time visitor sees all content; a choice is saved in the browser and added to the URL so it can be shared.

Reader views are visibility controls, not access controls. All published page and section content remains available in site files and Markdown twins. Use `access.policy` to exclude a page from a public build, and host-level authorization to protect private content.

## Mark pages

Use the existing `audiences` field for the `audience` facet. `product`, `area`, and `subarea` can each supply a single choice for a same-named facet. Use `readerFilters` for other facets or when a page needs multiple choices in one facet. All of these fields work with frontmatter defaults and enforced values.

```yaml title="content/payments-dashboard.mdx"
---
id: guide.payments-dashboard
title: Review payments in the dashboard
type: guide
slug: /payments/dashboard
audiences: [ui]
product: payments
area: reporting
subarea: settlements
---
```

When a facet is configured, `audiences` and same-named category values must use its choice IDs. You can instead use `readerFilters.audience` or `readerFilters.product`, but do not put both forms for the same facet on one page. An explicit page value overrides a `typeDefaults` value for that facet. Categories without matching configured facets remain taxonomy metadata only. Pages with no marks remain visible in every view.

The page marks control navigation, search, and cards that point to the page. They do not change its URL. A direct link to a page outside the current view opens the page in full. A notice offers actions to switch view or show all content.
