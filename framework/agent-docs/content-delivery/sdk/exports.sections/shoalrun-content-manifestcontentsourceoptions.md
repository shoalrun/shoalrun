---
id: reference.content-sdk.exports
title: shoalrun.content
summary: "module: shoalrun.content"
type: code-reference
area: publishing
subarea: publishing-content-delivery
canonical: /content-delivery/sdk/exports
---

# shoalrun.content

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

**Updated: 2026-09-27.**

Parent page: [Full Markdown page](/content-delivery/sdk/exports.md)

**Module** `shoalrun.content`

## shoalrun.content.ManifestContentSourceOptions

**Type** `shoalrun.content.ManifestContentSourceOptions`

```typescript
type ManifestContentSourceOptions = {
    manifestUrl: string | URL;
    fetch?: typeof globalThis.fetch;
    signal?: AbortSignal;
    limits?: ContentDeliveryLimits;
};
```

Configuration for opening a static content-export manifest.

### Fields

| Name                                                                                                           | Type                                                                                                                                      | Required / default | Description                                                                  |
| -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ---------------------------------------------------------------------------- |
| [`fetch`](https://www.shoalrun.com/content-delivery/sdk/manifest-content-source-options/fetch.md)              | `((input: RequestInfo \| URL, init?: RequestInit) => Promise<Response>) \| undefined`                                                     | Optional           | Fetch implementation. Defaults to globalThis.fetch.                          |
| [`limits`](https://www.shoalrun.com/content-delivery/sdk/manifest-content-source-options/limits.md)            | [`ContentDeliveryLimits`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentdeliverylimits)` \| undefined` | Optional           | Inventory and representation bounds.                                         |
| [`manifestUrl`](https://www.shoalrun.com/content-delivery/sdk/manifest-content-source-options/manifest-url.md) | `string \| URL`                                                                                                                           | Required           | Manifest URL; a browser resolves relative URLs against its current location. |
| [`signal`](https://www.shoalrun.com/content-delivery/sdk/manifest-content-source-options/signal.md)            | `AbortSignal \| undefined`                                                                                                                | Optional           | Cancel the opening request. Use get's signal to cancel an individual read.   |
