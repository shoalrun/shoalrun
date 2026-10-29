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
