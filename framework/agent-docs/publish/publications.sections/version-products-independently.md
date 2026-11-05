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

## Version products independently

Since 0.1.0-alpha.18

Declare each product under `publications.products`. In this example, Payments has v2 and v3, while Reporting has only v1:

```yaml title="docs.config.yaml (fragment)"
publications:
  defaults: { channel: production, language: en }
  channels:
    production: { pathPrefix: "" }
  products:
    payments:
      label: Payments
      pathPrefix: /payments
      defaultVersion: v3
      versions:
        v2: { pathPrefix: /v2 }
        v3: { pathPrefix: /v3 }
    reporting:
      label: Reporting
      pathPrefix: /reporting
      defaultVersion: v1
      versions:
        v1: { pathPrefix: /v1 }
  enabled:
    - { product: payments, channel: production, version: v2 }
    - { product: payments, channel: production, version: v3 }
    - { product: reporting, channel: production, version: v1 }
```

A product publication includes `product`, `channel`, `version`, and `language`. Product IDs and version names are separate: Reporting doesn't acquire v3 because Payments has that version. A [customer profile](https://www.shoalrun.com/publish/deployment-profiles.md) can select Payments v3 with Reporting v1; another can select Payments v2 with the same Reporting release.

### Assign a page to a product release

Set the product and version in the page's frontmatter:

```yaml title="content/payments/start.mdx (frontmatter fragment)"
product: payments
channel: production
version: v3
language: en
slug: /start
```

With the catalog above, these page coordinates produce separate routes:

| Product     | Version | Page slug | Published route       |
| ----------- | ------- | --------- | --------------------- |
| `payments`  | `v2`    | `/start`  | `/payments/v2/start`  |
| `payments`  | `v3`    | `/start`  | `/payments/v3/start`  |
| `reporting` | `v1`    | `/start`  | `/reporting/v1/start` |

The product catalog permits these releases; it doesn't create their pages. Add source pages or explicit memberships for each route you want to publish.

Route prefixes are ordered as site base path, nondefault language, product, channel, version, then slug. Omitting a product page's version uses that product's `defaultVersion`; a valid `publications.defaults.version` overrides it only when `defaults.product` names that same product. An inherited global frontmatter version isn't a product default.

### Share a page across products

To reuse a source across products, list the full memberships explicitly:

```yaml title="Shared page frontmatter (fragment)"
publications:
  - { product: payments, channel: production, version: v3 }
  - { product: reporting, channel: production, version: v1 }
```

Don't also set page-level `product`, `channel`, or `version`. Keep one stable document ID and document type across these publications. `<ForPublication product="payments" version="v3">` can select a product-specific section. A `shared: true` feature classification doesn't publish a page into other products; it controls [customer feature selection](https://www.shoalrun.com/publish/deployment-profiles.md).

### Link between products

Ordinary `doc:` links, navigation, and version choices stay in the current product publication. To link deliberately across products, name the destination product and version:

```mdx
<DocLink doc="guide.start" product="reporting" version="v1">Start reporting</DocLink>
```

The link inherits the current channel and language unless you specify them. Its destination must be included in the selected build. Search and agent reads use product-qualified publications too; they don't substitute another product's similarly named version.

### Migrate existing product metadata

Without `publications.products`, `frontmatter.product` remains category metadata and an optional reader facet. Declaring a product catalog opts into publication identity: existing product values must name declared products, and each product's versions need their own catalog. Root `publications.versions` can remain for productless site pages; omit it when all enabled publications have products. Productless pages aren't automatically copied into product publications.

Review existing product values, move the relevant version definitions into each catalog, and add product coordinates to enabled publications and page memberships. Rebuild and check routes, links, navigation, search, and exports. Product prefixes change URLs; add [redirects](https://www.shoalrun.com/config/publishing.md) for old published paths.
