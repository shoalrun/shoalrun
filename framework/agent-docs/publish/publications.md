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

## Publish versions without a product catalog

If your site doesn't need independent products, use a root version catalog. This config publishes two versions at `/v1` and `/v2`:

```yaml title="docs.config.yaml (fragment)"
publications:
  defaults: { channel: production, version: v1, language: en }
  channels:
    production: { pathPrefix: "" }
  versions:
    v1: { pathPrefix: /v1 }
    v2: { pathPrefix: /v2 }
  enabled:
    - { channel: production, version: v1, language: en }
    - { channel: production, version: v2, language: en }
```

`enabled` sets the combinations the build may publish. It doesn't create pages or fill gaps in them. The paths come from the prefixes above plus each page's `slug`.

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

## Give each API version its own contract

When API behavior differs by version, bind an OpenAPI file to each publication in `apis.<name>.publications`. The top-level API `source` belongs to `publications.defaults`. With product publications in `0.1.0-alpha.18`, add `product` to each API publication binding; a top-level API `product` scopes its default source to that product. OpenAPI sources are shared across documentation languages within a product, channel, and version, and a published full source is emitted once for those translations. A shared guide can refer to the same stable operation ID in both versions; each version resolves that operation against its own API source. The build fails if a page needs an API operation but that publication has no source. See [API references](https://www.shoalrun.com/publish/api-references.md) for the config and [example configs](https://www.shoalrun.com/config/examples.md) for full projects.

## What agents receive

Sites with product catalogs provide a native publication dropdown grouped by product in HTML. It includes only published choices; language labels appear only when multiple languages are available. Selecting a choice uses browser JavaScript, with ordinary links available when JavaScript is disabled. Native keyboard interaction follows the browser's select control. Markdown retains each selected page and its links without a dropdown.

Each published page has a Markdown copy at its route plus `.md`, such as `/payments/v3/start.md` and `/reporting/v1/start.md` for the product example above. These are separate artifacts built from the same source file. Each copy includes only its own `<ForPublication>` sections, so an agent reading v1 instructions doesn't see v2-only text. `documents.json`, `search-index.json`, and the site's agent discovery files list the published variants and their Markdown URLs. A missing version of a page has no Markdown copy or search result. [Published outputs](https://www.shoalrun.com/publish/output.md) lists those files.

For channel and prefix rules, see the [publication configuration reference](https://www.shoalrun.com/config.md).

## Add a language

To add a language such as Japanese, add its combination to `enabled`, then write a translated file for each page with that `language`. The translated file reuses the page's `id` and `slug`, so it's another language of the same page:

```yaml title="docs.config.yaml"
publications:
  defaults: { channel: production, version: current, language: en }
  channels:
    production: { pathPrefix: "" }
  versions:
    current: { pathPrefix: "" }
  enabled:
    - { channel: production, version: current }
    - { channel: production, version: current, language: ja }
```

```yaml title="content/install.ja.mdx"
---
id: guide.install
title: インストール
summary: Acme のコマンドラインツールをインストールします。
slug: /install
language: ja
---
```

The Japanese page publishes at `/ja/install` with `lang="ja"`, and its Markdown copy is `/ja/install.md`. The default language keeps the ordinary route. Pages without a `language` are in the default language.

Shoalrun doesn't translate text. Your translation pipeline writes the files, one for each page and language. A page with no Japanese file has no Japanese version, and it gets no Markdown copy or search result there. To keep a language out of a build, leave it out of `enabled`.

## Related reading

### Reference while working

- [Configuration reference](https://www.shoalrun.com/config.md) — Look up publication defaults and route prefixes.

### Related topics

- [Use Git branches for separate docs sites](https://www.shoalrun.com/publish/revisions.md) — Distinguish content editions from source revisions and retained builds.

- [Build separate sites from shared content](https://www.shoalrun.com/publish/single-source-sites.md) — Publish separate sites from one content source using facet selections.
