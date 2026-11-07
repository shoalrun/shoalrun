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

## shoalrun.content.ContentMount

**Type** `shoalrun.content.ContentMount`

```typescript
type ContentMount = {
    anchors: readonly ContentAnchor[];
    links: readonly ContentLink[];
    unmount(): void;
};
```

Handles and rewritten routing metadata for one mounted HTML instance.

### Fields

| Name                                                                                | Type                                                                                                                      | Required / default | Description                                                         |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------- |
| [`anchors`](https://www.shoalrun.com/content-delivery/sdk/content-mount/anchors.md) | `readonly `[`ContentAnchor`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentanchor)`[]` | Required           | Anchors after instance-specific ID rewriting.                       |
| [`links`](https://www.shoalrun.com/content-delivery/sdk/content-mount/links.md)     | `readonly `[`ContentLink`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentlink)`[]`     | Required           | Typed links, including rewritten local fragments for this instance. |

### Methods

| Name                                                                                | Kind     | Description                                   |
| ----------------------------------------------------------------------------------- | -------- | --------------------------------------------- |
| [`unmount`](https://www.shoalrun.com/content-delivery/sdk/content-mount/unmount.md) | `method` | Remove nodes that still belong to this mount. |
