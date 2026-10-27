---
id: guide.component.api-embeds
title: ApiExample and ApiSchema
summary: Include named OpenAPI examples and selected schemas in authored pages.
type: reference
area:
  - components
  - api
subarea:
  - components-api
  - api-contracts
canonical: /author/components/api-embeds
---

# ApiExample and ApiSchema

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Reference](https://www.shoalrun.com/.well-known/shoalrun/navigation/reference-tab-50f26fe22670.txt) (ID: reference-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Reference](https://www.shoalrun.com/cli.md) > Components > ApiExample and ApiSchema

**Updated: 2026-10-27.**

Parent page: [Full Markdown page](/author/components/api-embeds.md)

**Page reading path** — these links apply to the full page.

**Read first**

- [Add an OpenAPI API](https://www.shoalrun.com/publish/api-references.md) — Register the OpenAPI source these components read from.

`ApiExample` and `ApiSchema` reuse OpenAPI content in authored pages. Examples stay synchronized with named payloads; schemas expose selected field definitions in HTML and Markdown.

## HTML, Markdown, and agents

The build resolves both components against the OpenAPI source for the page's publication. HTML presents examples and schema fields with their labels and context. Markdown expands them into ordinary text, lists, and code. An agent can read that content without fetching the source file or running browser scripts. Both outputs include the complete selected example or schema.
