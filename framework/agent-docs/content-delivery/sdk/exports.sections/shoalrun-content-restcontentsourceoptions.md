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

## shoalrun.content.RestContentSourceOptions

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

### Fields

| Name                                                                                                      | Type                                                                                                                                      | Required / default | Description                                                                              |
| --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ---------------------------------------------------------------------------------------- |
| [`baseUrl`](https://www.shoalrun.com/content-delivery/sdk/rest-content-source-options/base-url.md)        | `string \| URL`                                                                                                                           | Required           | REST mount URL, such as /content/v1. Browser requests must use the application's origin. |
| [`fetch`](https://www.shoalrun.com/content-delivery/sdk/rest-content-source-options/fetch.md)             | `((input: RequestInfo \| URL, init?: RequestInit) => Promise<Response>) \| undefined`                                                     | Optional           | Fetch implementation. Defaults to globalThis.fetch.                                      |
| [`limits`](https://www.shoalrun.com/content-delivery/sdk/rest-content-source-options/limits.md)           | [`ContentDeliveryLimits`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentdeliverylimits)` \| undefined` | Optional           | Inventory and representation bounds.                                                     |
| [`publication`](https://www.shoalrun.com/content-delivery/sdk/rest-content-source-options/publication.md) | [`ContentPublication`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentpublication)                      | Required           | Exact publication to request; include product for a product-scoped source.               |
| [`revision`](https://www.shoalrun.com/content-delivery/sdk/rest-content-source-options/revision.md)       | `string \| undefined`                                                                                                                     | Optional           | Expected inventory revision. Omit it to open the current revision.                       |
| [`signal`](https://www.shoalrun.com/content-delivery/sdk/rest-content-source-options/signal.md)           | `AbortSignal \| undefined`                                                                                                                | Optional           | Cancel the inventory-opening request.                                                    |
