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

## Map extension values to Shoalrun status

If a spec uses an `x-*` extension for availability, explicitly map its values to Shoalrun's status badges in the API config. This works with extension names from any OpenAPI authoring service:

```yaml title="config/api.yaml"
payments:
  source: { kind: file, path: ../apis/payments/openapi.yaml }
  mappings:
    subjectLifecycle:
      from: x-vendor-availability
      values:
        preview: beta
        building: in-development
        retired: deprecated
```

Only mapped values change a page's status. OpenAPI `deprecated: true` always yields **Deprecated**. An authored page can also set `subjectLifecycle` directly. The [OpenAPI extension mappings reference](https://www.shoalrun.com/publish/openapi-extension-mappings.md) specifies accepted scalar and nested value shapes, precedence, and how other extensions are handled.
