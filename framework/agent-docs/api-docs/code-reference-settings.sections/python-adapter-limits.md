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

## Python adapter limits

The packaged adapter requires Python 3.11 or newer and `griffelib==2.4.1`. Its requirements file pins the dependency and archive hash. The source root must contain the requested local module and can't contain symlinks. Extraction rejects roots exceeding 10,000 Python source files or 32 MiB.

Extraction doesn't enable runtime inspection, extensions, external discovery, or alias resolution. The adapter skips aliases and underscore-prefixed members except constructors. It doesn't expand inherited members or execute decorators. Local constructors and supported simple dataclass constructors supply class signatures; unsupported cases stay unspecified. Factory defaults appear as `<factory>` in constructor signatures and retain the source expression in field details.
