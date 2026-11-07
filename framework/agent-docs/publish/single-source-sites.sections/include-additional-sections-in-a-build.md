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

## Include additional sections in a build

Use [ForFacet](https://www.shoalrun.com/author/components/for-facet.md) for additional instructions inside a shared page. The component uses the same resolved build filter, with no profile file:

```mdx
<ForFacet audience="operator">

## Operational checks

Record the job identifier before replaying a failed job.

</ForFacet>
```

The developer build omits this block. The unfiltered main build includes it. A build that only filters region also includes it because audience isn't selected. Use whitespace-separated alternatives, such as `audience="developer operator"`; multiple facet attributes must all match.

**Unmarked sections remain included. Pages without a mark for a selected facet are excluded.** Mark the containing page for every intended audience. Section selection adds information; an unfiltered build includes every valid block rather than choosing one replacement variant.
