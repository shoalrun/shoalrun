---
id: guide.api-generation
title: Generate and select API pages
summary: Choose operations, generate reference pages, and add editorial context
  to an API reference.
type: how-to
area: api
subarea: api-generation
canonical: /api-docs/generate
---

# Generate and select API pages

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Document an API > Generate and select API pages

**Updated: 2026-10-27.**

Parent page: [Full Markdown page](/api-docs/generate.md)

**Page reading path** — these links apply to the full page.

**Read first**

- [Add an OpenAPI API](https://www.shoalrun.com/publish/api-references.md) — Register and review an API source before generating its pages.

**Next steps**

- [Organize site navigation](https://www.shoalrun.com/author/navigation.md) — Arrange selected operations in the site menu.

Start with a registered local API from [Add an OpenAPI API](https://www.shoalrun.com/publish/api-references.md). Use generation when you want references for many operations without writing an MDX page for each one. The commands below run in your documentation project with `@shoalrun/cli` installed as in the [quickstart](https://www.shoalrun.com/start.md).

## Describe filters that do not use their OpenAPI parameter name

Some APIs put filter expressions directly in the query string even though their OpenAPI description has one placeholder parameter. Opt in by path prefix so examples and generated cURL use the actual wire form:

```yaml title="config/api.yaml"
payments:
  source: { kind: file, path: ../apis/payments/openapi.yaml }
  querySyntax:
    - parameter: filters
      pathPrefixes: [/Query/]
      style: unwrapped
      example: FIELD(eq)=VALUE
```

For a matching operation, the reference explains the direct `?FIELD(eq)=VALUE` form and omits `filters=` from its generated cURL. The source's notes on accepted fields stay in a disclosure. Named examples with one field and value supply a more specific cURL filter. Other endpoints keep ordinary OpenAPI parameter behavior.

Next, [organize generated operations in navigation](https://www.shoalrun.com/author/navigation.md).
