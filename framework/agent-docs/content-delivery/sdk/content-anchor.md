---
id: reference.content-sdk.ContentAnchor
title: ContentAnchor
summary: Mapping from a canonical document fragment to its exported HTML ID.
type: code-reference
area: publishing
subarea: publishing-content-delivery
canonical: /content-delivery/sdk/content-anchor
---

# ContentAnchor

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

**Updated: 2026-09-27.**

**Type** `shoalrun.content.ContentAnchor`

```typescript
type ContentAnchor = {
    id: string;
    exportedId: string;
    title?: string;
};
```

Mapping from a canonical document fragment to its exported HTML ID.

## Fields

| Name                                                                                                                      | Type                  | Required / default | Description |
| ------------------------------------------------------------------------------------------------------------------------- | --------------------- | ------------------ | ----------- |
| [`exportedId`](https://www.shoalrun.com/content-delivery/sdk/content-anchor.md#shoalrun-content-contentanchor-exportedid) | `string`              | Required           | —           |
| [`id`](https://www.shoalrun.com/content-delivery/sdk/content-anchor.md#shoalrun-content-contentanchor-id)                 | `string`              | Required           | —           |
| [`title`](https://www.shoalrun.com/content-delivery/sdk/content-anchor.md#shoalrun-content-contentanchor-title)           | `string \| undefined` | Optional           | —           |

## shoalrun.content.ContentAnchor.exportedId

**Property** `shoalrun.content.ContentAnchor.exportedId`

```typescript
exportedId: string
```

**Type:&#x20;**`string`

Required

## shoalrun.content.ContentAnchor.id

**Property** `shoalrun.content.ContentAnchor.id`

```typescript
id: string
```

**Type:&#x20;**`string`

Required

## shoalrun.content.ContentAnchor.title

**Property** `shoalrun.content.ContentAnchor.title`

```typescript
title?: string | undefined
```

**Type:&#x20;**`string | undefined`

Optional
