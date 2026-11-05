---
id: guide.publications
title: Share pages across products and documentation versions
summary: Configure independent product versioning and reuse pages across
  releases, channels, and languages.
type: how-to
area: publishing
subarea: publishing-versions
canonical: /publish/publications
---

# Share pages across products and documentation versions

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Publish and maintain > Products, versions, and languages

**Updated: 2026-11-05.**

Parent page: [Full Markdown page](/publish/publications.md)

Publish documentation for different releases, channels, and languages from one content source. Keep common instructions in one file and select the content that changes between publications. If you document multiple products, each can have its own versions and defaults.

A **publication** identifies a product, channel, version, and language. For a site without product catalogs, it identifies just channel, version, and language. These coordinates determine which page variant readers and agents receive, including its route, links, and search scope.

This guide uses two fictional products, Payments and Reporting, to show independent releases. They're example names you replace with your own product IDs and labels.

A Git branch or tag chooses *which revision of the repository to build*; it doesn't automatically create a documentation version. See [publish separate docs sites from Git](https://www.shoalrun.com/publish/revisions.md) for that workflow. For audience or region selection using facets, see [build sites from shared content](https://www.shoalrun.com/publish/single-source-sites.md).

## What agents receive

Sites with product catalogs provide a native publication dropdown grouped by product in HTML. It includes only published choices; language labels appear only when multiple languages are available. Selecting a choice uses browser JavaScript, with ordinary links available when JavaScript is disabled. Native keyboard interaction follows the browser's select control. Markdown retains each selected page and its links without a dropdown.

Each published page has a Markdown copy at its route plus `.md`, such as `/payments/v3/start.md` and `/reporting/v1/start.md` for the product example above. These are separate artifacts built from the same source file. Each copy includes only its own `<ForPublication>` sections, so an agent reading v1 instructions doesn't see v2-only text. `documents.json`, `search-index.json`, and the site's agent discovery files list the published variants and their Markdown URLs. A missing version of a page has no Markdown copy or search result. [Published outputs](https://www.shoalrun.com/publish/output.md) lists those files.

For channel and prefix rules, see the [publication configuration reference](https://www.shoalrun.com/config.md).
