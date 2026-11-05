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

## Change just one part of a shared page

Put version-specific content inside `<ForPublication>`. The rest of the page stays shared:

```mdx
Create a project, then choose a credential.

<ForPublication version="v1">

Use a legacy key.

</ForPublication>

<ForPublication version="v2">

Use a scoped key. [Set permissions](doc:guide.permissions)

</ForPublication>
```

You can select a `product`, `channel`, `version`, `language`, or a combination, such as `<ForPublication product="payments" version="v3">`. Product selection requires a product catalog. Omitted attributes match any value. The block needs at least one attribute and ordinary block content. A `doc:` link inside a block resolves in that publication, so a v2-only target can live in a v2-only block.

If a whole page changes substantially, write separate source files with the same `id` and `slug`, each with its own `channel` and `version`. If a page exists only in v2, write only its v2 file. You don't need a blank v1 copy. The Version menu shows a matching page only where one was published.

| Source choice                                              | Result                                                                  |
| ---------------------------------------------------------- | ----------------------------------------------------------------------- |
| One file listing v1 and v2                                 | The same page appears at both paths.                                    |
| One file listing v1 and v2, with `<ForPublication>` blocks | Shared text appears in both; each version gets its own selected blocks. |
| Two files with the same ID, one for each version           | Each version gets different page content.                               |
| One file assigned only to v2                               | The page appears only in v2.                                            |

Run `shoalrun build docs.config.yaml dist` and inspect `dist/documents.json` for the actual pages and routes. Links, navigation, search, and the Version menu use those published variants. A link to a page missing from the current publication fails the build instead of sending readers to another version.
