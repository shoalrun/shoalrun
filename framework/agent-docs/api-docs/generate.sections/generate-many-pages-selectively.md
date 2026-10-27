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

## Generate many pages selectively

For a large API, set `generateReferences` on its API config. This avoids writing one MDX file and registry entry for every operation. The build scans the local spec and creates HTML and Markdown reference pages for selected operations. An explicit `operations` entry and authored page take precedence for that operation. The example [Create a note page](https://www.shoalrun.com/example-api/create-note.md) is authored, while its [Get a note page](https://www.shoalrun.com/example-api/generated/get-note-cbedb319.md) is generated.

The example below uses this site's [two-operation Notes source](https://www.shoalrun.com/api/notes/production/current/openapi.yaml), which contains `createNote` and `getNote`. To try it after the tutorial, replace your one-operation `apis/notes/openapi.yaml` with that source first. Keep the authored Create a note page and its binding. Store the generation choices in a separate config file:

```yaml title="config/api.yaml"
notes:
  publicReview:
    digest: <digest-from-your-api-review>
  source: { kind: file, path: ../apis/notes/openapi.yaml, publish: true }
  operations:
    - { id: notes.create, sourceOperationId: createNote, reference: reference.create-note }
  generateReferences: { $include: ./notes-pages.yaml }
```

```yaml title="config/notes-pages.yaml"
pathPrefix: /example-api/generated
include: [getNote]
```

`include` lists source `operationId` values to generate; an empty list generates none. You can use `exclude` instead to generate all but named operations, or set `generateReferences: true` to generate every operation without an authored binding. The build rejects unknown selection IDs. Generated IDs and URLs derive from the API ID and source `operationId`, not the operation summary, so editing a title does not move the page. If an `operationId` changes, add an authored binding when the old public identity must remain stable.

For an API `notes` and `operationId: getNote`, the generator creates:

| Value               | Pattern                                                    | Example                                    |
| ------------------- | ---------------------------------------------------------- | ------------------------------------------ |
| Stable operation ID | `<apiId>.<operationId>`                                    | `notes.getNote`                            |
| Page ID             | `reference.<apiId>.<operationId>`                          | `reference.notes.getNote`                  |
| Slug                | `<pathPrefix>/<kebab-case operationId>-<8-character hash>` | `/example-api/generated/get-note-cbedb319` |

`pathPrefix` defaults to `/reference/<apiId>`. An `operationId` with characters outside letters, digits, `.`, `_`, and `-` uses the kebab-case name plus the hash in place of the raw ID. Use the page ID in `relatedApiReferences` and the stable operation ID in navigation `operation:` entries. Generated pages pass through [global frontmatter](https://www.shoalrun.com/author/frontmatter.md) defaults and enforced values, so an enforced value or a required custom field applies to them too. The page title is the operation `summary`, or the method and path when there is no summary.

OpenAPI 3.1 `webhooks` can use the same authored bindings or generated-page selection. A webhook reference labels the inbound event, shows the request payload and expected acknowledgement, and omits the outbound cURL example. A focused contract for that page keeps the operation under `webhooks`. A spec can contain only `webhooks` without `paths`.

You can place an MDX guide among operation links in `navigation` by adding a `doc:` entry in the same group. Generated tag groups can sit before or after that entry; a guide within a particular tag can sit beside that tag's `{ id: tag-remaining, generated: remaining }` entry.
