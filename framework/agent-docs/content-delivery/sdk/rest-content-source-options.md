---
id: reference.content-sdk.RestContentSourceOptions
title: RestContentSourceOptions
summary: Options for a REST inventory and its revision-pinned resource reads.
type: code-reference
area: publishing
subarea: publishing-content-delivery
canonical: /content-delivery/sdk/rest-content-source-options
---

# RestContentSourceOptions

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

**Updated: 2026-09-27.**

**Type** `shoalrun.content.RestContentSourceOptions`

```typescript
type RestContentSourceOptions = {
    baseUrl: string | URL;
    publication: ContentPublication;
    revision?: string;
    fetch?: typeof globalThis.fetch;
    signal?: AbortSignal;
    limits?: ContentDeliveryLimits;
};
```

Options for a REST inventory and its revision-pinned resource reads.

## Fields

| Name                                                                                                                                                | Type                                                                                                               | Required / default | Description                                                                              |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------ | ---------------------------------------------------------------------------------------- |
| [`baseUrl`](https://www.shoalrun.com/content-delivery/sdk/rest-content-source-options.md#shoalrun-content-restcontentsourceoptions-baseurl)         | `string \| URL`                                                                                                    | Required           | REST mount URL, such as /content/v1. Browser requests must use the application's origin. |
| [`fetch`](https://www.shoalrun.com/content-delivery/sdk/rest-content-source-options.md#shoalrun-content-restcontentsourceoptions-fetch)             | `((input: RequestInfo \| URL, init?: RequestInit) => Promise<Response>) \| undefined`                              | Optional           | Fetch implementation. Defaults to globalThis.fetch.                                      |
| [`limits`](https://www.shoalrun.com/content-delivery/sdk/rest-content-source-options.md#shoalrun-content-restcontentsourceoptions-limits)           | [`ContentDeliveryLimits`](https://www.shoalrun.com/content-delivery/sdk/content-delivery-limits.md)` \| undefined` | Optional           | Inventory and representation bounds.                                                     |
| [`publication`](https://www.shoalrun.com/content-delivery/sdk/rest-content-source-options.md#shoalrun-content-restcontentsourceoptions-publication) | [`ContentPublication`](https://www.shoalrun.com/content-delivery/sdk/content-publication.md)                       | Required           | Exact publication to request; include product for a product-scoped source.               |
| [`revision`](https://www.shoalrun.com/content-delivery/sdk/rest-content-source-options.md#shoalrun-content-restcontentsourceoptions-revision)       | `string \| undefined`                                                                                              | Optional           | Expected inventory revision. Omit it to open the current revision.                       |
| [`signal`](https://www.shoalrun.com/content-delivery/sdk/rest-content-source-options.md#shoalrun-content-restcontentsourceoptions-signal)           | `AbortSignal \| undefined`                                                                                         | Optional           | Cancel the inventory-opening request.                                                    |

## shoalrun.content.RestContentSourceOptions.baseUrl

**Property** `shoalrun.content.RestContentSourceOptions.baseUrl`

```typescript
baseUrl: string | URL
```

REST mount URL, such as /content/v1. Browser requests must use the application's origin.

**Type:&#x20;**`string | URL`

Required

## shoalrun.content.RestContentSourceOptions.fetch

**Property** `shoalrun.content.RestContentSourceOptions.fetch`

```typescript
fetch?: ((input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) | undefined
```

Fetch implementation. Defaults to globalThis.fetch.

**Type:&#x20;**`((input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) | undefined`

Optional

## shoalrun.content.RestContentSourceOptions.limits

**Property** `shoalrun.content.RestContentSourceOptions.limits`

```typescript
limits?: ContentDeliveryLimits | undefined
```

Inventory and representation bounds.

**Type:&#x20;**[`ContentDeliveryLimits`](https://www.shoalrun.com/content-delivery/sdk/content-delivery-limits.md)` | undefined`

Optional

## shoalrun.content.RestContentSourceOptions.publication

**Property** `shoalrun.content.RestContentSourceOptions.publication`

```typescript
publication: ContentPublication
```

Exact publication to request; include product for a product-scoped source.

**Type:&#x20;**[`ContentPublication`](https://www.shoalrun.com/content-delivery/sdk/content-publication.md)

Required

## shoalrun.content.RestContentSourceOptions.revision

**Property** `shoalrun.content.RestContentSourceOptions.revision`

```typescript
revision?: string | undefined
```

Expected inventory revision. Omit it to open the current revision.

**Type:&#x20;**`string | undefined`

Optional

## shoalrun.content.RestContentSourceOptions.signal

**Property** `shoalrun.content.RestContentSourceOptions.signal`

```typescript
signal?: AbortSignal | undefined
```

Cancel the inventory-opening request.

**Type:&#x20;**`AbortSignal | undefined`

Optional
