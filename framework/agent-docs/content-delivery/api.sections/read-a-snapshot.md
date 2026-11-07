---
id: reference.content-client
title: Content client API
summary: Look up the content client entry point, snapshot methods, limits,
  results, and errors.
type: reference
area: publishing
subarea: publishing-content-delivery
canonical: /content-delivery/api
---

# Content client API

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Reference](https://www.shoalrun.com/.well-known/shoalrun/navigation/reference-tab-50f26fe22670.txt) (ID: reference-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Reference](https://www.shoalrun.com/cli.md) > Content delivery > Client behavior

**Updated: 2026-11-07.**

**Available since: 0.1.0-alpha.13.**

Parent page: [Full Markdown page](/content-delivery/api.md)

**Page reading path** — these links apply to the full page.

**Read first**

- [Content delivery](https://www.shoalrun.com/content-delivery.md) — Understand resource delivery and its application boundary.

Import the browser-safe delivery API from `@shoalrun/cli/content`. It reads exports and mounts trusted HTML without loading the compiler. Browser use requires HTTPS or localhost for Web Crypto.

## Read a snapshot

A snapshot exposes the following members for one opened revision.

| Member                          | Contract                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------- |
| `revision`                      | Opened manifest digest                                                          |
| `publication`                   | Channel, version, and language; product-scoped snapshots also include `product` |
| `list()`                        | Read-only resource metadata for this revision                                   |
| `get(ref, { format, signal? })` | Promise for a checked HTML or Markdown result                                   |
| `dispose()`                     | Cancel the snapshot lifetime and refuse later reads                             |

```ts
type ContentRef =
  | { kind: 'page'; documentId: string }
  | { kind: 'section'; documentId: string; sectionId: string }
  | { kind: 'snippet'; id: string };
```

`list()` is synchronous because opening a source loads and freezes its metadata. Each `get()` fetches and checks UTF-8, media type, byte count, and SHA-256 against that revision; the client doesn't cache response bodies. `dispose()` is idempotent, aborts active reads, and makes later `list()` and `get()` calls fail. The opening signal affects only opening; use the per-read signal or `dispose()` for subsequent reads.

A `ContentResult` contains `resource`, `representation`, `format`, `content`, and `revision`. `contentRefKey(ref)` returns a key for comparing typed references. It isn't a URL or authorization decision.
