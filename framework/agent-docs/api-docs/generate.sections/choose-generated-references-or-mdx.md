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

**Updated: 2026-10-19.**

Parent page: [Full Markdown page](/api-docs/generate.md)

**Page reading path** — these links apply to the full page.

**Read first**

- [Add an OpenAPI API](https://www.shoalrun.com/publish/api-references.md) — Register and review an API source before generating its pages.

**Next steps**

- [Organize site navigation](https://www.shoalrun.com/author/navigation.md) — Arrange selected operations in the site menu.

Start with a registered local API from [Add an OpenAPI API](https://www.shoalrun.com/publish/api-references.md). Use generation when you want references for many operations without writing an MDX page for each one. The commands below run in your documentation project with `SHOALRUN_CLI` set as in the quickstart.

## Choose generated references or MDX

Use build-time generated references when the OpenAPI contract already gives readers the method, path, parameters, schemas, and examples they need. The pages update whenever the reviewed source changes, and there are no MDX files to maintain. Use an authored MDX reference when an endpoint needs a reviewed introduction, prerequisites, limitations, or task-specific context that the contract cannot express. The compiler still appends the contract details from OpenAPI, so do not copy field tables and example payloads into MDX. Use a guide for a task spanning several endpoints; link its reference pages with `relatedApiReferences`.

The one-time `api materialize` command creates draft MDX references for every endpoint or selected source operation IDs or method/path routes. It does not change config or navigation and never rewrites an existing page. For example:

```sh
node "$SHOALRUN_CLI" api materialize notes docs.config.yaml --all
node "$SHOALRUN_CLI" api materialize notes docs.config.yaml --operation getNote
node "$SHOALRUN_CLI" api materialize notes docs.config.yaml --route 'GET /notes/{id}'
```

The default destination is `content/api/<api-id>/`; use `--output` for another directory inside the configured content tree. Selectors use the OpenAPI `operationId` or exact uppercase method and path. Repeating a command reports the existing matching page as skipped. A file with a conflicting identity stops the job before it writes anything. Existing authored references also count as skipped.

Each new page has a stable document ID, slug, operation binding, and `access.policy: draft`. The draft contains an editorial prompt. While it remains a draft, any already selected build-time reference continues to publish. Review the text, replace the prompt, then set access to `public`; that MDX page takes the generated page's place for its publication. This also works when `generateReferences` is off: the authored page binds to the registered API's local OpenAPI source. The command never enables build-time generation, changes the public review digest, or chooses navigation order for you. Run `api review` before publishing changed API content, and place the reference with `operation:` or `doc:` in navigation if it is not already covered by a generator.
