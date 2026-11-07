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

## shoalrun.content.ContentLink

**Type** `shoalrun.content.ContentLink`

```typescript
type ContentLink = {
    key: string;
    kind: 'resource' | 'canonical' | 'external' | 'asset';
    href: string;
    ref?: ContentRef;
    fragment?: string;
    query?: string;
    asset?: string;
};
```

Classified link and optional resource identity for application routing.

### Fields

| Name                                                                                                     | Type                                                                                                            | Required / default | Description |
| -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------ | ----------- |
| [`asset`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentlink-asset)       | `string \| undefined`                                                                                           | Optional           | —           |
| [`fragment`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentlink-fragment) | `string \| undefined`                                                                                           | Optional           | —           |
| [`href`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentlink-href)         | `string`                                                                                                        | Required           | —           |
| [`key`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentlink-key)           | `string`                                                                                                        | Required           | —           |
| [`kind`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentlink-kind)         | `"resource" \| "canonical" \| "external" \| "asset"`                                                            | Required           | —           |
| [`query`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentlink-query)       | `string \| undefined`                                                                                           | Optional           | —           |
| [`ref`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentlink-ref)           | [`ContentRef`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentref)` \| undefined` | Optional           | —           |
