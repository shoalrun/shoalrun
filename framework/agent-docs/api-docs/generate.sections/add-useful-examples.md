---
id: guide.api-generation
title: Generate and select API pages
summary: Choose operations, generate reference pages, and add editorial context
  to an API reference.
type: how-to
canonical: /api-docs/generate
---

# Generate and select API pages

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Document an API > Generate and select API pages

**Updated: 2026-09-30.**

Parent page: [Full Markdown page](/api-docs/generate.md)

**Page reading path** — these links apply to the full page.

**Read first**

- [Add an OpenAPI API](https://www.shoalrun.com/publish/api-references.md) — Register and review an API source before generating its pages.

**Next steps**

- [Organize site navigation](https://www.shoalrun.com/author/navigation.md) — Arrange selected operations in the site menu.

Start with a registered local API from [Add an OpenAPI API](https://www.shoalrun.com/publish/api-references.md). Use generation when you want references for many operations without writing an MDX page for each one. The commands below run in your documentation project with `SHOALRUN_CLI` set as in the quickstart.

## Add useful examples

API reference pages display the examples defined in the OpenAPI file; the build does not invent them. Give each example a clear name and include the fields a reader needs to use it. In this site's Notes spec, [Create a note](https://www.shoalrun.com/example-api/create-note.md) has request and response examples. [Get a note](https://www.shoalrun.com/example-api/generated/get-note-cbedb319.md) has a note ID and a response example.

The right panel offers **Examples** first when the spec provides them, plus a **JSON shape** view built from each JSON request or response schema. Shape values are type placeholders, not a runnable payload. Request and response examples stay in separate groups, with response status and media type in each heading. Groups of three or fewer use native disclosures. Larger groups use a compact selector with one visible preview when JavaScript is available; without JavaScript, every disclosure remains usable. The Create a note request has ten named examples so you can inspect this layout. Direct links still open the selected example.

Local named request examples for ordinary, non-multipart operations also have copyable request samples. In HTML, each sample has a language selector. It offers cURL, JavaScript, Node.js, Python, Go, Java, PHP, Ruby, and C#. Webhooks have no generated request samples. A sample uses the first declared server and security option, required parameters, the example body, and its media type. Replace `YOUR_` credential and parameter placeholders before using it. Ordinary operations without a request body show a general request sample. An operation with a request body but no local named request examples usually shows no sample. A multipart body whose required fields are all binary strings can produce a file-upload sample in cURL only. An `externalValue` example has no example-specific sample. These samples are generated from the OpenAPI source and have not been executed. **The Markdown twin and agent bundle keep only the cURL sample.** Agents can translate cURL; one canonical sample keeps the `.md` output small.

An OpenAPI `summary` names an example, and `description` adds context. Without a summary, the reader turns its source key into a readable title and still shows the original key. A response without an example still has a shape: Get a note's `404` response shows `code` and `message` as strings. The full field descriptions and presence rules remain in the main reference and its Markdown twin.

If a guide shows only part of a payload to explain one field, call it an excerpt. Readers can then distinguish it from a complete request or response. To show a full named example from the spec in a guide, use [`ApiExample`](https://www.shoalrun.com/author/components/api-embeds.md). It stays tied to the same source as the API reference.
The build expands that include in the guide's Markdown twin as a heading, source context, and a fenced payload or external example link. Agents can read the selected example directly in the `.md` page; the [API embeds guide](https://www.shoalrun.com/author/components/api-embeds.md) shows the exact output.
