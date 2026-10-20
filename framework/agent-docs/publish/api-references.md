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

For your own API, if the source lives at a public HTTPS URL, import it into a local snapshot first. Replace the example URL below with your actual OpenAPI URL:

```sh
npx --no-install shoalrun api import https://api.example.com/openapi.yaml --output apis/remote
```

Point `source.path` at `../apis/remote/openapi.yaml` from `config/api.yaml`. Commit the snapshot and its `source-lock.json`. Normal builds use those local files and make no network request. To check for upstream changes, run `api refresh apis/remote --output apis/remote-next`. If the source changed, the command reports the changed hashes and writes a complete new snapshot while keeping `apis/remote` intact. Point `source.path` to `../apis/remote-next/openapi.yaml`, inspect a new `api review` candidate, and pin its digest before building. The [CLI reference](https://www.shoalrun.com/cli.md) lists import limits.

## Author the reference page

Create `content/create-note.mdx`:

```mdx title="content/create-note.mdx"
---
id: reference.create-note
title: Create a note
summary: Create a note in the fictional Notes API.
type: api-reference
slug: /example-api/create-note
channel: production
version: current
language: en
operations: [notes.create]
access: { policy: public }
---

This fictional operation returns the identifier of a new note. Its response
schema and named example are generated from the local OpenAPI file.
```

The page ID must match the registry's `reference` value. An `api-reference` page lists exactly one operation. The compiler appends the method, path, parameters, authentication, schemas, and examples to your authored introduction.

Append this entry to the existing `navigation` array in `docs.config.yaml`:

```yaml
  - id: notes-create
    doc: reference.create-note
```

If your project includes navigation from another file, add the entry there. Save the page and navigation before the review so the candidate contains the page you intend to publish.

## Review imported content before publishing

Shoalrun requires `publicReview.digest` for every API whose content appears in a public page, embed, or focused contract. A missing or stale digest stops a normal build. Generate a local candidate in a fresh temporary directory:

```sh
API_REVIEW_DIR="$(mktemp -d /tmp/shoalrun-api-review.XXXXXX)"
npx --no-install shoalrun api review docs.config.yaml --output "$API_REVIEW_DIR"
```

The command builds the candidate and reports each API's digest, page URLs, focused contracts, full-source downloads, and input hashes. Inspect the candidate files for private operations, fields, descriptions, examples, and credentials. For this example, check the Create a note HTML and Markdown page and its linked focused contract.

Copy the reported digest for `notes` into `config/api.yaml` alongside `source` and `operations`:

```yaml
notes:
  publicReview:
    digest: <paste-the-reported-notes-digest>
  # Keep source and operations here.
```

Replace the angle-bracket placeholder with the actual digest. Keep the candidate local and remove it after review. The digest records what you reviewed; it does not determine whether content is safe. Changing source bytes, selected operations or embeds, focused contracts, or full-source publication requires another review. Changing only authored page copy does not.

## Build and verify the output

```sh
npx --no-install shoalrun build docs.config.yaml site-dist
npx --no-install shoalrun api focused-audit site-dist
npx --no-install shoalrun serve site-dist --port 8765
```

Open `http://127.0.0.1:8765/example-api/create-note/` and choose **Create a note** in the sidebar. Confirm the introduction, `POST /notes`, the `201` response with its required `id` field, and the named example. Open `http://127.0.0.1:8765/example-api/create-note.md` to check the same details as Markdown. Follow the focused contract link and check that it contains only this operation and its required contract data.

The HTML uses a reference column and an API data panel at wide widths; on narrow screens the panel follows the article. The Markdown twin contains every property, variant, enum choice, and named example in reading order. JSON shapes use type placeholders; they are not runnable payloads. Generated request commands have not been executed.

For a larger live example of the documentation layout, see the [fictional Create a note reference](https://www.shoalrun.com/example-api/create-note.md). Its `archivedAt` response field is both **always present** and **nullable**: presence and nullability describe different things. A field marked **may be absent** can be omitted entirely.

Next, [generate and select more API pages](https://www.shoalrun.com/api-docs/generate.md).

## What readers get

An authored reference adds editorial context to the operation contract. A [generated reference](https://www.shoalrun.com/example-api/generated/get-note-cbedb319.md) includes the same contract details without an MDX introduction. For tasks spanning several operations, write a linked guide such as [Write a note](https://www.shoalrun.com/example-api/write-note.md). These fictional examples do not imply a live API or tested requests.

Response status and media type share a heading row. Descriptions remain visible above property disclosures; enum choices appear below field descriptions. Markdown includes all of this without interactive controls. OpenAPI `deprecated: true` sets the page's status to deprecated; conflicting authored status values fail the build.

## Publish several versions

[Put multiple versions on one site](https://www.shoalrun.com/publish/publications.md) explains sources for each publication and stable operation bindings across versions.

## Map extension values to Shoalrun status

Use the [extension mappings reference](https://www.shoalrun.com/publish/openapi-extension-mappings.md) to map vendor `x-*` values to status badges.

## Describe filters that do not use their OpenAPI parameter name

The [query syntax example](https://www.shoalrun.com/api-docs/generate.md) configures direct query expressions and generated cURL.

## Generate many pages selectively

[Generate and select API pages](https://www.shoalrun.com/api-docs/generate.md) covers include/exclude lists, stable generated IDs, webhooks, interactive selection, and tag navigation.

## Use a template for editorial context

[API reference templates](https://www.shoalrun.com/api-docs/generate.md) add editorial prompts without duplicating contract fields.

## Add useful examples

[Named examples and generated commands](https://www.shoalrun.com/api-docs/generate.md) explains example selection, JSON shapes, and cURL behavior.

## Link guides to API references

[Related API references](https://www.shoalrun.com/api-docs/generate.md) connects guides and references in both directions using stable page IDs.

## Inspect the machine-readable contract

[Focused contracts](https://www.shoalrun.com/api-docs/focused-contracts.md) retain transitive schemas, examples, and security schemes for one operation. To publish the full source instead, set `source.publish: true`. That also enables focused contracts. A discovery endpoint must use HTTPS and needs `site.origin`; see [configuration](https://www.shoalrun.com/config.md).

## Preview a small API reference

Compare the authored [Create a note](https://www.shoalrun.com/example-api/create-note.md) and generated [Get a note](https://www.shoalrun.com/example-api/generated/get-note-cbedb319.md) with their [fictional source](https://www.shoalrun.com/api/notes/production/current/openapi.yaml), Markdown twins, and focused contracts.

The [Cedar Parcel styling lab](https://www.shoalrun.com/example-api/cedar.md) exercises direct query filters, conditional bodies, JSON and file responses, server and authentication overrides, extension mappings, and a webhook.

## Related reading

### Next steps

- [ApiExample and ApiSchema](https://www.shoalrun.com/author/components/api-embeds.md) — Include named examples and selected schemas in your guides.

### Reference while working

- [Focused OpenAPI contracts](https://www.shoalrun.com/api-docs/focused-contracts.md) — Give tools one operation and its required schemas.

### Related topics

- [Create a note](https://www.shoalrun.com/example-api/create-note.md) — A finished operation page built from a small, fictional OpenAPI file.

- [Compose and maintain recipes](https://www.shoalrun.com/author/recipe-drafts.md) — Configure the stable operation ID and review the OpenAPI source used by an API ingredient draft.
