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
