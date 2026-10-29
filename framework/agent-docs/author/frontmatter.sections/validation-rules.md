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
