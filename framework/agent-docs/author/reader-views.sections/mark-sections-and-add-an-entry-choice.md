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

## Mark sections and add an entry choice

Use `ReaderSection` for content that belongs to a narrower view within an otherwise shared page. Content outside these blocks stays visible to everyone. Sections can contain Markdown and supported MDX components, but reader sections cannot be nested.

```mdx title="content/get-started.mdx"
<ReaderChoice audience="ui" label="Use the dashboard" />
<ReaderChoice audience="developer" label="Build with the API" />

Everyone needs an account before starting.

<ReaderSection audience="ui">
Open **Settings** in the dashboard.
</ReaderSection>

<ReaderSection audience="developer" product="payments">
Create an API token, then run the payment CLI.
</ReaderSection>
```

`ReaderChoice` changes only the facets named on the button. It can set several facets at once, and comma-separated values select more than one choice within a facet.
