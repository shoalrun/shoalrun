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

## Descriptions, type links, and source links

Descriptions don't run MDX or expand project directives. Raw HTML is stripped. Use `[Record](symbol:example.Record)` for a symbol link within the same catalog and publication. External links support HTTPS and mailto; relative links and images aren't supported.

Explicit type references create links in parameter, return, yield, base-class, exception, and field information. Signatures remain copyable code. The Python adapter resolves supported local annotation targets statically and keeps unknown or external targets unlinked.

Set `sourceLink.baseUrl` to a repository URL ending at the directory that contains the relative source paths. Include an immutable commit or release in that URL. A source path `sdk/models.py` with line `12` is appended as `/sdk/models.py#L12`. Shoalrun doesn't fetch or publish source files. Without this setting, source links are omitted.
