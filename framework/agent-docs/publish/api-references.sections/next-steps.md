---
id: guide.api-references
title: Add an OpenAPI API
summary: Import a local OpenAPI file, author an operation page, review its
  public content, and build HTML and Markdown.
type: how-to
area: api
subarea: api-contracts
canonical: /publish/api-references
---

# Add an OpenAPI API

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Document an API > Add an OpenAPI API

**Updated: 2026-10-27.**

Parent page: [Full Markdown page](/publish/api-references.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [ApiExample and ApiSchema](https://www.shoalrun.com/author/components/api-embeds.md) — Include named examples and selected schemas in your guides.

Add one authored API reference to the project created in the [quickstart](https://www.shoalrun.com/start.md). This walkthrough uses a fictional Notes API as its example. You will register an operation, write its introduction, add it to navigation, review the imported content, and verify its published files.

Run commands from the documentation project directory created in the quickstart, where `@shoalrun/cli` is installed. The commands use that local package. Check [OpenAPI support and limits](https://www.shoalrun.com/api-docs/support.md) before importing a larger specification.

## Next steps

### Publish several versions

[Put multiple versions on one site](https://www.shoalrun.com/publish/publications.md) explains sources for each publication and stable operation bindings across versions.

### Map extension values to Shoalrun status

Use the [extension mappings reference](https://www.shoalrun.com/publish/openapi-extension-mappings.md) to map vendor `x-*` values to status badges.

### Describe filters that do not use their OpenAPI parameter name

The [query syntax example](https://www.shoalrun.com/api-docs/generate.md) configures direct query expressions and generated cURL.

### Generate many pages selectively

[Generate and select API pages](https://www.shoalrun.com/api-docs/generate.md) covers include/exclude lists, stable generated IDs, webhooks, interactive selection, and tag navigation.

### Use a template for editorial context

[API reference templates](https://www.shoalrun.com/api-docs/generate.md) add editorial prompts without duplicating contract fields.

### Add useful examples

[Named examples and generated commands](https://www.shoalrun.com/api-docs/generate.md) explains example selection, JSON shapes, and cURL behavior.

### Link guides to API references

[Related API references](https://www.shoalrun.com/api-docs/generate.md) connects guides and references in both directions using stable page IDs.
