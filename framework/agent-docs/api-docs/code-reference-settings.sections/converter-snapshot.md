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

## Converter snapshot

A converter writes JSON with `schemaVersion: 1`, `kind: shoalrun-code-reference`, a `programmingLanguage`, producer identity, and a nonempty `symbols` array. The package ships `schemas/code-reference.schema.json`; `shoalrun references check <snapshot.json>` also checks unique IDs, referenced targets, and acyclic parents.

This Kotlin-shaped example illustrates the shared contract. It doesn't imply a bundled Kotlin extractor:

```json
{
  "schemaVersion": 1,
  "kind": "shoalrun-code-reference",
  "programmingLanguage": "kotlin",
  "producer": { "name": "example-converter", "version": "1.0.0" },
  "symbols": [{
    "id": "example.greet",
    "name": "greet",
    "kind": "function",
    "summary": "Create a greeting.",
    "signatures": ["fun greet(name: String): String"],
    "parameters": [{ "name": "name", "type": "String", "description": "Reader name." }],
    "returns": { "type": "String", "description": "A greeting ready to display." }
  }]
}
```

Run a converter explicitly in your workflow, validate its output, then build. Shoalrun doesn't load executable converter plugins during compilation. JavaScript tools can import `validateCodeReference` from `@shoalrun/cli/references`.
