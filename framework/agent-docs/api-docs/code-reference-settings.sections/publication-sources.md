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

## Publication sources

Bind a snapshot to each interface release. This example assumes the `sdk` product and versions already exist in `publications`:

```yaml
codeReferences:
  sdk:
    publications:
      - product: sdk
        channel: production
        version: v1
        language: en
        source: { kind: file, path: ./reference/v1.json }
      - product: sdk
        channel: production
        version: v2
        language: en
        source: { kind: file, path: ./reference/v2.json }
```

Links, member tables, inline details, and complete references stay within the selected catalog and publication. A full snapshot isn't automatically published as a downloadable asset.
