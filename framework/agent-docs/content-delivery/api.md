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

Breadcrumbs: [Reference](https://www.shoalrun.com/cli.md) > Content delivery > Content client API

**Updated: 2026-10-29.**

Import the browser-safe delivery API from `@shoalrun/cli/content`. It reads exports and mounts trusted HTML without loading the compiler. Browser use requires HTTPS or localhost for Web Crypto.

Available since `0.1.0-alpha.13`.

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

## Open a REST source

```ts
openRestContentSource(options): Promise<ContentSnapshot>
```

`RestContentSourceOptions` accepts `baseUrl`, a required `{ channel, version, language }` publication, and an optional `revision`. It also accepts the same `fetch`, `signal`, and `limits` options as the manifest source. `limits.manifestBytes` bounds the JSON inventory response. Opening fetches that inventory and pins subsequent reads to its revision.

Browser URLs must share the application's origin. Outside a browser, provide an absolute HTTP(S) URL. The base URL must omit credentials, query strings, and fragments. `contentResourceKey(ref)` returns a REST resource key; it is distinct from the local comparison key returned by `contentRefKey(ref)`. See the [HTTP reference](https://www.shoalrun.com/content-delivery/http-api.md) for routes and response types.

## Read a snapshot

A snapshot exposes the following members for one opened revision.

| Member                          | Contract                                            |
| ------------------------------- | --------------------------------------------------- |
| `revision`                      | Opened manifest digest                              |
| `publication`                   | Channel, version, and language                      |
| `list()`                        | Read-only resource metadata for this revision       |
| `get(ref, { format, signal? })` | Promise for a checked HTML or Markdown result       |
| `dispose()`                     | Cancel the snapshot lifetime and refuse later reads |

```ts
type ContentRef =
  | { kind: 'page'; documentId: string }
  | { kind: 'section'; documentId: string; sectionId: string }
  | { kind: 'snippet'; id: string };
```

`list()` is synchronous because opening a source loads and freezes its metadata. Each `get()` fetches and checks UTF-8, media type, byte count, and SHA-256 against that revision; the client does not cache response bodies. `dispose()` is idempotent, aborts active reads, and makes later `list()` and `get()` calls fail. The opening signal affects only opening; use the per-read signal or `dispose()` for subsequent reads.

A `ContentResult` contains `resource`, `representation`, `format`, `content`, and `revision`. `contentRefKey(ref)` returns a key for comparing typed references. It is not a URL or authorization decision.

## Validate a manifest

```ts
validateContentManifest(value, maxResources = 10_000, maxResourceBytes = 8_000_000): asserts value is ContentManifest
```

This exported helper checks structure, inventory limits, and approved review metadata. It does not fetch files or verify the manifest digest. Use `openManifestContentSource` for the complete loading and integrity checks. See the [manifest reference](https://www.shoalrun.com/content-delivery/manifest.md) for `ContentResource`, `ContentRepresentation`, `ContentAnchor`, and `ContentLink` fields.

## Mount HTML

```ts
mountContent(container, result, { instanceId?, signal? })
```

The result must be HTML from a trusted export. Mounting replaces the container's children, assigns instance-specific DOM IDs, and rewrites local ID references. The returned `ContentMount` contains `anchors`, `links`, and `unmount()`. See [render content](https://www.shoalrun.com/content-delivery/render.md) for ownership and routing.

`instanceId` is optional; the default uses a random UUID. A supplied ID must start with an ASCII letter and contain at most 128 letters, numbers, underscores, or hyphens. Use a different ID for each simultaneous mount. `anchors` maps original anchor IDs to mounted DOM IDs, while `links` carries routing metadata. `signal` cancels before insertion; aborting it after mounting does not remove content. Call `unmount()` to remove only nodes still owned by that mount.

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

## HTML, Markdown, and agents

The same typed reference selects either available representation. HTML mounting is optional and separate from retrieval. Agents can read Markdown and metadata through the client without a DOM. Digests detect mismatched bytes; they do not establish that an unknown publisher's content is trustworthy.

## Related reading

### Read first

- [Content delivery](https://www.shoalrun.com/content-delivery.md) — Understand resource delivery and its application boundary.

### Related topics

- [Read content with a client](https://www.shoalrun.com/content-delivery/client.md) — Look up client methods, limits, and errors.

- [Serve content through REST](https://www.shoalrun.com/content-delivery/rest.md) — Use the shared snapshot methods and client limits.
