---
id: guide.frontmatter
title: Page metadata
summary: Set page identity, publication, and presentation fields before publishing.
description: Learn how page metadata, project defaults, and publication choices
  shape the site and its Markdown output.
type: reference
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

**Updated: 2026-10-17.**

Parent page: [Full Markdown page](/author/frontmatter.md)

**Page reading path** — these links apply to the full page.

**Read first**

- [Content and stable IDs](https://www.shoalrun.com/author/content.md) — Understand stable IDs and publication variants first.

**Next steps**

- [Templates](https://www.shoalrun.com/author/templates.md) — Pre-fill these fields in the starting points for new pages.

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

## Audience badges

This page sets `audiences: [authors, maintainers]`, so its HTML header shows an **Intended audience** row with those two badges. Without [reader views](https://www.shoalrun.com/author/reader-views.md), write the labels as you want them displayed; they do not filter content. With an `audience` facet configured, use its choice IDs and Shoalrun displays the configured labels. A page without `audiences` has no audience row. Neither field restricts access; `access.policy` controls whether the page enters the public build.

The site's Markdown metadata projection also selects `frontmatter.audiences`, so [this page's Markdown twin](https://www.shoalrun.com/author/frontmatter.md) lists the same values in its YAML header. A site can omit that projection field if its Markdown readers do not need audience labels.
