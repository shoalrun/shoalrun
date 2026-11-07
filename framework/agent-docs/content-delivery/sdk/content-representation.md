---
id: reference.content-sdk.ContentRepresentation
title: ContentRepresentation
summary: One portable format, including its file metadata, anchors, and typed links.
type: code-reference
area: publishing
subarea: publishing-content-delivery
canonical: /content-delivery/sdk/content-representation
---

# ContentRepresentation

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

**Updated: 2026-09-27.**

**Type** `shoalrun.content.ContentRepresentation`

```typescript
type ContentRepresentation = ContentAsset & {
    anchors: ContentAnchor[];
    links: ContentLink[];
};
```

One portable format, including its file metadata, anchors, and typed links.

## Fields

| Name                                                                                                                                | Type                                                                                   | Required / default | Description |
| ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------ | ----------- |
| [`anchors`](https://www.shoalrun.com/content-delivery/sdk/content-representation.md#shoalrun-content-contentrepresentation-anchors) | [`ContentAnchor`](https://www.shoalrun.com/content-delivery/sdk/content-anchor.md)`[]` | Required           | —           |
| [`links`](https://www.shoalrun.com/content-delivery/sdk/content-representation.md#shoalrun-content-contentrepresentation-links)     | [`ContentLink`](https://www.shoalrun.com/content-delivery/sdk/content-link.md)`[]`     | Required           | —           |

## shoalrun.content.ContentRepresentation.anchors

**Property** `shoalrun.content.ContentRepresentation.anchors`

```typescript
anchors: ContentAnchor[]
```

**Type:&#x20;**[`ContentAnchor`](https://www.shoalrun.com/content-delivery/sdk/content-anchor.md)`[]`

Required

## shoalrun.content.ContentRepresentation.links

**Property** `shoalrun.content.ContentRepresentation.links`

```typescript
links: ContentLink[]
```

**Type:&#x20;**[`ContentLink`](https://www.shoalrun.com/content-delivery/sdk/content-link.md)`[]`

Required
