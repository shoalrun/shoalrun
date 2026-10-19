---
id: guide.example-note
title: Prepare a note request
summary: Prepare a fictional note payload and follow its linked operation contracts.
type: how-to
area: api
subarea: api-examples
canonical: /example-api/write-note
---

# Prepare a note request

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Document an API > Examples > Example Notes API > Prepare a note request

**Updated: 2026-10-19.**

> Fictional API example. This page demonstrates documentation features; its operations do not describe a live service.

The Notes API is fictional. This short guide demonstrates how a task page can point readers to an API reference without hard-coding the reference's URL.

## Prepare a note

Choose a short message and save this JSON as `request.json`. The fictional create operation accepts this body at `POST /notes`:

```json title="request.json"
{"text":"Hello from Shoalrun!"}
```

The API references linked below cover creating and reading a note. The links on this page and on each reference are generated from `relatedApiReferences` in this guide's frontmatter. The Create a note page has an authored introduction; the Get a note page is generated from the spec without an MDX source page.

## Check the request

From the directory containing `request.json`, check that the message is a nonempty string:

```sh
node -e 'const note = require("./request.json"); if (typeof note.text !== "string" || !note.text.trim()) process.exit(1); console.log(note.text)'
```

The example prints `Hello from Shoalrun!` and exits successfully. If parsing fails or the command exits with code 1, correct the JSON or supply a nonempty message. Compare the payload with the [Create a note contract](https://www.shoalrun.com/example-api/create-note.md) before adapting it to a real API. This check validates the local example; the fixture has no live endpoint to receive a request.

## Related reading

### Next steps

- [Create a note](https://www.shoalrun.com/example-api/create-note.md) — Read the generated API reference this guide links to.

## Related API references

- [Create a note](https://www.shoalrun.com/example-api/create-note.md) — Preview an API operation page built from a small, fictional OpenAPI file.

- [Get a note](https://www.shoalrun.com/example-api/generated/get-note-cbedb319.md) — GET /notes/{id}
