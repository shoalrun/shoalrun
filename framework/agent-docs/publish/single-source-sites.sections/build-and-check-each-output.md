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

## Build and check each output

From `resources/`, build each site into its own directory:

```sh
shoalrun build docs.config.yaml dist/main
shoalrun build developers.config.yaml dist/developers
shoalrun build europe.config.yaml dist/europe
```

Check each output's `documents.json` for its page IDs and routes. The main site contains all three pages. The developer site contains the overview and API guide. The European site contains the overview and operations guide beneath `/resources`. Inspect HTML, Markdown, search indexes, `llms.min.txt`, and the sitemap to confirm that excluded pages have no published entries or files. The runnable `faceted-sites` example ships with the framework's example configurations.

Deploy each output separately to its configured host. Building one site doesn't update the others. After editing shared content, rebuild and deploy every affected site. Keep output directories separate from sources and from one another because a successful build replaces its output directory.

Page selection applies to authored and generated pages before rendering. ForFacet then selects sections within retained pages, before headings and dependencies expand. ReaderSection remains a browser visibility control: its content stays in HTML and Markdown. Browser controls can't restore excluded pages or ForFacet sections. Use [publication blocks](https://www.shoalrun.com/publish/publications.md) when a section belongs to particular publications.

Configure API sources and operation selection separately. A published OpenAPI source may contain operations beyond the selected reference pages. Generated references use their resolved facet marks, including `readerFilters.typeDefaults`. This setting is a page publication selector, not authorization for private content; protect private deployments at the host.

For a help drawer or another application surface, [export the shared content](https://www.shoalrun.com/publish/content-export.md) instead of building another website. Export targets choose their own documents and produce portable content without the website shell.
