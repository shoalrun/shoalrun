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

Start with a registered local API from [Add an OpenAPI API](https://www.shoalrun.com/publish/api-references.md). Use generation when you want references for many operations without writing an MDX page for each one. The commands below run in your documentation project with `@shoalrun/cli` installed as in the [quickstart](https://www.shoalrun.com/start.md).

## Choose generated references or MDX

Use build-time generated references when the OpenAPI contract already gives readers the method, path, parameters, schemas, and examples they need. The pages update whenever the reviewed source changes, and there are no MDX files to maintain. Use an authored MDX reference when an endpoint needs a reviewed introduction, prerequisites, limitations, or task-specific context that the contract cannot express. The compiler still appends the contract details from OpenAPI, so do not copy field tables and example payloads into MDX. Use a guide for a task spanning several endpoints; link its reference pages with `relatedApiReferences`.

The one-time `api materialize` command creates draft MDX references for every endpoint or selected source operation IDs or method/path routes. It does not change config or navigation and never rewrites an existing page. For example:

```sh
npx --no-install shoalrun api materialize notes docs.config.yaml --all
npx --no-install shoalrun api materialize notes docs.config.yaml --operation getNote
npx --no-install shoalrun api materialize notes docs.config.yaml --route 'GET /notes/{id}'
```

The default destination is `content/api/<api-id>/`; use `--output` for another directory inside the configured content tree. Selectors use the OpenAPI `operationId` or exact uppercase method and path. Repeating a command reports the existing matching page as skipped. A file with a conflicting identity stops the job before it writes anything. Existing authored references also count as skipped.

Each new page has a stable document ID, slug, operation binding, and `access.policy: draft`. The draft contains an editorial prompt. While it remains a draft, any already selected build-time reference continues to publish. Review the text, replace the prompt, then set access to `public`; that MDX page takes the generated page's place for its publication. This also works when `generateReferences` is off: the authored page binds to the registered API's local OpenAPI source. The command never enables build-time generation, changes the public review digest, or chooses navigation order for you. Run `api review` before publishing changed API content, and place the reference with `operation:` or `doc:` in navigation if it is not already covered by a generator.

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

## Override generated reference order in navigation

`generateReferences` chooses which reference pages exist. The `navigation` list chooses where they appear. **You can put a generated reference's stable operation ID in an `operation:` entry to override its OpenAPI tag group and source order. No MDX page is needed.** Write those entries in the exact order readers should see them, then use `generated: tags` to place only the operations you did not list.

```yaml title="config/nav.yaml"
- id: widgets
  label: Widgets
  items:
    - { id: get-widget-nav, operation: widgets.getWidget }
    - { id: query-widgets-nav, operation: widgets.queryWidgets }
    - { id: create-widget-nav, operation: widgets.createWidget }
    - { id: other-widgets, api: widgets, generated: tags }
```

Here `GET /Query/widgets` may have the OpenAPI tag `Query`, but its generated reference appears second under **Widgets**. The listed operations appear in this YAML order, regardless of their path, tag, or position in the OpenAPI file. They are removed from the `generated: tags` remainder, so each appears once. The `id` fields such as `query-widgets-nav` identify menu entries; `operation` values are the stable IDs that select the reference pages. An authored MDX reference uses the same navigation rule. See [Organize site navigation](https://www.shoalrun.com/author/navigation.md) for the full layout.

To review the default publication's spec operation by operation, run:

```sh
npx --no-install shoalrun api select notes docs.config.yaml --output config/notes-pages.yaml
```

The command shows the method, path, ID, and summary for each operation and asks **yes** or **no**. It shows operations with authored pages but does not replace them. After the choices are complete, it writes the `pathPrefix` and `include` list to the selection file; `q` cancels without writing. Run `api review` again, inspect the candidate, and update `publicReview.digest` before rebuilding to apply the choices. Add `{ id: notes-generated, api: notes, generated: tags }` under a navigation group to display the generated pages by their first OpenAPI tag, or place selected operations explicitly in navigation. This site's [Example Notes API subnav](https://www.shoalrun.com/author/navigation.md) uses the tag generator.

The digest shown above is a placeholder. Keep your existing review digest while editing. After reviewing the new selection, replace it with the reported value. Selection limits generated pages; `source.publish: true` still publishes the full source, including operations without pages. Use `focused: true` and omit `publish` when you only need individual operation contracts.

## Use a template for editorial context

Use the built-in `api-reference` template for details OpenAPI cannot supply, such as operational context, task links, prerequisites, and limitations. Keep method, path, field lists, and example values in the spec so generated references have one source for those facts.

```sh
shoalrun scaffold api-reference -n content/create-enrollment.mdx \
  --id reference.create-enrollment --operation cedar.createEnrollment
```

No template registration is needed. The scaffold requires exactly one known stable operation ID. Check that the page ID matches that operation's `reference` entry in API config. A scaffold is a draft; replace every prompt and review the operation against the spec before publishing. The [Templates guide](https://www.shoalrun.com/author/templates.md) shows how to override the built-in outline for your project. Editing a template later affects new drafts, not existing pages.

## Add useful examples

API reference pages display the examples defined in the OpenAPI file; the build does not invent them. Give each example a clear name and include the fields a reader needs to use it. In this site's Notes spec, [Create a note](https://www.shoalrun.com/example-api/create-note.md) has request and response examples. [Get a note](https://www.shoalrun.com/example-api/generated/get-note-cbedb319.md) has a note ID and a response example.

The right panel offers **Examples** first when the spec provides them, plus a **JSON shape** view built from each JSON request or response schema. Shape values are type placeholders, not a runnable payload. Request and response examples stay in separate groups, with response status and media type in each heading. Groups of three or fewer use native disclosures. Larger groups use a compact selector with one visible preview when JavaScript is available; without JavaScript, every disclosure remains usable. The Create a note request has ten named examples so you can inspect this layout. Direct links still open the selected example.

Local named request examples for ordinary, non-multipart operations also have copyable request samples. In HTML, each sample has a language selector. It offers cURL, JavaScript, Node.js, Python, Go, Java, PHP, Ruby, and C#. Webhooks have no generated request samples. A sample uses the first declared server and security option, required parameters, the example body, and its media type. Replace `YOUR_` credential and parameter placeholders before using it. Ordinary operations without a request body show a general request sample. An operation with a request body but no local named request examples usually shows no sample. A multipart body whose required fields are all binary strings can produce a file-upload sample in cURL only. An `externalValue` example has no example-specific sample. These samples are generated from the OpenAPI source and have not been executed. **The Markdown twin and agent bundle keep only the cURL sample.** Agents can translate cURL; one canonical sample keeps the `.md` output small.

An OpenAPI `summary` names an example, and `description` adds context. Without a summary, the reader turns its source key into a readable title and still shows the original key. A response without an example still has a shape: Get a note's `404` response shows `code` and `message` as strings. The full field descriptions and presence rules remain in the main reference and its Markdown twin.

If a guide shows only part of a payload to explain one field, call it an excerpt. Readers can then distinguish it from a complete request or response. To show a full named example from the spec in a guide, use [`ApiExample`](https://www.shoalrun.com/author/components/api-embeds.md). It stays tied to the same source as the API reference.
The build expands that include in the guide's Markdown twin as a heading, source context, and a fenced payload or external example link. Agents can read the selected example directly in the `.md` page; the [API embeds guide](https://www.shoalrun.com/author/components/api-embeds.md) shows the exact output.

## Link guides to API references

Add `relatedApiReferences` to a guide or how-to page to name API reference pages by stable document ID:

```yaml title="docs/content/write-note.mdx"
relatedApiReferences:
  - reference.create-note
  - reference.notes.getNote
```

This array contains two page IDs. One points to the authored Create a note reference; the other points to the generated Get a note reference. The build adds a **Related API references** list to the guide and a **Related guides** list to each named reference. Links use the current page titles and routes, so they stay correct when a slug changes. The lists appear in HTML and the Markdown twins. A missing ID or an ID for another page type fails the build; a reference unavailable in the guide's publication is omitted.

The [Write a note guide](https://www.shoalrun.com/example-api/write-note.md) uses this field to link to the [Create a note reference](https://www.shoalrun.com/example-api/create-note.md). You can inspect the generated lists at the bottom of both pages.

## Map extension values to Shoalrun status

If a spec uses an `x-*` extension for availability, explicitly map its values to Shoalrun's status badges in the API config. This works with extension names from any OpenAPI authoring service:

```yaml title="config/api.yaml"
payments:
  source: { kind: file, path: ../apis/payments/openapi.yaml }
  mappings:
    subjectLifecycle:
      from: x-vendor-availability
      values:
        preview: beta
        building: in-development
        retired: deprecated
```

Only mapped values change a page's status. OpenAPI `deprecated: true` always yields **Deprecated**. An authored page can also set `subjectLifecycle` directly. The [OpenAPI extension mappings reference](https://www.shoalrun.com/publish/openapi-extension-mappings.md) specifies accepted scalar and nested value shapes, precedence, and how other extensions are handled.

## Describe filters that do not use their OpenAPI parameter name

Some APIs put filter expressions directly in the query string even though their OpenAPI description has one placeholder parameter. Opt in by path prefix so examples and generated cURL use the actual wire form:

```yaml title="config/api.yaml"
payments:
  source: { kind: file, path: ../apis/payments/openapi.yaml }
  querySyntax:
    - parameter: filters
      pathPrefixes: [/Query/]
      style: unwrapped
      example: FIELD(eq)=VALUE
```

For a matching operation, the reference explains the direct `?FIELD(eq)=VALUE` form and omits `filters=` from its generated cURL. The source's notes on accepted fields stay in a disclosure. Named examples with one field and value supply a more specific cURL filter. Other endpoints keep ordinary OpenAPI parameter behavior.

Next, [organize generated operations in navigation](https://www.shoalrun.com/author/navigation.md).

## Related reading

### Read first

- [Add an OpenAPI API](https://www.shoalrun.com/publish/api-references.md) — Register and review an API source before generating its pages.

### Next steps

- [Organize site navigation](https://www.shoalrun.com/author/navigation.md) — Arrange selected operations in the site menu.

### Related topics

- [Organize site navigation](https://www.shoalrun.com/author/navigation.md) — Generate the API reference pages that fill a tag group in the menu.
