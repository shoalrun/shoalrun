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

## Catalog settings

Use these fields inside `codeReferences.<catalog-id>`. Catalog IDs use lowercase letters, numbers, and dashes, starting with a letter.

| Field                | Meaning                                                                                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `source`             | `{ kind: file, path: ./reference.json }` for the default publication. Paths resolve relative to the declaring config file and must remain inside the project root. |
| `publications`       | Explicit `{ product?, channel, version, language?, source }` bindings. Declare this or `source`, not both.                                                         |
| `layout`             | `symbols` (default), `classes`, or `modules`. Changes inline grouping while retaining individual symbol pages.                                                     |
| `pathPrefix`         | Prefix for generated symbol slugs; defaults to `/reference/code`. Explicit symbol slugs take precedence.                                                           |
| `include`, `exclude` | Exact symbol IDs to select. Every listed ID must exist. Private symbols and descendants of private symbols aren't published.                                       |
| `symbols`            | Per-symbol `{ documentId?, slug?, metadata? }` overrides.                                                                                                          |
| `metadata`           | Ordinary page metadata, including taxonomy, reader filters, `shared`, and feature requirements. Project defaults and enforced metadata still apply.                |
| `sourceLink.baseUrl` | Optional HTTPS repository directory URL. Must omit credentials, query strings, and fragments.                                                                      |
| `singlePage`         | An optional object defining a complete reference page. Omit it or use `false` to disable it.                                                                       |

Generated pages have `type: code-reference`. Default document IDs combine the catalog and symbol IDs; IDs outside the simple identifier character set use a deterministic digest. Default slugs combine the path prefix, normalized symbol ID, and a digest. Use explicit overrides when a public URL or content-delivery identity must survive a symbol rename.
