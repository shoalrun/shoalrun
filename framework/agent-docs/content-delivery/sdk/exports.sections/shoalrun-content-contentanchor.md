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

## shoalrun.content.ContentAnchor

**Type** `shoalrun.content.ContentAnchor`

```typescript
type ContentAnchor = {
    id: string;
    exportedId: string;
    title?: string;
};
```

Mapping from a canonical document fragment to its exported HTML ID.

### Fields

| Name                                                                                        | Type                  | Required / default | Description |
| ------------------------------------------------------------------------------------------- | --------------------- | ------------------ | ----------- |
| [`exportedId`](https://www.shoalrun.com/content-delivery/sdk/content-anchor/exported-id.md) | `string`              | Required           | —           |
| [`id`](https://www.shoalrun.com/content-delivery/sdk/content-anchor/id.md)                  | `string`              | Required           | —           |
| [`title`](https://www.shoalrun.com/content-delivery/sdk/content-anchor/title.md)            | `string \| undefined` | Optional           | —           |
