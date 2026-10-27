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

**Updated: 2026-10-26.**

Parent page: [Full Markdown page](/publish/api-references.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [ApiExample and ApiSchema](https://www.shoalrun.com/author/components/api-embeds.md) — Include named examples and selected schemas in your guides.

Add one authored API reference to the project created in the [quickstart](https://www.shoalrun.com/start.md). This walkthrough uses a fictional Notes API as its example. You will register an operation, write its introduction, add it to navigation, review the imported content, and verify its published files.

Run commands from the documentation project directory created in the quickstart, where `@shoalrun/cli` is installed. The commands use that local package. Check [OpenAPI support and limits](https://www.shoalrun.com/api-docs/support.md) before importing a larger specification.

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
