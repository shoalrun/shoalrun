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

## Symbol fields

Each symbol needs `id`, `name`, and `kind`. Supported kinds are `module`, `namespace`, `class`, `interface`, `enum`, `type`, `function`, `method`, `constructor`, `property`, `attribute`, and `constant`.

Use these optional fields to describe the interface without supplying executable markup or an arbitrary syntax tree:

| Field                               | Meaning                                                                                                                                              |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `parent`                            | ID of an existing parent symbol. Cycles aren't allowed.                                                                                              |
| `visibility`                        | `public` by default, or `private`.                                                                                                                   |
| `summary`, `description`            | Short page summary and inert Markdown description.                                                                                                   |
| `signatures`                        | Array of declaration strings, including overloads.                                                                                                   |
| `parameters`                        | Array of `{ name, type?, description?, default? }`.                                                                                                  |
| `returns`, `yields`                 | `{ type?, description? }`.                                                                                                                           |
| `raises`                            | Array of `{ name, type?, description?, default? }`.                                                                                                  |
| `examples`                          | Array of `{ title?, code }`. Examples aren't executed.                                                                                               |
| `annotation`, `required`, `default` | Field type, whether a value must be supplied, and its default source expression. Unknown requirements stay unmarked. Nullable doesn't mean optional. |
| `bases`, `constructorSignature`     | Base-type strings and a constructor declaration for a class.                                                                                         |
| `typeReferences`                    | Mapping from exact type text to an existing symbol ID. Only eligible targets become links; Shoalrun doesn't guess short-name matches.                |
| `seeAlso`                           | Existing symbol IDs for related reference links.                                                                                                     |
| `source`                            | `{ path, line? }` with a relative provenance path and optional positive line number.                                                                 |

The snapshot can also include a SHA-256 `sourceDigest`. Unknown fields are rejected. Snapshots are limited to 10,000 symbols and 32 MiB; individual text fields have schema limits.
