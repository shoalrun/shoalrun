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

Navigation section: [Reference](https://www.shoalrun.com/.well-known/shoalrun/navigation/reference-tab-50f26fe22670.txt) (ID: reference-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Reference](https://www.shoalrun.com/cli.md) > Page metadata > Page metadata

**Updated: 2026-10-28.**

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
