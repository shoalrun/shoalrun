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

**Updated: 2026-10-20.**

Parent page: [Full Markdown page](/publish/api-references.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [ApiExample and ApiSchema](https://www.shoalrun.com/author/components/api-embeds.md) — Include named examples and selected schemas in your guides.

Add one authored API reference to the project created in the [quickstart](https://www.shoalrun.com/start.md). This walkthrough uses a fictional Notes API as its example. You will register an operation, write its introduction, add it to navigation, review the imported content, and verify its published files.

Run commands from the documentation project directory created in the quickstart, where `@shoalrun/cli` is installed. The commands use that local package. Check [OpenAPI support and limits](https://www.shoalrun.com/api-docs/support.md) before importing a larger specification.

## Put the spec in your project

Create `apis/notes/openapi.yaml` with this complete fictional API. It documents a response without calling a live service:

```yaml title="apis/notes/openapi.yaml"
openapi: 3.1.0
info: { title: Example Notes API, version: 1.0.0 }
paths:
  /notes:
    post:
      operationId: createNote
      summary: Create a note
      responses:
        '201':
          description: The note was created.
          content:
            application/json:
              schema:
                type: object
                required: [id]
                properties:
                  id: { type: string, description: The new note identifier. }
              examples:
                created:
                  summary: A created note
                  value: { id: note_123 }
```

OpenAPI 3.0 or 3.1 YAML and JSON files are accepted. There is no required directory name; a spec can also reference other local files.
