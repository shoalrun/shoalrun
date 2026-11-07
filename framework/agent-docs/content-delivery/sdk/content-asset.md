---
id: reference.content-sdk.ContentAsset
title: ContentAsset
summary: A content-addressed file with its declared media type.
type: code-reference
area: publishing
subarea: publishing-content-delivery
canonical: /content-delivery/sdk/content-asset
---

# ContentAsset

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

**Updated: 2026-09-27.**

**Type** `shoalrun.content.ContentAsset`

```typescript
type ContentAsset = ContentFile & {
    mediaType: string;
};
```

A content-addressed file with its declared media type.

## Fields

| Name                                                                                                                  | Type     | Required / default | Description |
| --------------------------------------------------------------------------------------------------------------------- | -------- | ------------------ | ----------- |
| [`mediaType`](https://www.shoalrun.com/content-delivery/sdk/content-asset.md#shoalrun-content-contentasset-mediatype) | `string` | Required           | —           |

## shoalrun.content.ContentAsset.mediaType

**Property** `shoalrun.content.ContentAsset.mediaType`

```typescript
mediaType: string
```

**Type:&#x20;**`string`

Required
