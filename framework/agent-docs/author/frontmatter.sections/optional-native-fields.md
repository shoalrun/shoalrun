---
id: guide.frontmatter
title: Page metadata
summary: Set page identity, publication, and presentation fields before publishing.
description: Learn how page metadata, project defaults, and publication choices
  shape the site and its Markdown output.
type: reference
area: authoring
subarea: authoring-metadata
audiences:
  - authors
  - maintainers
canonical: /author/frontmatter
agent:
  intent: Help authors understand and configure page metadata.
---

# Page metadata

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Metadata > Page metadata

**Updated: 2026-10-20.**

Parent page: [Full Markdown page](/author/frontmatter.md)

**Page reading path** — these links apply to the full page.

**Read first**

- [Content and stable IDs](https://www.shoalrun.com/author/content.md) — Understand stable IDs and publication variants first.

**Next steps**

- [Templates](https://www.shoalrun.com/author/templates.md) — Pre-fill these fields in the starting points for new pages.

- [Design and enforce a page taxonomy](https://www.shoalrun.com/author/taxonomy.md) — Define allowed page categories and enforce your project's taxonomy.

Frontmatter is the YAML header between the first two `---` lines of a `.md` or `.mdx` page. It gives a page its identity, URL, and publication settings. Start with this complete header, then write the page body below it:

```yaml
---
id: guide.first-page
title: Your first page
summary: Create and publish a page in your documentation site.
type: guide
slug: /first-page
channel: production
version: current
language: en
access: { policy: public }
---
```

Keep `id` stable when you rename a file or change its URL. Use it in [navigation](https://www.shoalrun.com/author/navigation.md) and links such as `[Your first page](doc:guide.first-page)`. To try the full workflow, [add a page](https://www.shoalrun.com/author/add-page.md).

See the [generated frontmatter reference](https://www.shoalrun.com/author/frontmatter-reference.md) under **Write documentation** for native and project-defined fields. Each build also writes `.shoalrun/frontmatter-reference.md` and `.shoalrun/frontmatter.schema.json` beside `docs.config.yaml` for local authoring.

## Optional native fields

These fields categorize pages, add connections, or change presentation. `product`, `area`, and `subarea` are optional string categories unless a project configures taxonomy requirements. `frontmatter.taxonomy.multiple` can allow lists for `area` or `subarea`. They work without a configured reader view and can be inherited from global frontmatter. `operations` joins a guide to endpoint references through stable API operation IDs. `relatedApiReferences` names specific API reference pages to link from a guide and back from each reference. `tags` helps document collections find the page. Cards use the target page's metadata when another page links to it. `subjectLifecycle` displays a status badge, while `markdownMetadata` controls the YAML preamble of the generated Markdown twin. `tocDepth` limits the HTML page's table of contents.

| Field                  | Type                               | Purpose                                                                                                                                                                                      |
| ---------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `showNavigationTabs`   | boolean                            | Override the HTML navigation tab bar. Defaults to visible for docs and wide layouts, hidden for landing and splash. Does not affect agent discovery.                                         |
| `product`              | nonempty string                    | Product category; selects the `product` reader facet if configured.                                                                                                                          |
| `area`                 | nonempty string or configured list | Area category; selects the `area` reader facet if configured.                                                                                                                                |
| `subarea`              | nonempty string or configured list | Finer category; selects the `subarea` reader facet if configured.                                                                                                                            |
| `operations`           | string array                       | Stable operation IDs associated with a guide or reference.                                                                                                                                   |
| `relatedApiReferences` | string array                       | API reference page IDs linked in both directions for a guide or how-to page.                                                                                                                 |
| `audiences`            | string array                       | Intended readers shown as badges; also selects the `audience` facet when [reader views](https://www.shoalrun.com/author/reader-views.md) are configured.                                     |
| `readerFilters`        | object of string arrays            | Choice IDs for configured reader facets, such as `product: [payments]`. Controls navigation, search, cards, and direct-link notices.                                                         |
| `tags`                 | string array                       | Editorial labels.                                                                                                                                                                            |
| `subjectLifecycle`     | string                             | `beta`, `in-development`, `experimental`, or `deprecated` status of the API or feature the page covers. An API reference for a deprecated OpenAPI operation gets `deprecated` automatically. |
| `subjectDeprecation`   | object                             | Page-specific deprecation and sunset dates, replacement ID, and migration guide ID for a deprecated subject; see below.                                                                      |
| `change`               | object                             | Optional authored kind, affected page IDs, and migration guide ID on a changelog entry; see [describe what changed](https://www.shoalrun.com/author/release-notes.md).                       |
| `lifecycle`            | string                             | Editorial state of the document. Shoalrun preserves it; a project can validate its values with a separate vocabulary tool.                                                                   |
| `tocDepth`             | integer                            | Deepest heading in the HTML table of contents; `0` hides it.                                                                                                                                 |
| `card`                 | object                             | Optional `title`, `description`, `eyebrow`, and Lucide `icon` for metadata-driven cards.                                                                                                     |
| `seo`                  | object                             | Page-level HTML title and description overrides; see below.                                                                                                                                  |
| `markdownMetadata`     | string or object                   | Named profile or page override for the Markdown twin's YAML preamble.                                                                                                                        |
| `displayText`          | object                             | Page-specific text for cards, the page header, search, HTML description, or social description.                                                                                              |
| `variables`            | object                             | Page-level public values for registered snippets.                                                                                                                                            |

For example, a page can use `product: payments`, `area: reporting`, and `subarea: settlements`. Those resolved values appear in `documents.json` and `search-index.json`. If the site config defines reader facets with those names, each value must be a configured choice ID and becomes that page's reader filter. Do not also set `readerFilters.product`, `.area`, or `.subarea` for the same field. Without a matching facet, the category is metadata only. A site's Markdown metadata projection can also select `frontmatter.product`, `frontmatter.area`, and `frontmatter.subarea`.

The default ToC includes headings through level 3. This page sets `tocDepth: 2`, so its ToC lists only the main sections. Use `tocDepth: 0` to suppress the ToC, or choose a depth from 2 through 6. Headings still appear in the page and Markdown twin when they are left out of the ToC.
