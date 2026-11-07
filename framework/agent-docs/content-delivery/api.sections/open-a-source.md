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

## Open a source

```ts
openManifestContentSource(options): Promise<ContentSnapshot>
```

| Option                 | Meaning                                                      | Default        |
| ---------------------- | ------------------------------------------------------------ | -------------- |
| `manifestUrl`          | HTTP(S) manifest URL; relative URLs use the browser location | Required       |
| `fetch`                | Application-provided fetch implementation                    | Global `fetch` |
| `signal`               | Cancellation signal for opening the manifest                 | None           |
| `limits.manifestBytes` | Maximum manifest response bytes                              | 5,000,000      |
| `limits.resourceBytes` | Maximum representation response bytes                        | 8,000,000      |
| `limits.resources`     | Maximum resources in a manifest                              | 10,000         |

`manifestUrl` accepts a string or `URL`. Outside a browser, supply an absolute URL. URLs must omit credentials, query strings, and fragments; the manifest must sit within its declared `publicBase`.

Limits must be positive safe integers. The browser client requires the application origin and refuses redirects. The server must send `application/json` for the manifest and the declared content type for representations.
