---
id: guide.single-source-sites
title: Build separate sites from shared content
summary: Publish separate sites from shared content using optional facet selection.
type: how-to
area: publishing
subarea: publishing-configuration
canonical: /publish/single-source-sites
---

# Build separate sites from shared content

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Publish and maintain > Build separate sites from shared content

**Updated: 2026-11-07.**

Parent page: [Full Markdown page](/publish/single-source-sites.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [Deploy your documentation](https://www.shoalrun.com/publish.md) — Deploy each reviewed site output to its own destination.

You can keep one content directory and build separate sites for any configured facet: audience, product, area, subarea, or a custom facet such as region. Each entry config can have its own origin, base path, branding, navigation, and output directory. A developer portal is one example; the same workflow applies to an operations site, a product site, or regional resources.

## HTML, Markdown, and agents

Each site's selected pages and sections determine its HTML, Markdown, search, and discovery content. Agents reading that artifact receive the selected instructions; browser reader controls don't change the published files. Inspect `.shoalrun/content-selection.json` for the latest artifact's effective filter, section decisions, and warnings. Portable exports use their own target filters; PDF exports inherit the site's filter unless overridden. Check each artifact before distributing it.
