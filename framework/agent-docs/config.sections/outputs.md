---
id: reference.config
title: Configuration reference
summary: Every top-level setting in docs.config.yaml, with defaults, validation
  rules, and links to the full guides.
type: reference
area: publishing
subarea: publishing-configuration
canonical: /config
---

# Configuration reference

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Reference > Configuration reference

**Updated: 2026-10-20.**

Parent page: [Full Markdown page](/config.md)

**Page reading path** — these links apply to the full page.

**Read first**

- [How Shoalrun works](https://www.shoalrun.com/concepts.md) — Understand publications, stable IDs, and config composition before changing settings.

A project's config starts at `docs.config.yaml`. The CLI looks for that name by default, and `shoalrun scaffold -n` searches parent directories for it. For the configuration workflow, composition rules, and debugging, start with [configure your project](https://www.shoalrun.com/configuration.md). This page lists every top-level key. Keys with a dedicated guide link there for the full rules. For complete, working configs, see [example configs](https://www.shoalrun.com/config/examples.md).

The root file must be a YAML mapping with `schemaVersion: 1`. YAML is parsed strictly: duplicate keys fail. Any top-level key not listed here fails with `unknown setting <key>`. Keys nested inside `site`, `apis`, `publications`, and `outputs` are not all checked yet, so check spelling there carefully.

```yaml title="docs.config.yaml"
schemaVersion: 1
site:
  title: Example documentation
publications:
  defaults: { channel: production, version: current, language: en }
  channels:
    production: { pathPrefix: "" }
  versions:
    current: { pathPrefix: "" }
  enabled:
    - { channel: production, version: current }
navigation: { $include: ./config/nav.yaml }
```

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
