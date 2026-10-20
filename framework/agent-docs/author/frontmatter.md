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

## Required after inheritance

These fields identify a page and give it a route. `id` is the durable target for links and cards; `slug` is the URL path and may change without breaking those references. `summary` is short preview text. The optional `description` can explain the page more fully. A project chooses which field supplies each output surface.

The five fields in this table must exist after the compiler combines the page header with project-wide values. Only `id` and `slug` must always be written in the page itself. For instance, the project can set a default `type: guide` while each page keeps its own identity and URL.

| Field     | Type   | Purpose                                                            |
| --------- | ------ | ------------------------------------------------------------------ |
| `id`      | string | Stable identity; keep it when the filename, title, or URL changes. |
| `title`   | string | Page heading and default HTML title.                               |
| `summary` | string | Short preview for cards and other configured surfaces.             |
| `type`    | string | Document kind, such as `guide` or `api-reference`.                 |
| `slug`    | string | Explicit URL path before publication prefixes.                     |

These related fields are optional:

| Field            | Type   | Purpose                                                                                                                                |
| ---------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `description`    | string | Fuller account of what the page covers.                                                                                                |
| `updated`        | string | Last meaningful revision date; an opt-in [digest history](https://www.shoalrun.com/publish/seo.md) can derive it from content changes. |
| `verified`       | string | Author-set `YYYY-MM-DD` date when the technical claims were checked; independent of Updated.                                           |
| `date`           | string | Publication date in `YYYY-MM-DD` form; can identify a changelog entry.                                                                 |
| `releaseVersion` | string | Product release label; can identify a changelog entry. Separate from `version`.                                                        |

## Publication fields

Publication fields identify the channel, version, language, and access policy for a page.

| Field           | Type                           | Purpose                                                                                                             |
| --------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `channel`       | string                         | Publication channel, such as `sandbox` or `production`.                                                             |
| `version`       | string                         | API or documentation version.                                                                                       |
| `publications`  | list of `{ channel, version }` | Publish one source page in several channel/version combinations. Use instead of page-level `channel` and `version`. |
| `language`      | string                         | Optional content language; resolved from globals, publication defaults, then `en`.                                  |
| `locale`        | string                         | Optional conventions used for dates, numbers, and currency in the content; does not select a publication.           |
| `access.policy` | string                         | Set to `public` for a public page.                                                                                  |

Channel identifies an environment such as sandbox or production; version identifies an API or documentation edition; language identifies the content language. The resolved combination must be enabled in project config. `channel`, `version`, and `access` can come from global frontmatter. A language on the page overrides the default unless the project enforces one.

For an unchanged page that belongs in v1 and v2, replace its page-level `channel` and `version` with:

```yaml
publications:
  - { channel: production, version: v1 }
  - { channel: production, version: v2 }
```

Each entry must name a declared channel and version, and the pairs must be unique. Only enabled combinations publish. One source file uses one language; write a translated file for another language. To vary just part of a shared page, use `<ForPublication version="v2">` as shown in [share pages across versions](https://www.shoalrun.com/publish/publications.md).

## Publishing policy

`access.policy` controls whether a page is included in the generated site. Write it in the page's YAML header as `access: { policy: public }` when the page is ready to publish. New pages created by `shoalrun scaffold` start with `access: { policy: draft }` so you can finish them before publishing.

| Policy   | Build result                                                                  |
| -------- | ----------------------------------------------------------------------------- |
| `public` | Published if the page also matches an enabled channel, version, and language. |
| `draft`  | Checked for valid frontmatter, but omitted from the site.                     |

Only `public` publishes a page; other policy strings are treated like drafts. This setting controls build output, not reader sign-in or permissions. A site's global `frontmatter.defaults.access` can supply a policy for pages that omit it.

## Global defaults and enforced values

Set shared values under `frontmatter.defaults` in `docs.config.yaml`. Page values override defaults; `frontmatter.enforced` overrides page values. Objects merge recursively and arrays replace. Keep `id` and `slug` on each page.

```yaml title="docs.config.yaml"
frontmatter:
  defaults:
    type: guide
    channel: production
    version: current
    access: { policy: draft }
```

An explicit page policy of `public` publishes a finished page with these defaults. Enforcing `access.policy: public` also publishes pages explicitly marked draft, so use defaults when authors need drafts. For language precedence, locale formatting, migrations, and enforcement, see [global metadata rules](https://www.shoalrun.com/author/custom-metadata.md).

## Validation rules

The build reads every `.md` and `.mdx` file in the content directory, including drafts, and checks each header:

- The header must start on the first line of the file, and a key may appear only once.
- `slug` must start with `/` and cannot contain `..`, `?`, `#`, `%2f`, or `%5c`. Slugs under `/api` and `/.well-known` are reserved for published contracts and discovery files. Routes are compared without regard to case, so `/Guide` and `/guide` collide.
- Only `access.policy: public` publishes a page. Any other value, such as `draft`, keeps it out of every publication.
- A public page whose channel, version, and language match no enabled publication is skipped without a warning. If a page is missing from the output, check its publication fields first.
- A page with `publications` cannot also set page-level `channel` or `version`; a project-wide enforced channel or version must agree with every entry.
- A public page fails while it still contains a scaffold placeholder or a scaffolded summary. See [templates](https://www.shoalrun.com/author/templates.md) for the exact patterns.

`type` is free text, but some values change behavior. An `api-reference` page must list exactly one operation. `guide` and `how-to` pages can use `relatedApiReferences`. Any type can get its own Markdown metadata through [`byType` in Markdown metadata](https://www.shoalrun.com/author/markdown-metadata.md). The HTML page header shows the type as words: `api-reference` appears as "API reference".

[Design and enforce a page taxonomy](https://www.shoalrun.com/author/taxonomy.md) explains how to choose categories, define allowed values, and add required-field and pair checks to your build.

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

## Give deprecation guidance

Use `subjectDeprecation` when readers need dates or a path away from a deprecated API or feature. For example, a fictional legacy endpoint could declare:

```yaml
subjectLifecycle: deprecated
subjectDeprecation:
  deprecatedOn: 2026-10-15
  sunsetOn: 2027-01-15
  replacement: reference.new-endpoint
  migration: guide.migrate-endpoint
```

Replace the example IDs with public documents in the same channel, version, and language. Use stable IDs without the `doc:` prefix. Each target must be a different document; external URLs, missing targets, draft targets, and automatic fallback to another publication are not supported.

| Field          | Meaning                                                                   |
| -------------- | ------------------------------------------------------------------------- |
| `deprecatedOn` | Author-declared date when the subject is deprecated.                      |
| `sunsetOn`     | Author-declared date when the subject is scheduled to become unavailable. |
| `replacement`  | Stable ID of the page documenting the replacement.                        |
| `migration`    | Stable ID of the page explaining how to migrate.                          |

All four fields are optional, but the object must contain at least one. Unknown fields fail. Dates must be real `YYYY-MM-DD` calendar dates; when both are present, sunset cannot precede deprecation. The object stays page-specific and cannot appear in global defaults or enforced metadata. The resolved `subjectLifecycle` must be `deprecated`, whether authored or inferred from OpenAPI. A date does not change the status automatically or verify that a service has retired.

HTML, the full Markdown twin, and every published section resource show a subject deprecation notice with the supplied dates and links. HTML links open pages; Markdown links open their Markdown twins. `documents.json` carries the dates and resolved targets as `{ id, title, url, markdownUrl }` under `subjectDeprecation`. The manifest URLs are site paths, including any base path and publication prefix. Fetch-only readers can use the notice without parsing JSON or running JavaScript.

These fields describe the documented subject. They do not retire the documentation resource, emit HTTP `Deprecation` or `Sunset` headers, change access, or establish verification. Fictional-example flags, editorial `lifecycle`, and `verified` remain independent. Omitting lifecycle information does not imply stability or verification.

## Audience badges

This page sets `audiences: [authors, maintainers]`, so its HTML header shows an **Intended audience** row with those two badges. Without [reader views](https://www.shoalrun.com/author/reader-views.md), write the labels as you want them displayed; they do not filter content. With an `audience` facet configured, use its choice IDs and Shoalrun displays the configured labels. A page without `audiences` has no audience row. Neither field restricts access; `access.policy` controls whether the page enters the public build.

The site's Markdown metadata projection also selects `frontmatter.audiences`, so [this page's Markdown twin](https://www.shoalrun.com/author/frontmatter.md) lists the same values in its YAML header. A site can omit that projection field if its Markdown readers do not need audience labels.

## SEO fields

`seo` is a **top-level object in a page's frontmatter**. Its supported fields are nested inside it:

| Field             | Current effect                  | Default              |
| ----------------- | ------------------------------- | -------------------- |
| `seo.title`       | Sets the HTML `<title>`.        | Top-level `title`.   |
| `seo.description` | Sets the HTML meta description. | Top-level `summary`. |

```yaml
title: Create a payment
summary: Submit a payment with the example API.
seo:
  title: Create a payment | Example API
  description: Inspect the payment request and response.
```

There are no other supported `seo.*` fields yet. Configure social images separately in [share images](https://www.shoalrun.com/styling/share-images.md). Use global frontmatter for site-wide SEO defaults or enforced values. The compiler now rejects unsupported page-level SEO keys so they cannot silently have no effect.

## Related metadata tasks

Choose the guide for the metadata you want to configure:

| Task                                                           | Guide                                                                               |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Declare custom field types and public export eligibility       | [Custom page fields](https://www.shoalrun.com/author/custom-metadata.md)            |
| Choose text for cards, page headers, search, and link previews | [Text for each surface](https://www.shoalrun.com/author/custom-metadata.md)         |
| Load metadata from a local module                              | [Metadata providers](https://www.shoalrun.com/author/custom-metadata.md)            |
| Choose exported fields and named Markdown profiles             | [Published Markdown metadata](https://www.shoalrun.com/author/markdown-metadata.md) |
| Look up supported sources, protected fields, and precedence    | [Projection settings](https://www.shoalrun.com/author/markdown-metadata.md)         |

## Related reading

### Read first

- [Content and stable IDs](https://www.shoalrun.com/author/content.md) — Understand stable IDs and publication variants first.

### Next steps

- [Templates](https://www.shoalrun.com/author/templates.md) — Pre-fill these fields in the starting points for new pages.

- [Design and enforce a page taxonomy](https://www.shoalrun.com/author/taxonomy.md) — Define allowed page categories and enforce your project's taxonomy.

### Go deeper

- [Metadata customization](https://www.shoalrun.com/author/custom-metadata.md) — Declare project fields and read metadata from a local provider.

- [Markdown metadata](https://www.shoalrun.com/author/markdown-metadata.md) — Select the fields published in Markdown headers.

### Related topics

- [Cards and collections](https://www.shoalrun.com/author/components/cards.md) — Configure shared metadata and optional card text overrides.

- [Frontmatter field reference](https://www.shoalrun.com/author/frontmatter-reference.md) — The local inventory lists every field this project accepts, including custom ones.
