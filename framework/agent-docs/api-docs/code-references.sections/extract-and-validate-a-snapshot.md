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

## Extract and validate a snapshot

Create an isolated Python environment and install the adapter's pinned requirements:

```sh
python3.11 -m venv .venv-reference
.venv-reference/bin/python -m pip install --require-hashes \
  -r node_modules/@shoalrun/cli/adapters/python/requirements.txt
mkdir -p reference
.venv-reference/bin/python node_modules/@shoalrun/cli/adapters/python/shoalrun_reference.py \
  --root ./src --module sample --style google --out ./reference/python.json
npx --no-install shoalrun references check ./reference/python.json
```

Use `--style google`, `numpy`, or `sphinx` to match the docstring convention. The adapter preserves signatures, supported docstring sections, local source locations, and resolved local type references. It skips aliases and underscore-prefixed members except constructors. It doesn't expand inherited members, execute decorators, or resolve external re-exports. Review the JSON before building.

The check reports `status: "ok"`, the programming language, and the symbol count. Duplicate IDs, missing referenced symbols, cyclic ownership, and invalid fields fail validation. A missing Python dependency stops extraction; Shoalrun doesn't install it during a site build.
