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

## Include additional sections in a build

Use [ForFacet](https://www.shoalrun.com/author/components/for-facet.md) for additional instructions inside a shared page. The component uses the same resolved build filter, with no profile file:

```mdx
<ForFacet audience="operator">

## Operational checks

Record the job identifier before replaying a failed job.

</ForFacet>
```

The developer build omits this block. The unfiltered main build includes it. A build that only filters region also includes it because audience isn't selected. Use whitespace-separated alternatives, such as `audience="developer operator"`; multiple facet attributes must all match.

**Unmarked sections remain included. Pages without a mark for a selected facet are excluded.** Mark the containing page for every intended audience. Section selection adds information; an unfiltered build includes every valid block rather than choosing one replacement variant.

## Build and check each output

From `resources/`, build each site into its own directory:

```sh
shoalrun build docs.config.yaml dist/main
shoalrun build developers.config.yaml dist/developers
shoalrun build europe.config.yaml dist/europe
```

Check each output's `documents.json` for its page IDs and routes. The main site contains all three pages. The developer site contains the overview and API guide. The European site contains the overview and operations guide beneath `/resources`. Inspect HTML, Markdown, search indexes, `llms.min.txt`, and the sitemap to confirm that excluded pages have no published entries or files. The runnable `faceted-sites` example ships with the framework's example configurations.

Deploy each output separately to its configured host. Building one site doesn't update the others. After editing shared content, rebuild and deploy every affected site. Keep output directories separate from sources and from one another because a successful build replaces its output directory.

Page selection applies to authored and generated pages before rendering. ForFacet then selects sections within retained pages, before headings and dependencies expand. ReaderSection remains a browser visibility control: its content stays in HTML and Markdown. Browser controls can't restore excluded pages or ForFacet sections. Use [publication blocks](https://www.shoalrun.com/publish/publications.md) when a section belongs to particular publications.

Configure API sources and operation selection separately. A published OpenAPI source may contain operations beyond the selected reference pages. Generated references use their resolved facet marks, including `readerFilters.typeDefaults`. This setting is a page publication selector, not authorization for private content; protect private deployments at the host.

For a help drawer or another application surface, [export the shared content](https://www.shoalrun.com/publish/content-export.md) instead of building another website. Export targets choose their own documents and produce portable content without the website shell.

## HTML, Markdown, and agents

Each site's selected pages and sections determine its HTML, Markdown, search, and discovery content. Agents reading that artifact receive the selected instructions; browser reader controls don't change the published files. Inspect `.shoalrun/content-selection.json` for the latest artifact's effective filter, section decisions, and warnings. Portable exports use their own target filters; PDF exports inherit the site's filter unless overridden. Check each artifact before distributing it.

## Related reading

### Next steps

- [Deploy your documentation](https://www.shoalrun.com/publish.md) — Deploy each reviewed site output to its own destination.

### Reference while working

- [Configuration reference](https://www.shoalrun.com/config.md) — Look up content selection and configuration inheritance settings.

- [Reader views](https://www.shoalrun.com/author/reader-views.md) — Define the page facets used to select each site's content.

- [ForFacet](https://www.shoalrun.com/author/components/for-facet.md) — Look up section matching, export behavior, and selection reports.

### Related topics

- [Share pages across products and documentation versions](https://www.shoalrun.com/publish/publications.md) — Publish separate sites from one content source using facet selections.

- [Export content into your application](https://www.shoalrun.com/publish/content-export.md) — Reuse the same authored content inside an application.
