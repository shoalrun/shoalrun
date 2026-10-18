---
id: reference.notes.getNote
title: Get a note
summary: GET /notes/{id}
type: api-reference
canonical: /example-api/generated/get-note-cbedb319
---

# Get a note

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Document an API > Examples > Example Notes API > Notes > Get a note

**Updated: 2026-10-18.**

> Fictional API example. This page demonstrates documentation features; its operations do not describe a live service.

This reference is generated from the OpenAPI description. It shows the operation contract; follow any related guides below for task steps and context.

OpenAPI for this operation: [Download JSON](https://www.shoalrun.com/api/operations/production/current/en/notes-getnote-939949cb510084389ae9dd3cd545e8b07ea14d76ec4d15bee06660e70c669b19.json).

## GET /notes/{id}

Get a note

Read a saved note from this fictional API.

### Servers

`https://api.example.test`

### Parameters

#### id (path)

Required

string

**Known note ID**: `"note_123"`

### Example request

```bash
curl --request GET \
  --url 'https://api.example.test/notes/YOUR_ID'
```

### Responses

#### 200: OK

`application/json`

The saved note.

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

##### Example: Retrieved release note

Key: saved. Location: response 200; application/json. Authored in OpenAPI.

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

#### 404: Not Found

`application/json`

No note has that ID.

object

2 properties

- `code` `string` **always present**&#x20;

- `message` `string` **always present**&#x20;

## Related guides

- [Prepare a note request](https://www.shoalrun.com/example-api/write-note.md) — Prepare a fictional note payload and follow its linked operation contracts.
