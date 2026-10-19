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

**Updated: 2026-10-19.**

Parent page: [Full Markdown page](/api-docs/generate.md)

**Page reading path** — these links apply to the full page.

**Read first**

- [Add an OpenAPI API](https://www.shoalrun.com/publish/api-references.md) — Register and review an API source before generating its pages.

**Next steps**

- [Organize site navigation](https://www.shoalrun.com/author/navigation.md) — Arrange selected operations in the site menu.

Start with a registered local API from [Add an OpenAPI API](https://www.shoalrun.com/publish/api-references.md). Use generation when you want references for many operations without writing an MDX page for each one. The commands below run in your documentation project with `SHOALRUN_CLI` set as in the quickstart.

## Use a template for editorial context

Use the built-in `api-reference` template for details OpenAPI cannot supply, such as operational context, task links, prerequisites, and limitations. Keep method, path, field lists, and example values in the spec so generated references have one source for those facts.

```sh
shoalrun scaffold api-reference -n content/create-enrollment.mdx \
  --id reference.create-enrollment --operation cedar.createEnrollment
```

No template registration is needed. The scaffold requires exactly one known stable operation ID. Check that the page ID matches that operation's `reference` entry in API config. A scaffold is a draft; replace every prompt and review the operation against the spec before publishing. The [Templates guide](https://www.shoalrun.com/author/templates.md) shows how to override the built-in outline for your project. Editing a template later affects new drafts, not existing pages.
