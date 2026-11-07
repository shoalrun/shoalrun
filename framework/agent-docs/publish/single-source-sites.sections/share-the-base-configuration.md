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

## Share the base configuration

Keep entry configs beside the base file so they resolve `contentDir` from the same directory:

```text
resources/
  base.yaml
  docs.config.yaml
  developers.config.yaml
  europe.config.yaml
  content/
    home.md
    api.md
    operations.md
```

Start with Shoalrun installed in your project. The base declares the content, publication, and available facet choices:

```yaml title="base.yaml"
schemaVersion: 1
site:
  title: Acme resources
  contentDir: content
publications:
  defaults: { channel: production, version: current, language: en }
  channels:
    production: { pathPrefix: "" }
  versions:
    current: { pathPrefix: "" }
  enabled:
    - { channel: production, version: current }
frontmatter:
  defaults:
    type: guide
    channel: production
    version: current
    access: { policy: public }
readerFilters:
  facets:
    audience:
      label: Audience
      options: { developer: Developers, operator: Operators }
    region:
      label: Region
      options: { eu: Europe, us: United States }
```

Each page needs its ordinary identity fields and the facet values for the sites that should receive it. This overview belongs to both audiences and both regions:

```yaml title="content/home.md frontmatter"
---
id: guide.home
title: Resource overview
summary: Shared setup for all resource sites.
slug: /
audiences: [developer, operator]
readerFilters: { region: [eu, us] }
---
```

Give `content/api.md` the ID `guide.api`, a unique slug such as `/api-requests`, `audiences: [developer]`, and `readerFilters: { region: [us] }`. Give `content/operations.md` the ID `guide.operations`, slug `/operations`, `audiences: [operator]`, and `readerFilters: { region: [eu] }`. Add a title, summary, and body to both files. Link either page to the overview with `[Shared setup](doc:guide.home)`.

The `audience` facet reads the page's `audiences` field. Configured `product`, `area`, and `subarea` facets read their corresponding category fields. Other facets use page-level `readerFilters`. Resolved `readerFilters.typeDefaults` also participate. See [reader views](https://www.shoalrun.com/author/reader-views.md) for these marks.
