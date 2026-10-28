---
id: guide.content-client
title: Read content with a client
summary: Open a content revision and read typed resources without depending on
  generated filenames.
type: how-to
area: publishing
subarea: publishing-content-delivery
subjectLifecycle: in-development
canonical: /content-delivery/client
---

# Read content with a client

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Content delivery > Read content with a client

**Updated: 2026-10-28.**

**Status: In development.**

Use the content client in an application to read a static export. Serve the bundle from the application's origin and use your normal JavaScript build tooling to import `@shoalrun/cli/content`.

## Open a revision

```ts
import { openManifestContentSource } from '@shoalrun/cli/content';

const snapshot = await openManifestContentSource({
  manifestUrl: '/content/revisions/r1/manifest.json',
});
```

Use an absolute HTTP(S) URL outside a browser. In a browser, the manifest must share the application's origin. Its location must match the export's `publicBase`. The client does not accept URL credentials, query parameters, or fragments in the manifest URL.

Browser use requires HTTPS or localhost because integrity checks use Web Crypto.

Opening fetches and validates the manifest once. `snapshot.revision` identifies that opened revision; it does not track a moving latest pointer.

## Read a resource

```ts
const resources = snapshot.list();
const result = await snapshot.get(
  { kind: 'section', documentId: 'guide.billing', sectionId: 'refunds' },
  { format: 'markdown' },
);
console.log(result.content);
```

A result includes resource metadata, representation metadata, format, content, and revision. The client verifies representation size and SHA-256 digest before returning content. It does not evaluate MDX, interpolate variables, or run components in the browser.

## Handle changes and cancellation

Pass an `AbortSignal` to an individual `get` to cancel obsolete navigation. Call `snapshot.dispose()` when the application stops using the revision. A disposed snapshot refuses further reads.

If a representation is missing or differs from the opened manifest, the client reports `stale_revision`. Keep the current display, open a complete replacement revision, and retry deliberately. Do not combine resource lists from one revision with files from another.

A custom `fetch` function can integrate the application's request handling. It does not bypass same-origin, content-type, size, or digest checks. Use [openRestContentSource](https://www.shoalrun.com/content-delivery/rest.md) for the same `ContentSnapshot` contract over HTTP.

## HTML, Markdown, and agents

Request HTML for [application rendering](https://www.shoalrun.com/content-delivery/render.md) or Markdown for text consumers and agents. Neither requires a browser widget to recover the content. The manifest records availability per representation; requesting an omitted format returns `unsupported_format` rather than silently converting it.

## Related reading

### Read first

- [Content delivery](https://www.shoalrun.com/content-delivery.md) — Understand resource delivery and its application boundary. (Status: in development.)

### Related topics

- [Select content resources](https://www.shoalrun.com/content-delivery/select.md) — Read a reviewed export from an application. (Status: in development.)

- [Content client API](https://www.shoalrun.com/content-delivery/api.md) — Look up client methods, limits, and errors. (Status: in development.)

- [Render content in an application](https://www.shoalrun.com/content-delivery/render.md) — Mount trusted HTML and route its links. (Status: in development.)
