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

**Updated: 2026-11-06.**

**Available since: 1.0.0.**

Parent page: [Full Markdown page](/api-docs/code-reference-settings.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [Generate code API references](https://www.shoalrun.com/api-docs/code-references.md) — Extract a Python snapshot and preview both grouped and complete SDK references.

`codeReferences` maps a catalog ID to a local converter snapshot and presentation settings. Start with [Generate code API references](https://www.shoalrun.com/api-docs/code-references.md) for a complete Python workflow. This setting is separate from `apis`, which registers OpenAPI sources.

## Metadata and selection

A symbol's explicit `shared` or `requires` classification replaces the catalog's classification. Requirements are evaluated separately for each symbol; a parent's feature requirements don't automatically apply to its children. Strictly classified projects need an explicit classification for eligible public symbols and the complete page. Inherited frontmatter defaults don't satisfy that source-classification requirement.

Visibility, feature grants, access policy, and build reader-filter selection apply before references are combined. An excluded type is left as plain text rather than linked to unavailable content. Reader views remain browsing controls; build/profile selection determines which content is published.
