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

## Open a REST source

```ts
openRestContentSource(options): Promise<ContentSnapshot>
```

`RestContentSourceOptions` accepts `baseUrl`, a required `{ channel, version, language }` publication, and an optional `revision`. It also accepts the same `fetch`, `signal`, and `limits` options as the manifest source. `limits.manifestBytes` bounds the JSON inventory response. Opening fetches that inventory and pins subsequent reads to its revision.

Since 0.1.0-alpha.18

Upgrade the exporter and content client together to use product-scoped bundles.

For a product-scoped source, pass `{ product, channel, version, language }` as `publication`. The client sends `product` on inventory and resource requests and rejects responses for a different product. Productless responses use envelope `schemaVersion: 1`; product responses use `schemaVersion: 2`. Both use the `/content/v1` protocol path.

```ts
const snapshot = await openRestContentSource({
  baseUrl: '/content/v1',
  publication: { product: 'payments', channel: 'production', version: 'v3', language: 'en' },
});
```

Browser URLs must share the application's origin. Outside a browser, provide an absolute HTTP(S) URL. The base URL must omit credentials, query strings, and fragments. `contentResourceKey(ref)` returns a REST resource key; it's distinct from the local comparison key returned by `contentRefKey(ref)`. See the [HTTP reference](https://www.shoalrun.com/content-delivery/http-api.md) for routes and response types.
