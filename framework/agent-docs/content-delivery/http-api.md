---
id: reference.content-rest
title: Content REST API
summary: Look up resource routes, publication parameters, revision checks,
  caching, and HTTP errors.
type: reference
area: publishing
subarea: publishing-content-delivery
canonical: /content-delivery/http-api
---

# Content REST API

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Reference](https://www.shoalrun.com/.well-known/shoalrun/navigation/reference-tab-50f26fe22670.txt) (ID: reference-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Reference](https://www.shoalrun.com/cli.md) > Content delivery > Content REST API > Overview

**Updated: 2026-11-05.**

**Available since: 0.1.0-alpha.13.**

Content REST contract v1 exposes one reviewed resource inventory per configured publication. The default base path is `/content/v1`. Protocol v1 is independent of the package release and publication version.

The host application supplies the API origin. The relative server URL `/content/v1` describes a mount, not a live endpoint on this documentation site. Use the [local example](https://www.shoalrun.com/content-delivery/rest.md) to try requests.

## Operations

The following references are generated from the reviewed OpenAPI source. They contain each operation's parameters, response schemas, examples, and source download.

| Operation                                                                                                                                | Purpose                                              |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| [List resource metadata](https://www.shoalrun.com/content-delivery/http-api/operations/list-content-resources-8e977ec7.md)               | Discover resources and the loaded revision           |
| [List metadata headers](https://www.shoalrun.com/content-delivery/http-api/operations/list-content-resources-head-b67cbad9.md)           | Check the inventory without a response body          |
| [Read resource metadata](https://www.shoalrun.com/content-delivery/http-api/operations/get-content-resource-849f1c49.md)                 | Inspect one resource in a pinned revision            |
| [Read metadata headers](https://www.shoalrun.com/content-delivery/http-api/operations/get-content-resource-head-0a352acd.md)             | Check one resource without a response body           |
| [Read HTML or Markdown](https://www.shoalrun.com/content-delivery/http-api/operations/get-content-representation-fa1d2e3f.md)            | Fetch original representation bytes                  |
| [Read representation headers](https://www.shoalrun.com/content-delivery/http-api/operations/get-content-representation-head-4052375c.md) | Check representation headers without a response body |

## Keep publication and revision together

All routes require a channel, version, and language. Omit `revision` only to discover the current inventory; copy its returned revision into subsequent requests. There is no pagination, search query, or fallback to another publication.

Since 0.1.0-alpha.18

Upgrade the exporter and content client together to use product-scoped bundles.

Product-scoped requests also require `product`, for example:

```text
/content/v1/resources?product=payments&channel=production&version=v3&language=en
```

Omitting `product` selects only a productless publication. When only matching product publications exist, the request returns `400 invalid_request`; the handler doesn't choose a product for you. An unknown product or complete publication returns `404 not_found`.

Inventory and resource-metadata envelopes use `schemaVersion: 1` without a product, or `schemaVersion: 2` with one. A resource's publication must match the envelope, including `product`. Keep all returned coordinates and the revision together on later reads. The protocol path stays `/content/v1`; it isn't the envelope schema version.

Treat the returned resource `key` as opaque. It identifies a page, section, or snippet instance independently of publication and revision. JavaScript integrations can use `contentResourceKey(ref)` from `@shoalrun/cli/content`. Don't substitute filenames, headings, or document IDs for the returned key.

## Caching and revisions

Successful responses include a strong `ETag` containing the SHA-256 of their response bytes. `If-None-Match` can return `304` without a body. An inventory request without `revision` uses `Cache-Control: no-cache`. Successful revision-pinned requests use `public, max-age=31536000, immutable`.

An unavailable revision returns `409`; the handler doesn't silently serve newer content. Errors use JSON with an `error.code` and `error.message`, and `Cache-Control: no-store`. `HEAD` returns the same status and headers without a body. The supplied browser client requests fresh responses and verifies representation bytes against the inventory; it doesn't maintain an HTTP response cache.

## Host the reference handler

Import `createContentRestHandler` from `@shoalrun/cli/content/server`:

```ts
createContentRestHandler({ sources, basePath? }):
  (request: Request) => Promise<Response>
```

`sources` is an array of already-open `ContentSnapshot` instances with distinct publications. `basePath` defaults to `/content/v1`; use an absolute path without a trailing slash. Segments accept ASCII letters, numbers, underscores, and hyphens. The caller owns the listener, routing, source disposal, and access policy. See [serve content through REST](https://www.shoalrun.com/content-delivery/rest.md) for setup.

The adapter sends representation bytes unchanged. Continue hosting the original export's static asset and link mount. It doesn't supply authentication, search, editing, or revision history.

## HTML, Markdown, and agents

Each native operation reference presents its source-backed request and response contract in HTML and Markdown. Agents can use those schemas and examples to list resources and request Markdown with the same publication and revision. HTML responses are passive content; the API doesn't supply application styling or browser behavior.

## Related reading

### Read first

- [Serve content through REST](https://www.shoalrun.com/content-delivery/rest.md) — Set up the reference HTTP adapter.

### Related topics

- [Serve content through REST](https://www.shoalrun.com/content-delivery/rest.md) — Look up HTTP routes and revision handling.
