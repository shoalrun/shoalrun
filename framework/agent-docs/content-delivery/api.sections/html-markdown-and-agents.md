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

## HTML, Markdown, and agents

The same typed reference selects either available representation. HTML mounting is optional and separate from retrieval. Agents can read Markdown and metadata through the client without a DOM. Digests detect mismatched bytes; they don't establish that an unknown publisher's content is trustworthy.
