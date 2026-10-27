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

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Components > ApiExample and ApiSchema

**Updated: 2026-10-26.**

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

## ApiSchema

`<ApiSchema>` includes a schema from a configured OpenAPI source. It can select a request or response body, a standalone object, or one field. Use it when readers need the exact source definition alongside task instructions.

### Syntax

```mdx
<ApiSchema operation="notes.create" kind="response" status="201" mediaType="application/json" />
```

| Attribute   | Required                | Meaning                                                                                         |
| ----------- | ----------------------- | ----------------------------------------------------------------------------------------------- |
| `operation` | For a body              | Stable operation ID bound to an API source.                                                     |
| `api`       | For a standalone schema | Configured API ID.                                                                              |
| `kind`      | With `operation`        | `request` or `response`.                                                                        |
| `mediaType` | With `operation`        | Exact media type.                                                                               |
| `status`    | For response bodies     | Response status, such as `201`.                                                                 |
| `schema`    | With `api`              | Local OpenAPI `$ref` selector. With `operation`, omitted uses the selected media type's schema. |

Use `operation`, `kind`, `mediaType`, and `status` for a body schema. To select an object that is not a body, use `api` and `schema` without the operation attributes. A pointer ending in `/properties/<name>` selects a single field. Both forms use the API source for the page's publication.

```mdx
<ApiSchema api="notes" schema="#/components/schemas/NoteMetadata" />
<ApiSchema api="notes" schema="#/components/schemas/NoteMetadata/properties/source" />
```

### Schema · NoteMetadata

object

Optional display information for a note.

2 properties

- `source` `string` **optional**&#x20;

  Where the note came from.

- `pinned` `boolean` **optional**&#x20;

  Whether the note stays at the top.

### Field · source

string

Where the note came from.

The element is standalone and empty, with literal string attributes. A missing or invalid selector fails the build. API includes cannot be nested inside snippets. See [API references](https://www.shoalrun.com/publish/api-references.md) for source setup and focused contracts.

### Response 201 schema · application/json

A saved note with its author, labels, and display metadata.

7 properties

- `id` `string` **always present**&#x20;

  The generated note ID.

- `text` `string` **always present**&#x20;

  maxLength: 280

  The saved text.

- `createdAt` `string` **always present**&#x20;

  format: date-time

  When the note was created.

- `archivedAt` `string` **always present** **nullable**&#x20;

  format: date-time

  When the note was archived, or null while active.

- `author` `object` **always present**&#x20;

  The person who created the note.

  2 properties

  - `id` `string` **always present**&#x20;

    The author's user ID.

  - `displayName` `string` **always present**&#x20;

    The author's display name.

- `tags` `list of string` **may be absent**&#x20;

  Labels used to organize the note.

  Array items:

  string

- `metadata` `object` **may be absent**&#x20;

  Optional display information for a note.

  2 properties

  - `source` `string` **may be absent**&#x20;

    Where the note came from.

  - `pinned` `boolean` **may be absent**&#x20;

    Whether the note stays at the top.

### Markdown twin

The build expands `<ApiSchema>` before writing the `.md` page. It becomes a level-three heading naming the body, standalone schema, or selected field. The schema type follows, then any nested fields with presence rules, types, descriptions, and other authored constraints. HTML field rows have stable anchors; the Markdown lists keep field names readable without raw HTML tags. An agent can read the structure without the HTML presentation or browser scripts.

The standalone object above begins like this in the Markdown twin, before its field list:

```md
### Schema · NoteMetadata

object

Optional display information for a note.
```

The selected `source` field above appears in the Markdown twin as:

```md
### Field · source

string

Where the note came from.
```

`<ApiSchema>` includes the full selected schema, including nested objects. It does not shorten or collapse large schemas in either output. For a large object, include it in a guide only when readers need the whole field tree there. Otherwise, select a relevant field, use authored [Fields](https://www.shoalrun.com/author/components/fields.md) for a short explanation, or link to the API reference. A field pointer selects its definition; it does not infer whether that field is required by its parent. Recursive references stop with a visible recursive-reference note rather than repeating forever.

## HTML, Markdown, and agents

The build resolves both components against the OpenAPI source for the page's publication. HTML presents examples and schema fields with their labels and context. Markdown expands them into ordinary text, lists, and code. An agent can read that content without fetching the source file or running browser scripts. Both outputs include the complete selected example or schema.

## Related reading

### Read first

- [Add an OpenAPI API](https://www.shoalrun.com/publish/api-references.md) — Register the OpenAPI source these components read from.

### Related topics

- [Fields](https://www.shoalrun.com/author/components/fields.md) — Write field lists by hand in the same format as generated schemas.
