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

## Give each API version its own contract

When API behavior differs by version, bind an OpenAPI file to each publication in `apis.<name>.publications`. The top-level API `source` belongs to `publications.defaults`. With product publications in `0.1.0-alpha.18`, add `product` to each API publication binding; a top-level API `product` scopes its default source to that product. OpenAPI sources are shared across documentation languages within a product, channel, and version, and a published full source is emitted once for those translations. A shared guide can refer to the same stable operation ID in both versions; each version resolves that operation against its own API source. The build fails if a page needs an API operation but that publication has no source. See [API references](https://www.shoalrun.com/publish/api-references.md) for the config and [example configs](https://www.shoalrun.com/config/examples.md) for full projects.
