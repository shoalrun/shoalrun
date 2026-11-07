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

## Select the pages for each site

The main site omits `contentFilter` and publishes all otherwise eligible pages:

```yaml title="docs.config.yaml"
extends: [./base.yaml]
site:
  origin: https://docs.example.com
navigation:
  - { id: home, doc: guide.home }
  - { id: api, doc: guide.api }
  - { id: operations, doc: guide.operations }
```

A developer site selects the audience facet and supplies navigation for its selected pages:

```yaml title="developers.config.yaml"
extends: [./base.yaml]
site:
  title: Acme developer resources
  origin: https://developers.example.com
  contentFilter: { audience: [developer] }
navigation:
  - { id: home, doc: guide.home }
  - { id: api, doc: guide.api }
```

A regional site selects the custom region facet independently of audience:

```yaml title="europe.config.yaml"
extends: [./base.yaml]
site:
  title: Acme Europe resources
  origin: https://eu.example.com
  basePath: /resources
  contentFilter: { region: [eu] }
navigation:
  - { id: home, doc: guide.home }
  - { id: operations, doc: guide.operations }
```

Every selected facet must match. Choices within one facet are alternatives: `{ audience: [developer, operator], region: [eu] }` requires either audience and the European region. A page without a mark for a selected facet is excluded. Mark shared pages with all applicable values rather than leaving them unmarked. Unknown facets or choices, empty selections, and selections with no published pages fail the build.

The selector doesn't rewrite publication metadata. Public access, enabled publications, and language still determine eligibility. Keep explicit navigation and page links within the selected set; missing targets fail validation rather than copying excluded pages into the output. Separate entry configs can replace inherited navigation lists.
