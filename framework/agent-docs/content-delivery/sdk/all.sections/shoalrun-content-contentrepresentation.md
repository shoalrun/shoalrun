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

| Name                                                                                                             | Type                                                                                                       | Required / default | Description |
| ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------ | ----------- |
| [`anchors`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentrepresentation-anchors) | [`ContentAnchor`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentanchor)`[]` | Required           | —           |
| [`links`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentrepresentation-links)     | [`ContentLink`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentlink)`[]`     | Required           | —           |
