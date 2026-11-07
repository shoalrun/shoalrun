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

## Errors

Use `ContentDeliveryError.code` to distinguish these failures.

| Code                 | Meaning                                                                                                                                |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `invalid_manifest`   | Invalid source URL, options, inventory, manifest shape, digest, or review metadata                                                     |
| `not_found`          | Missing manifest, unknown resource reference, or REST `404`                                                                            |
| `unsupported_format` | Unavailable representation, REST `406`, or non-HTML input passed to `mountContent`                                                     |
| `stale_revision`     | Content bytes differ from the opened revision, a static representation file is missing, or REST returns `409`                          |
| `network_error`      | Failed or interrupted request; REST `400`, `405`, or `500`; or HTTP failures outside the REST contract, such as `401`, `429`, or `503` |
| `invalid_content`    | Wrong response media type, invalid UTF-8, exceeded response limit, malformed REST error, or invalid mount content                      |
| `disposed`           | Reading a disposed snapshot or a read aborted by disposal                                                                              |

The static client maps a missing representation file to `stale_revision`; the REST client preserves `404` as `not_found`. Opening a REST inventory with a different requested revision also produces `stale_revision`.

Defined REST error statuses must carry the documented JSON envelope. A malformed envelope produces `invalid_content`; other HTTP failure statuses produce `network_error` regardless of response body format.

Cancellation can propagate the signal's abort reason instead of a `ContentDeliveryError`. Treat messages as diagnostics rather than parsing them for program logic.
