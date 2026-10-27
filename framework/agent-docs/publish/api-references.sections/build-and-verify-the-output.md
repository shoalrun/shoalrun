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

**Updated: 2026-10-27.**

Parent page: [Full Markdown page](/publish/api-references.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [ApiExample and ApiSchema](https://www.shoalrun.com/author/components/api-embeds.md) — Include named examples and selected schemas in your guides.

Add one authored API reference to the project created in the [quickstart](https://www.shoalrun.com/start.md). This walkthrough uses a fictional Notes API as its example. You will register an operation, write its introduction, add it to navigation, review the imported content, and verify its published files.

Run commands from the documentation project directory created in the quickstart, where `@shoalrun/cli` is installed. The commands use that local package. Check [OpenAPI support and limits](https://www.shoalrun.com/api-docs/support.md) before importing a larger specification.

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
