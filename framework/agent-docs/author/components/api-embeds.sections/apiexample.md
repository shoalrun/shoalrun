---
id: guide.component.api-embeds
title: ApiExample and ApiSchema
summary: Include named OpenAPI examples and selected schemas in authored pages.
type: reference
canonical: /author/components/api-embeds
---

# ApiExample and ApiSchema

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Components > ApiExample and ApiSchema

**Updated: 2026-10-18.**

Parent page: [Full Markdown page](/author/components/api-embeds.md)

**Page reading path** — these links apply to the full page.

**Read first**

- [Add an OpenAPI API](https://www.shoalrun.com/publish/api-references.md) — Register the OpenAPI source these components read from.

`ApiExample` and `ApiSchema` reuse OpenAPI content in authored pages. Examples stay synchronized with named payloads; schemas expose selected field definitions in HTML and Markdown.

## ApiExample

`<ApiExample>` copies a named example from the OpenAPI source bound to a stable operation ID. Use it in a guide when the full payload should stay synchronized with the reference.

### Syntax

```mdx
<ApiExample operation="notes.create" kind="response" status="201" mediaType="application/json" example="saved" />
```

| Attribute   | Required      | Meaning                                          |
| ----------- | ------------- | ------------------------------------------------ |
| `operation` | Yes           | Stable operation ID bound to an API source.      |
| `kind`      | Yes           | `request` or `response`.                         |
| `mediaType` | Yes           | Exact media type in the source.                  |
| `example`   | Yes           | Key in that media type's OpenAPI `examples` map. |
| `status`    | For responses | Response status, such as `201`.                  |

The element is standalone and empty, with literal string attributes. It resolves in the page's publication. HTML and Markdown show the example title, original key, context, description when present, provenance, and value. A missing selector fails the build. API includes cannot be nested inside snippets. See [API references](https://www.shoalrun.com/publish/api-references.md) for source configuration and [example presentation](https://www.shoalrun.com/api-docs/generate.md) in reference pages.

The fictional Notes API returns a saved note with its author, labels, and display metadata. The response includes a required but nullable `archivedAt` field: `null` means the note is active.

### Created release note

OpenAPI response 201; application/json. Example key: saved. Authored in OpenAPI.

An active note with a nested author, two labels, and optional display metadata.

```json
{
  "id": "note_123",
  "text": "Review the release candidate.",
  "createdAt": "2026-10-18T09:30:00Z",
  "archivedAt": null,
  "author": {
    "id": "usr_42",
    "displayName": "Morgan Lee"
  },
  "tags": [
    "release",
    "review"
  ],
  "metadata": {
    "source": "release-checklist",
    "pinned": true
  }
}
```

### Markdown twin

During the build, Shoalrun selects the named example from the OpenAPI source for this page's publication and replaces `<ApiExample>` with ordinary content. An agent reading the generated `.md` page does not need to resolve the component or fetch the OpenAPI file. The example above renders as:

````md
### Created release note

OpenAPI response 201; application/json. Example key: saved. Authored in OpenAPI.

An active note with a nested author, two labels, and optional display metadata.

```json
{
  "id": "note_123",
  "text": "Review the release candidate.",
  "createdAt": "2026-10-18T09:30:00Z",
  "archivedAt": null,
  "author": {
    "id": "usr_42",
    "displayName": "Morgan Lee"
  },
  "tags": [
    "release",
    "review"
  ],
  "metadata": {
    "source": "release-checklist",
    "pinned": true
  }
}
```
````

An OpenAPI description appears between the context line and payload when present. JSON-compatible values use a `json` fence; string values with a `text/*` media type use a `text` fence. If the source uses `externalValue`, the twin shows an **External example** link instead of an inline payload. A response example's context includes its status, such as `response 201; application/json`.
