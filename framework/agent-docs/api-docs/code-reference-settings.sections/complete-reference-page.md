---
id: reference.code-api-references
title: Code API reference settings
summary: Catalog configuration, converter snapshots, Python extraction limits,
  and generated reference behavior.
type: reference
area: api
subarea: api-generation
canonical: /api-docs/code-reference-settings
---

# Code API reference settings

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Document an API > Code API reference settings

**Updated: 2026-11-07.**

**Available since: 1.0.0.**

Parent page: [Full Markdown page](/api-docs/code-reference-settings.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [Generate code API references](https://www.shoalrun.com/api-docs/code-references.md) — Extract a Python snapshot and preview both grouped and complete SDK references.

`codeReferences` maps a catalog ID to a local converter snapshot and presentation settings. Start with [Generate code API references](https://www.shoalrun.com/api-docs/code-references.md) for a complete Python workflow, or use [TypeScript extraction](https://www.shoalrun.com/api-docs/typescript-references.md) for a public source or declaration entry point. This setting is separate from `apis`, which registers OpenAPI sources.

## Complete reference page

The `singlePage` object accepts these fields. No complete page is emitted when its selection contains no eligible symbols.

| Field        | Default or behavior                                   |
| ------------ | ----------------------------------------------------- |
| `documentId` | `reference.<catalog-id>.complete`                     |
| `slug`       | `<pathPrefix>/all`                                    |
| `title`      | `Complete API reference`                              |
| `summary`    | `Classes, functions, and fields in this publication.` |
| `metadata`   | Overrides the catalog's metadata for this page.       |

Grouped and complete pages use outline depth two unless frontmatter supplies another depth. Each embedded symbol gets a section heading. Links to embedded symbols target that section; ordinary symbol URLs remain valid for external links and content delivery.
