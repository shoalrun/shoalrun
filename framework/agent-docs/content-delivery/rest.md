---
id: guide.content-rest
title: Serve content through REST
summary: Expose reviewed content snapshots over HTTP and read them through the
  content client.
type: how-to
area: publishing
subarea: publishing-content-delivery
subjectLifecycle: in-development
canonical: /content-delivery/rest
---

# Serve content through REST

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Content delivery > Serve content through REST

**Updated: 2026-10-28.**

**Status: In development.**

Serve the same reviewed pages, sections, and snippet instances through the Content REST API. The reference adapter accepts already-open snapshots and exposes a Fetch-style request handler. Your host provides the HTTP listener, request routing, and any access controls.

## Prepare a snapshot

First [export selected resources](https://www.shoalrun.com/content-delivery/select.md) and serve the complete bundle at its configured `publicBase`. Open its manifest on the server:

```ts
import { openManifestContentSource } from '@shoalrun/cli/content';
import { createContentRestHandler } from '@shoalrun/cli/content/server';

const source = await openManifestContentSource({
  manifestUrl: 'http://localhost:8787/content/revisions/r1/manifest.json',
});
const handleContent = createContentRestHandler({ sources: [source] });

// In your host's /content/v1 request route:
const response = await handleContent(request);
```

The host passes a standard `Request` and sends the returned `Response`. `createContentRestHandler` does not start a listener. Import its server entry point only in server code. Browser clients use the separate entry point shown below.

Supply at most one snapshot for each channel, version, and language combination. The handler retains those revisions for its lifetime. It does not reload manifests or keep an archive. Keep sources alive while requests use them, then dispose them during host shutdown.

## Read through the client

A browser client opens the API from the application's origin. Use HTTPS or localhost for Web Crypto:

```ts
import { openRestContentSource } from '@shoalrun/cli/content';

const snapshot = await openRestContentSource({
  baseUrl: '/content/v1',
  publication: { channel: 'production', version: 'current', language: 'en' },
});
try {
  const result = await snapshot.get(
    { kind: 'page', documentId: 'guide.billing' },
    { format: 'markdown' },
  );
  console.log(result.content);
} finally {
  snapshot.dispose();
}
```

Select `guide.billing` in the export before running this example. Outside a browser, provide an absolute HTTP(S) `baseUrl`. Opening loads the resource list and pins later reads to its revision. Pass `revision` when the caller already knows which revision it needs. The returned [ContentSnapshot](https://www.shoalrun.com/content-delivery/api.md) has the same `list`, `get`, and `dispose` methods as the manifest client.

## Try the local example

Copy the package's `examples/content-delivery` directory into a project with the new implementation installed. From that copied directory, build the export and start its preview:

```sh
npx --no-install shoalrun export docs.config.yaml --target app-help --out public/help/releases/demo
node preview.mjs
```

Open `http://127.0.0.1:8775/settings/billing?delivery=rest`. The example hosts its static bundle and REST routes on the same origin. Open the billing guide and refund section to check both resource shapes. Removing `?delivery=rest` uses static manifest delivery with the same application interface.

## Keep assets and links available

The adapter sends representation bytes unchanged. Images and links still point to the export's configured static locations; the REST endpoint does not replace that asset mount. Keep the complete bundle hosted alongside the API. Applications can also route typed resource links through their own interface.

For a new release, open the new snapshot and replace the handler in your host. Clients pinned to an unavailable older revision receive `409 stale_revision`. Retaining historical revisions or routing between them requires host code beyond this adapter. See [publish and update content](https://www.shoalrun.com/content-delivery/publish.md).

## Check the HTTP boundary

The [HTTP reference](https://www.shoalrun.com/content-delivery/http-api.md) describes REST contract v1. That protocol version is separate from the package release and the content publication's `version` value.

The adapter lists and reads approved resources. It does not implement authentication, search, content editing, or an MCP service. Place authorization before the handler when required. Successful pinned responses use public immutable caching; a host protecting private content must override that cache policy before sending responses.

## HTML, Markdown, and agents

Agents can list resources, keep the returned revision, and fetch Markdown without operating browser controls. HTML responses remain passive fragments for a trusted application renderer. REST changes the transport, not section approval, content context, or representation bytes.

## Related reading

### Read first

- [Content delivery](https://www.shoalrun.com/content-delivery.md) — Understand reviewed resources and snapshots. (Status: in development.)

### Related topics

- [Content REST API](https://www.shoalrun.com/content-delivery/http-api.md) — Look up HTTP routes and revision handling. (Status: in development.)

- [Content client API](https://www.shoalrun.com/content-delivery/api.md) — Use the shared snapshot methods and client limits. (Status: in development.)
