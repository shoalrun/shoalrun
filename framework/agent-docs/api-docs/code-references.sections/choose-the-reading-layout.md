---
id: guide.code-api-references
title: Generate code API references
summary: Turn Python source and docstrings into SDK reference pages, with
  separate, grouped, or complete-page layouts.
type: how-to
area: api
subarea: api-generation
canonical: /api-docs/code-references
---

# Generate code API references

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Document an API > Generate code API references

**Updated: 2026-11-07.**

**Available since: 1.0.0.**

Parent page: [Full Markdown page](/api-docs/code-references.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [Generate TypeScript API references](https://www.shoalrun.com/api-docs/typescript-references.md) — Generate references from public TypeScript declarations and JSDoc.

A code API reference describes a library's classes, functions, methods, fields, parameters, return values, and exceptions. A guide explains how to accomplish a task; the reference explains what a programmer can call, what to pass, and what comes back. [OpenAPI references](https://www.shoalrun.com/publish/api-references.md) describe HTTP endpoints instead.

Shoalrun reads a converter's JSON snapshot and renders native reference pages. The optional Python adapter extracts local source and docstrings with Griffe. The [TypeScript adapter](https://www.shoalrun.com/api-docs/typescript-references.md) follows a public entry point's declarations and JSDoc. Other languages can supply a converter that writes the same [snapshot format](https://www.shoalrun.com/api-docs/code-reference-settings.md). A Kotlin-shaped snapshot is supported; a Kotlin extractor isn't bundled.

## Choose the reading layout

Use `layout` to control how much detail readers see on a parent page. Individual symbol URLs stay available in every layout. Group the class or module pages in navigation when you want fewer menu entries.

| Layout    | What readers see                                                                                            |
| --------- | ----------------------------------------------------------------------------------------------------------- |
| `symbols` | Separate symbol pages with linked member tables. This is the default.                                       |
| `classes` | Class pages include member details inline. Module pages include their direct functions and class overviews. |
| `modules` | A module page includes details for its classes, functions, and fields. Submodules form separate groups.     |

`singlePage` independently adds a complete reference for the catalog. It works with any layout. Set `symbolPages: false` alongside it to publish only the complete page. Update navigation and links to that page, and add redirects for previously published symbol URLs. Omit it or set `singlePage: false` to disable it. In a grouped or complete page, links to included symbols jump to their sections; other links retain individual symbol URLs. See the [configuration reference](https://www.shoalrun.com/api-docs/code-reference-settings.md) for defaults and metadata options.
