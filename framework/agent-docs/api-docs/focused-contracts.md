---
id: guide.focused-contracts
title: Focused OpenAPI contracts
summary: Give tools one operation and its required schemas without the rest of
  the API source.
type: reference
area: api
subarea: api-contracts
canonical: /api-docs/focused-contracts
---

# Focused OpenAPI contracts

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Document an API > Focused OpenAPI contracts

**Updated: 2026-10-26.**

A **focused contract** is a generated OpenAPI JSON file for one operation. It contains that operation's path and method, parameters, request and response definitions, named examples, and the schemas and security schemes those definitions use. The build resolves local references so the file stands on its own. Each API reference page links to its focused contract.

## Why use one

An API reference page is made for reading. A focused contract gives an agent, test tool, or client generator the exact machine-readable shape of the operation. A large OpenAPI source can contain many unrelated operations and schemas; the focused file keeps the context to what this operation needs. It is also useful when the full source should stay internal but a selected operation can be published.

## Generate and inspect it

Set `focused: true` on a local API source. The source can stay unpublished:

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

The build writes a JSON file under `/api/operations/` and links to it from the API reference page. If `publish: true` also publishes the source OpenAPI file, the focused contract is generated automatically. Open the [Create a note reference](https://www.shoalrun.com/example-api/create-note.md), then follow its **Download JSON** link to inspect the output from this site's fictional API. That site's full [OpenAPI source](https://www.shoalrun.com/api/notes/production/current/openapi.yaml) is published too, so you can compare them.

Before a normal build publishes the contract, review the local candidate and pin the API's `publicReview.digest` as described in [API references](https://www.shoalrun.com/publish/api-references.md). The review covers the contract's transitive schemas and examples as well as the page that links to it.

The focused contract describes the selected operation, not the entire API. Use the full source when a tool needs operations outside that page.

## What the export keeps and drops

- It keeps the selected path and method, their parameters, and the schemas, examples, and security schemes they reference. The root `servers` and `security` carry over, and `tags` lists only the operation's tags.
- It drops every `x-*` extension key, so vendor extensions and internal notes stored there stay out of the public file.
- It supports local OpenAPI 3.0.x and 3.1.x files with internal and multi-file references. Referenced files must stay inside the main OpenAPI file's directory, including after resolving symlinks. Absolute local paths are rejected. A Path Item `$ref`, or a JSON Schema `$id`, `$anchor`, `$dynamicRef`, or `$dynamicAnchor`, stops the build.

The URL pattern is `/api/operations/<channel>/<version>/<language>/<name>-<sha256>.json`. The suffix is the full SHA-256 of the generated JSON bytes. Changing the contract changes its URL; an unchanged contract keeps the same URL. Earlier prototype filenames hashed the operation ID, which did not provide this property.

The generated hosting metadata gives these URLs `Cache-Control: public, max-age=31536000, immutable` and a strong ETag containing the same digest. The Node server applies these headers, and the Vercel adapter includes them in its routing configuration. A CDN can replace the ETag with its own validator. Use the returned ETag for conditional requests and the manifest's `focusedContractDigest` to verify downloaded bytes. Mutable Markdown and JSON indexes require revalidation. Other hosts must apply the generated cache policy. Old builds are not archived automatically, so the URL identity does not guarantee permanent availability. To check every contract in a built site, run `shoalrun api focused-audit <site-directory>`. The [CLI reference](https://www.shoalrun.com/cli.md) lists what it checks.

## Related reading

### Reference while working

- [CLI reference](https://www.shoalrun.com/cli.md) — Check every focused contract in a built site with api focused-audit.

### Related topics

- [Agent-friendly documentation](https://www.shoalrun.com/publish/agent-friendliness.md) — Focused contracts are how agents find exact API details without the full spec.
