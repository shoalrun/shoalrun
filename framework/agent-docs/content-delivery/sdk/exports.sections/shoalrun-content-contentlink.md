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

| Name                                                                                 | Type                                                                                                                | Required / default | Description |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ------------------ | ----------- |
| [`asset`](https://www.shoalrun.com/content-delivery/sdk/content-link/asset.md)       | `string \| undefined`                                                                                               | Optional           | —           |
| [`fragment`](https://www.shoalrun.com/content-delivery/sdk/content-link/fragment.md) | `string \| undefined`                                                                                               | Optional           | —           |
| [`href`](https://www.shoalrun.com/content-delivery/sdk/content-link/href.md)         | `string`                                                                                                            | Required           | —           |
| [`key`](https://www.shoalrun.com/content-delivery/sdk/content-link/key.md)           | `string`                                                                                                            | Required           | —           |
| [`kind`](https://www.shoalrun.com/content-delivery/sdk/content-link/kind.md)         | `"resource" \| "canonical" \| "external" \| "asset"`                                                                | Required           | —           |
| [`query`](https://www.shoalrun.com/content-delivery/sdk/content-link/query.md)       | `string \| undefined`                                                                                               | Optional           | —           |
| [`ref`](https://www.shoalrun.com/content-delivery/sdk/content-link/ref.md)           | [`ContentRef`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentref)` \| undefined` | Optional           | —           |
