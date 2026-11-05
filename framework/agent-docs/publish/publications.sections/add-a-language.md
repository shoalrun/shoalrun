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
