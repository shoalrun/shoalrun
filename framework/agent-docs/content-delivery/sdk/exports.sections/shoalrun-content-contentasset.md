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

## shoalrun.content.ContentAsset

**Type** `shoalrun.content.ContentAsset`

```typescript
type ContentAsset = ContentFile & {
    mediaType: string;
};
```

A content-addressed file with its declared media type.

### Fields

| Name                                                                                     | Type     | Required / default | Description |
| ---------------------------------------------------------------------------------------- | -------- | ------------------ | ----------- |
| [`mediaType`](https://www.shoalrun.com/content-delivery/sdk/content-asset/media-type.md) | `string` | Required           | —           |
