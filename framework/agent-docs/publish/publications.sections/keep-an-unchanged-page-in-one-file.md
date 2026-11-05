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

## Keep an unchanged page in one file

List the versions that should receive the page in its frontmatter. This one file creates `/v1/start` and `/v2/start`:

```mdx title="content/start.mdx"
---
id: guide.start
title: Get started
summary: Set up your first request.
type: guide
slug: /start
publications:
  - { channel: production, version: v1 }
  - { channel: production, version: v2 }
language: en
access: { policy: public }
---

Install the client and create a project.
```

The `publications` list is explicit: add a version when the page should appear there, and omit it when the page shouldn't. Only enabled combinations are built. Keep the same `id` and `slug` in every publication so links and the Version menu can find the corresponding page. A shared file can't also set page-level `channel` or `version`; product publications also exclude page-level `product`.
