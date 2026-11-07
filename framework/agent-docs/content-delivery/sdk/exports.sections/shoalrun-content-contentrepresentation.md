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

## shoalrun.content.ContentRepresentation

**Type** `shoalrun.content.ContentRepresentation`

```typescript
type ContentRepresentation = ContentAsset & {
    anchors: ContentAnchor[];
    links: ContentLink[];
};
```

One portable format, including its file metadata, anchors, and typed links.

### Fields

| Name                                                                                         | Type                                                                                                           | Required / default | Description |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------ | ----------- |
| [`anchors`](https://www.shoalrun.com/content-delivery/sdk/content-representation/anchors.md) | [`ContentAnchor`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentanchor)`[]` | Required           | —           |
| [`links`](https://www.shoalrun.com/content-delivery/sdk/content-representation/links.md)     | [`ContentLink`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentlink)`[]`     | Required           | —           |
