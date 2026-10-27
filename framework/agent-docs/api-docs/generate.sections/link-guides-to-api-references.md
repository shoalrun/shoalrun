---
id: guide.api-generation
title: Generate and select API pages
summary: Choose operations, generate reference pages, and add editorial context
  to an API reference.
type: how-to
area: api
subarea: api-generation
canonical: /api-docs/generate
---

# Generate and select API pages

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Document an API > Generate and select API pages

**Updated: 2026-10-26.**

Parent page: [Full Markdown page](/api-docs/generate.md)

**Page reading path** — these links apply to the full page.

**Read first**

- [Add an OpenAPI API](https://www.shoalrun.com/publish/api-references.md) — Register and review an API source before generating its pages.

**Next steps**

- [Organize site navigation](https://www.shoalrun.com/author/navigation.md) — Arrange selected operations in the site menu.

Start with a registered local API from [Add an OpenAPI API](https://www.shoalrun.com/publish/api-references.md). Use generation when you want references for many operations without writing an MDX page for each one. The commands below run in your documentation project with `SHOALRUN_CLI` set as in the quickstart.

## Link guides to API references

Add `relatedApiReferences` to a guide or how-to page to name API reference pages by stable document ID:

```yaml title="docs/content/write-note.mdx"
relatedApiReferences:
  - reference.create-note
  - reference.notes.getNote
```

This array contains two page IDs. One points to the authored Create a note reference; the other points to the generated Get a note reference. The build adds a **Related API references** list to the guide and a **Related guides** list to each named reference. Links use the current page titles and routes, so they stay correct when a slug changes. The lists appear in HTML and the Markdown twins. A missing ID or an ID for another page type fails the build; a reference unavailable in the guide's publication is omitted.

The [Write a note guide](https://www.shoalrun.com/example-api/write-note.md) uses this field to link to the [Create a note reference](https://www.shoalrun.com/example-api/create-note.md). You can inspect the generated lists at the bottom of both pages.
