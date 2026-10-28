---
id: reference.config-outputs
title: Output and export settings
summary: Configure metadata providers, application exports, Markdown headers,
  and discovery indexes.
type: reference
area: publishing
subarea: publishing-configuration
canonical: /config/outputs
---

# Output and export settings

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Reference](https://www.shoalrun.com/.well-known/shoalrun/navigation/reference-tab-50f26fe22670.txt) (ID: reference-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Reference](https://www.shoalrun.com/cli.md) > Configuration reference > Output and export

**Updated: 2026-10-28.**

Configure metadata providers, application exports, Markdown headers, and discovery indexes. These keys belong in `docs.config.yaml` or an included configuration file. For file composition and validation commands, see [Configure your project](https://www.shoalrun.com/configuration.md). Use the [configuration index](https://www.shoalrun.com/config.md) to find another setting.

## `metadata`

`metadata.provider.module` names an optional local module that exports `provideMetadata(context)`. The module can supply owned page fields to the build. The framework does not run an external vocabulary validator or publish supplied fields automatically. See [custom metadata](https://www.shoalrun.com/author/custom-metadata.md) for the return shape and ownership rule.

```yaml title="docs.config.yaml"
metadata:
  provider:
    module: ./metadata/provider.mjs
```

The path is relative to the config file that declares it. `provider` accepts only `module`.

## `exports`

Use [resource selectors](https://www.shoalrun.com/content-delivery/select.md) to select pages, approved sections, and named snippet instances.

Optional named targets for `shoalrun export`. They select portable application content independently of website navigation and `site.contentFilter`. The normal website build does not emit export bundles automatically. See [export content into an application](https://www.shoalrun.com/publish/content-export.md).

Each target accepts these fields:

| Field           | Default                                         | Meaning                                                                                                                  |
| --------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `formats`       | `[markdown, html]`                              | A nonempty unique list of `markdown` and/or `html`.                                                                      |
| `documents`     | All eligible pages when neither selector is set | Explicit document IDs. Missing, inaccessible, or export-filtered IDs fail. Mutually exclusive with `resources`.          |
| `resources`     | None                                            | Typed page, section, or snippet selectors. Mutually exclusive with `documents`.                                          |
| `publication`   | The only enabled publication                    | One complete `{ channel, version, language }` combination. Required when selection is ambiguous.                         |
| `contentFilter` | None                                            | Optional configured reader facets; every facet must match any listed choice. Unmarked pages do not match.                |
| `publicBase`    | `/`                                             | Root-relative mount with a trailing slash, such as `/help/`. It locates bundle content and assets in the app.            |
| `assetRoots`    | Content directory only                          | Extra local asset directories, relative to the declaring config file. Only referenced supported files are copied.        |
| `notices`       | Renderer notices only                           | Local text or Markdown license/notice files to retain in `NOTICES.txt`. Paths are relative to the declaring config file. |
| `apiReview`     | Matching API-level approval, if any             | API IDs mapped to reviewed SHA-256 digests for this export selection.                                                    |

```yaml
exports:
  app-help:
    formats: [markdown, html]
    documents: [guide.api-keys, guide.billing]
    publicBase: /help/
```

The export preserves whole-page content, including all reader sections. It flattens interactive components into readable static content and omits website/browser runtimes. Unsupported output, escaping assets, and unavailable document fallbacks fail. `exports` and its target fields are validated for unknown keys.

## `outputs`

Use `outputs` to configure the HTML, Markdown, discovery, and text artifacts produced by a build.

| Key                          | Meaning                                                                                                                                                                                                                             |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `markdown.metadata`          | The Markdown twin's YAML header: `format`, `fields`, `addFields`, `removeFields`, `omitNull`, `byType`, and `profiles`. `format` defaults to `none`. See [Markdown metadata](https://www.shoalrun.com/author/markdown-metadata.md). |
| `html.shareImages`           | `true`: a generated 1200×630 link-preview image per page. `false` turns them off; a mapping with `template` and `fonts` replaces the design. See [share images and favicon](https://www.shoalrun.com/styling/share-images.md).      |
| `html.highlighting`          | Code highlighting `provider`, `theme`, and `module`. Defaults to Shiki with the `site` theme, which takes code colors from the palette. See [code blocks](https://www.shoalrun.com/author/components/code-blocks.md).               |
| `html.navigation.showCounts` | Show page counts beside navigation groups. Defaults to `true`; set `false` to omit them. See [navigation](https://www.shoalrun.com/author/navigation.md).                                                                           |
| `html.search`                | Search `provider`, `module`, and `index`. See [search](https://www.shoalrun.com/author/search.md).                                                                                                                                  |
| `text`                       | Ordered frontmatter field paths for `card`, `pageHeader`, `search`, `htmlDescription`, and `socialCard`. See [custom metadata](https://www.shoalrun.com/author/custom-metadata.md).                                                 |

The build always writes `/llms.txt`, `documents.json`, `redirects.json`, and `resource-headers.json`; there are no settings for them.

A short Markdown header on every page:

```yaml title="docs.config.yaml"
outputs:
  markdown:
    metadata:
      format: yaml-frontmatter
      fields:
        id: frontmatter.id
        title: frontmatter.title
        summary: frontmatter.summary
        description: frontmatter.description
        canonical: publication.canonicalUrl
```

Add fields for one page type, and define a profile pages can select with `markdownMetadata: versioned`:

```yaml title="docs.config.yaml"
outputs:
  markdown:
    metadata:
      format: yaml-frontmatter
      fields: { id: frontmatter.id, title: frontmatter.title }
      byType:
        api-reference:
          addFields: { operations: frontmatter.operations }
      profiles:
        versioned:
          addFields: { version: publication.version, language: publication.language }
```

Use another Shiki theme, and turn off search:

```yaml title="docs.config.yaml"
outputs:
  html:
    highlighting: { provider: shiki, theme: github-light }
    search: { provider: none }
```

Plug in your own search and highlighter modules:

```yaml title="docs.config.yaml"
outputs:
  html:
    highlighting: { provider: custom, module: ./highlight.mjs }
    search: { provider: custom, module: ./search/hosted.js }
```

### Agent discovery index

Every published page is included automatically, using its title and frontmatter summary. You do not need to list page IDs. Omit `outputs.llms` for automatic grouping, or choose a bare alphabetical list of links and summaries:

```yaml title="docs.config.yaml"
outputs:
  llms:
    format: flat
```

`format` accepts `grouped` (the default) or `flat`. Flat mode includes all pages under `Pages`, without optional groups or repeated type labels. Discovery resources and API contracts remain linked, and fictional labels still apply. Grouping overrides are optional; `primaryIds` is an exception list, not an inventory.

`outputs.llms` controls grouping in `/llms.txt`. The build groups primary pages by type, puts secondary pages under `## Optional`, and lists `/search-index.json` under Discovery only when that file is generated. The complete manifest remains available for inventory. `fictionalPrefixes` also sets `demo: true` on matching pages in `documents.json`, `search-index.json`, and `search-index.min.json`. Matching uses the authored slug, including descendants, independently of publication or site path prefixes. Other pages receive `demo: false`, meaning unmarked rather than verified as a live service.

```yaml title="docs.config.yaml"
outputs:
  llms:
    primaryIds: [guide.components]
    optionalTypes: [recipe, ingredient, cookbook]
    optionalPrefixes: [/author/components]
    fictionalPrefixes: [/example-api]
```

`primaryIds` keeps named document IDs in their primary type section even when an optional type or prefix matches; fictional examples remain optional. Entries sort alphabetically within each section or optional group. Type labels appear only in the mixed optional groups. `optionalTypes` defaults to recipe, ingredient, and cookbook. Both prefix lists default to empty. Prefixes match page slugs before publication and base-path prefixes, on path boundaries. Fictional entries are always optional, labeled in the index, and carry a disclaimer in their Markdown twins. Use fictional prefixes only for synthetic examples, not real product API references.

## Related reading

### Read first

- [Organize project configuration](https://www.shoalrun.com/configuration.md) — Learn how files combine and how to validate configuration changes.

### Reference while working

- [Configuration reference](https://www.shoalrun.com/config.md) — Find configuration settings in another topic.
