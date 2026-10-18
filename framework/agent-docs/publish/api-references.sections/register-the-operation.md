---
id: guide.api-references
title: Add an OpenAPI API
summary: Import a local OpenAPI file, author an operation page, review its
  public content, and build HTML and Markdown.
type: how-to
canonical: /publish/api-references
---

# Add an OpenAPI API

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Document an API > Add an OpenAPI API

**Updated: 2026-09-30.**

Parent page: [Full Markdown page](/publish/api-references.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [ApiExample and ApiSchema](https://www.shoalrun.com/author/components/api-embeds.md) — Include named examples and selected schemas in your guides.

Add one authored API reference to the project created in the [quickstart](https://www.shoalrun.com/start.md). You will register an operation, write its introduction, add it to navigation, review the imported content, and verify its published files.

Run commands from your documentation project directory. `SHOALRUN_CLI` is the absolute path to `framework/dist/cli.js` set in the quickstart. Check [OpenAPI support and limits](https://www.shoalrun.com/api-docs/support.md) before importing a larger specification.

## Register the operation

Add this top-level entry to your existing `docs.config.yaml`:

```yaml title="docs.config.yaml"
apis: { $include: ./config/api.yaml }
```

Create the `config` directory if needed and add `config/api.yaml`:

```yaml title="config/api.yaml"
notes:
  source:
    kind: file
    path: ../apis/notes/openapi.yaml
    focused: true
  operations:
    - id: notes.create
      sourceOperationId: createNote
      reference: reference.create-note
```

`source.path` is relative to the config fragment that declares it. `notes` names this API, and `sourceOperationId` selects the spec's `operationId`. The stable operation ID `notes.create` connects the operation to authored pages; `reference` names the page that will present it. `focused: true` publishes a [one-operation contract](https://www.shoalrun.com/api-docs/focused-contracts.md).

If the source lives at a public HTTPS URL, import it into a local snapshot first:

```sh
node "$SHOALRUN_CLI" api import https://api.example.com/openapi.yaml --output apis/remote
```

Point `source.path` at `../apis/remote/openapi.yaml` from `config/api.yaml`. Commit the snapshot and its `source-lock.json`. Normal builds use those local files and make no network request. To check for upstream changes, run `api refresh apis/remote --output apis/remote-next`. If the source changed, the command reports the changed hashes and writes a complete new snapshot while keeping `apis/remote` intact. Point `source.path` to `../apis/remote-next/openapi.yaml`, inspect a new `api review` candidate, and pin its digest before building. The [CLI reference](https://www.shoalrun.com/cli.md) lists import limits.
