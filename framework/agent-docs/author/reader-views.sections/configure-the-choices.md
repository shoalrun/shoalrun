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

**Updated: 2026-10-23.**

Parent page: [Full Markdown page](/author/reader-views.md)

A reader view changes which pages appear in navigation and search. It also controls document cards and marked sections within pages. The site still publishes one URL for each page. A first-time visitor sees all content; a choice is saved in the browser and added to the URL so it can be shared.

Reader views are visibility controls, not access controls. All published page and section content remains available in site files and Markdown twins. Use `access.policy` to exclude a page from a public build, and host-level authorization to protect private content.

To build separate sites from the same source using these facets, use [build-time page selection](https://www.shoalrun.com/publish/single-source-sites.md) with `site.contentFilter`. That selector excludes unmatched pages from the output. A browser reader view continues to affect visibility within a published site.

## Configure the choices

Define the available reader choices once in `readerFilters.facets` in `docs.config.yaml`. The facet names and choices are yours; Shoalrun has no fixed list of reader types. Each facet and choice has a stable lowercase ID and a label for readers. Pages and sections refer to these IDs, and unknown IDs fail the build. `typeDefaults` is optional; it is useful when generated API references should start in the Developer view without marking every operation separately.

```yaml title="docs.config.yaml"
readerFilters:
  facets:
    audience:
      label: Reader
      options:
        ui: Use the UI
        developer: Build with the API
    product:
      label: Product
      options:
        payments: Payments
        reports: Reports
    area:
      label: Area
      options:
        reporting: Reporting
        setup: Setup
    subarea:
      label: Subarea
      options:
        settlements: Settlements
        exports: Exports
  typeDefaults:
    api-reference:
      audience: [developer]
  controls:
    sidebar: false
    header: { facet: audience, display: select, label: Reader }
```

Nothing is selected by default, so every page and section is visible. Readers can select more than one choice within a facet: a page marked for either selected choice appears. Different facets combine: a page marked `audience: [ui]` and `product: [payments]` appears when both selections match. A page with no mark for a facet is shared across that facet.
