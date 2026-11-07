---
id: reference.content-sdk.complete
title: Complete content client reference
summary: Public exports from @shoalrun/cli/content, with signatures and JSDoc
  from TypeScript declarations.
type: code-reference
area: publishing
subarea: publishing-content-delivery
canonical: /content-delivery/sdk/all
---

# Complete content client reference

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Reference](https://www.shoalrun.com/.well-known/shoalrun/navigation/reference-tab-50f26fe22670.txt) (ID: reference-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Reference](https://www.shoalrun.com/cli.md) > Content delivery > TypeScript symbols > Complete reference

**Updated: 2026-11-07.**

Parent page: [Full Markdown page](/content-delivery/sdk/all.md)

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

| Name                                                                                                                            | Type                                                                                                                                  | Required / default | Description                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ---------------------------------------------------------------------------- |
| [`fetch`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-manifestcontentsourceoptions-fetch)             | `((input: RequestInfo \| URL, init?: RequestInit) => Promise<Response>) \| undefined`                                                 | Optional           | Fetch implementation. Defaults to globalThis.fetch.                          |
| [`limits`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-manifestcontentsourceoptions-limits)           | [`ContentDeliveryLimits`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentdeliverylimits)` \| undefined` | Optional           | Inventory and representation bounds.                                         |
| [`manifestUrl`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-manifestcontentsourceoptions-manifesturl) | `string \| URL`                                                                                                                       | Required           | Manifest URL; a browser resolves relative URLs against its current location. |
| [`signal`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-manifestcontentsourceoptions-signal)           | `AbortSignal \| undefined`                                                                                                            | Optional           | Cancel the opening request. Use get's signal to cancel an individual read.   |
