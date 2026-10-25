---
id: guide.custom-metadata
title: Metadata customization
summary: Configure metadata defaults, enforcement, fields, and providers.
type: reference
area: authoring
subarea: authoring-metadata
canonical: /author/custom-metadata
---

# Metadata customization

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Metadata > Metadata customization

**Updated: 2026-10-24.**

Parent page: [Full Markdown page](/author/custom-metadata.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [Markdown metadata](https://www.shoalrun.com/author/markdown-metadata.md) — Choose which eligible project fields to publish.

Use this guide when your project needs shared metadata rules or fields beyond the [native page metadata](https://www.shoalrun.com/author/frontmatter.md). To choose which values appear in published Markdown, see [Markdown metadata](https://www.shoalrun.com/author/markdown-metadata.md).

## Add a custom page field

The [page metadata guide](https://www.shoalrun.com/author/frontmatter.md) uses the optional, project-defined `agent.intent` field to record the task it helps a reader complete. Shoalrun does not require or interpret that field. A custom field has two parts: a **declaration** in project config and a **value** in a page header. The declaration appears in the [published field reference](https://www.shoalrun.com/author/frontmatter-reference.md) and the local generated reference; the value belongs to that page.

1. `docs/docs.config.yaml` loads the field declarations from a separate file:

   ```yaml title="docs/docs.config.yaml"
   frontmatter: { $include: ./config/frontmatter.yaml }
   ```

2. `docs/config/frontmatter.yaml` declares both fields used by that guide:

   ```yaml title="docs/config/frontmatter.yaml"
   fields:
     agent.intent:
       type: string
       description: The reader task this page helps an agent complete.
       public: true
     editorial.reviewNote:
       type: string
       description: Internal note for documentation reviewers.
       public: false
   ```

3. This page, `docs/content/frontmatter.mdx`, gives them these values:

   ```yaml title="docs/content/frontmatter.mdx"
   agent:
     intent: Help authors understand and configure page metadata.
   editorial:
     reviewNote: Check the frontmatter examples before release.
   ```

The config key `agent.intent` is a path. On the page, write it as an `agent` object with an `intent` value. The declaration checks that the value is a string and adds its description to the generated reference. `public: true` makes it eligible for the Markdown preamble; it does not export the value by itself.

Undeclared fields are allowed in source pages, but they have no project type check or export approval. Declarations cannot redefine built-in fields, `slug`, `channel`, `version`, or the [protected metadata roots](https://www.shoalrun.com/author/markdown-metadata.md). A dotted declaration such as `agent.intent` needs any declared parent, such as `agent`, to have type `object`. Declarations support `string`, `number`, `integer`, `boolean`, `object`, and `array`. They can also set `required`, `items` for arrays, or `enum` for scalar values.

For conditional source rules, such as requiring a verification date and evidence note together, see [check editorial policies with Manni](https://www.shoalrun.com/publish/manni.md). This optional check complements the field declarations above.
