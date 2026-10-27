---
id: guide.publications
title: Share pages across documentation versions
summary: "Versioning one docs site without copying every page: share unchanged
  pages, vary sections, and publish changed pages separately."
type: how-to
area: publishing
subarea: publishing-versions
canonical: /publish/publications
---

# Share pages across documentation versions

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Publish and maintain > Share pages across documentation versions

**Updated: 2026-10-26.**

Say you support v1 and v2. Your setup instructions are mostly the same, but v2 has a new credential and one extra guide. You can keep the common instructions in **one source file**, show the right credential in each version, and publish the extra guide only in v2.

Shoalrun calls each channel, version, and language combination a **publication**. You choose which publications a build makes. A Git branch or tag chooses *which revision of the repository to build*; it does not automatically create a docs version. For separate sites such as stable and next, see [publish separate docs sites from Git](https://www.shoalrun.com/publish/revisions.md).

For separate sites selected by audience, product, region, or another configured facet, see [build sites from shared content](https://www.shoalrun.com/publish/single-source-sites.md). That workflow shares one content directory and uses a separate entry config and output directory for each site.

## Choose which versions exist

This config publishes two versions at `/v1` and `/v2`:

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

`enabled` sets the combinations the build may publish. It does not create pages or fill gaps in them. The paths come from the prefixes above plus each page's `slug`.

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

The `publications` list is explicit: add a version when the page should appear there, and omit it when the page should not. Only enabled combinations are built. Keep the same `id` and `slug` in every publication so links and the Version menu can find the corresponding page. A shared file cannot also set page-level `channel` or `version`.

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

You can select a `channel`, `version`, `language`, or a combination, such as `<ForPublication channel="sandbox" version="v2">`. Omitted attributes match any value. The block needs at least one attribute and ordinary block content. A `doc:` link inside a block resolves in that publication, so a v2-only target can live in a v2-only block.

If a whole page changes substantially, write separate source files with the same `id` and `slug`, each with its own `channel` and `version`. If a page exists only in v2, write only its v2 file. You do not need a blank v1 copy. The Version menu shows a matching page only where one was published.

| Source choice                                              | Result                                                                  |
| ---------------------------------------------------------- | ----------------------------------------------------------------------- |
| One file listing v1 and v2                                 | The same page appears at both paths.                                    |
| One file listing v1 and v2, with `<ForPublication>` blocks | Shared text appears in both; each version gets its own selected blocks. |
| Two files with the same ID, one for each version           | Each version gets different page content.                               |
| One file assigned only to v2                               | The page appears only in v2.                                            |

Run `shoalrun build docs.config.yaml dist` and inspect `dist/documents.json` for the actual pages and routes. Links, navigation, search, and the Version menu use those published variants. A link to a page missing from the current publication fails the build instead of sending readers to another version.

## Give each API version its own contract

When API behavior differs by version, bind an OpenAPI file to each publication in `apis.<name>.publications`. The top-level API `source` belongs to `publications.defaults`. A shared guide can refer to the same stable operation ID in both versions; each version resolves that operation against its own API source. The build fails if a page needs an API operation but that publication has no source. See [API references](https://www.shoalrun.com/publish/api-references.md) for the config and [example configs](https://www.shoalrun.com/config/examples.md) for full projects.

## What agents receive

Each published page has a Markdown copy at its route plus `.md`, such as `/v1/start.md` and `/v2/start.md`. These are separate artifacts built from the same source file. Each copy includes only its own `<ForPublication>` sections, so an agent reading v1 instructions does not see v2-only text. `documents.json`, `search-index.json`, and the site's agent discovery files list the published variants and their Markdown URLs. A missing version of a page has no Markdown copy or search result. [Published outputs](https://www.shoalrun.com/publish/output.md) lists those files.

For channel and prefix rules, see the [publication configuration reference](https://www.shoalrun.com/config.md).

## Add a language

To add a language such as Japanese, add its combination to `enabled`, then write a translated file for each page with that `language`. The translated file reuses the page's `id` and `slug`, so it is another language of the same page:

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

Shoalrun does not translate text. Your translation pipeline writes the files, one for each page and language. A page with no Japanese file has no Japanese version, and it gets no Markdown copy or search result there. To keep a language out of a build, leave it out of `enabled`.

## Related reading

### Reference while working

- [Configuration reference](https://www.shoalrun.com/config.md) — Look up publication defaults and route prefixes.

### Related topics

- [Use Git branches for separate docs sites](https://www.shoalrun.com/publish/revisions.md) — Distinguish content editions from source revisions and retained builds.

- [Build separate sites from shared content](https://www.shoalrun.com/publish/single-source-sites.md) — Publish separate sites from one content source using facet selections.
