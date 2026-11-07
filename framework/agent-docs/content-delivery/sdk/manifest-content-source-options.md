---
id: reference.content-sdk.ManifestContentSourceOptions
title: ManifestContentSourceOptions
summary: Configuration for opening a static content-export manifest.
type: code-reference
area: publishing
subarea: publishing-content-delivery
canonical: /content-delivery/sdk/manifest-content-source-options
---

# ManifestContentSourceOptions

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

**Updated: 2026-09-27.**

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

## Fields

| Name                                                                                                                                                        | Type                                                                                                               | Required / default | Description                                                                  |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------ | ---------------------------------------------------------------------------- |
| [`fetch`](https://www.shoalrun.com/content-delivery/sdk/manifest-content-source-options.md#shoalrun-content-manifestcontentsourceoptions-fetch)             | `((input: RequestInfo \| URL, init?: RequestInit) => Promise<Response>) \| undefined`                              | Optional           | Fetch implementation. Defaults to globalThis.fetch.                          |
| [`limits`](https://www.shoalrun.com/content-delivery/sdk/manifest-content-source-options.md#shoalrun-content-manifestcontentsourceoptions-limits)           | [`ContentDeliveryLimits`](https://www.shoalrun.com/content-delivery/sdk/content-delivery-limits.md)` \| undefined` | Optional           | Inventory and representation bounds.                                         |
| [`manifestUrl`](https://www.shoalrun.com/content-delivery/sdk/manifest-content-source-options.md#shoalrun-content-manifestcontentsourceoptions-manifesturl) | `string \| URL`                                                                                                    | Required           | Manifest URL; a browser resolves relative URLs against its current location. |
| [`signal`](https://www.shoalrun.com/content-delivery/sdk/manifest-content-source-options.md#shoalrun-content-manifestcontentsourceoptions-signal)           | `AbortSignal \| undefined`                                                                                         | Optional           | Cancel the opening request. Use get's signal to cancel an individual read.   |

## shoalrun.content.ManifestContentSourceOptions.fetch

**Property** `shoalrun.content.ManifestContentSourceOptions.fetch`

```typescript
fetch?: ((input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) | undefined
```

Fetch implementation. Defaults to globalThis.fetch.

**Type:&#x20;**`((input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) | undefined`

Optional

## shoalrun.content.ManifestContentSourceOptions.limits

**Property** `shoalrun.content.ManifestContentSourceOptions.limits`

```typescript
limits?: ContentDeliveryLimits | undefined
```

Inventory and representation bounds.

**Type:&#x20;**[`ContentDeliveryLimits`](https://www.shoalrun.com/content-delivery/sdk/content-delivery-limits.md)` | undefined`

Optional

## shoalrun.content.ManifestContentSourceOptions.manifestUrl

**Property** `shoalrun.content.ManifestContentSourceOptions.manifestUrl`

```typescript
manifestUrl: string | URL
```

Manifest URL; a browser resolves relative URLs against its current location.

**Type:&#x20;**`string | URL`

Required

## shoalrun.content.ManifestContentSourceOptions.signal

**Property** `shoalrun.content.ManifestContentSourceOptions.signal`

```typescript
signal?: AbortSignal | undefined
```

Cancel the opening request. Use get's signal to cancel an individual read.

**Type:&#x20;**`AbortSignal | undefined`

Optional
