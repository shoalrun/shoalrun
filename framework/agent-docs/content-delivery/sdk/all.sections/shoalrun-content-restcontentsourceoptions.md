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

| Name                                                                                                                        | Type                                                                                                                                  | Required / default | Description                                                                              |
| --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ---------------------------------------------------------------------------------------- |
| [`baseUrl`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-restcontentsourceoptions-baseurl)         | `string \| URL`                                                                                                                       | Required           | REST mount URL, such as /content/v1. Browser requests must use the application's origin. |
| [`fetch`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-restcontentsourceoptions-fetch)             | `((input: RequestInfo \| URL, init?: RequestInit) => Promise<Response>) \| undefined`                                                 | Optional           | Fetch implementation. Defaults to globalThis.fetch.                                      |
| [`limits`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-restcontentsourceoptions-limits)           | [`ContentDeliveryLimits`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentdeliverylimits)` \| undefined` | Optional           | Inventory and representation bounds.                                                     |
| [`publication`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-restcontentsourceoptions-publication) | [`ContentPublication`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentpublication)                      | Required           | Exact publication to request; include product for a product-scoped source.               |
| [`revision`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-restcontentsourceoptions-revision)       | `string \| undefined`                                                                                                                 | Optional           | Expected inventory revision. Omit it to open the current revision.                       |
| [`signal`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-restcontentsourceoptions-signal)           | `AbortSignal \| undefined`                                                                                                            | Optional           | Cancel the inventory-opening request.                                                    |
