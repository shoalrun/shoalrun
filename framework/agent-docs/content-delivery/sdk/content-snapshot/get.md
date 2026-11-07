---
id: reference.content-sdk.ContentSnapshot.get
title: get
summary: Fetch one available representation of a stable content reference.
type: code-reference
area: publishing
subarea: publishing-content-delivery
canonical: /content-delivery/sdk/content-snapshot/get
---

# get

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

**Updated: 2026-09-27.**

**Method** `shoalrun.content.ContentSnapshot.get`

```typescript
get(ref: ContentRef, options: { format: ContentFormat; signal?: AbortSignal; }): Promise<ContentResult>
```

Fetch one available representation of a stable content reference.

## Parameters

| Parameter | Type / default                                                                                                            | Description                                                |
| --------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `ref`     | [`ContentRef`](https://www.shoalrun.com/content-delivery/sdk/content-ref.md)                                              | Page, section, or named snippet instance in this snapshot. |
| `options` | `{ format: `[`ContentFormat`](https://www.shoalrun.com/content-delivery/sdk/content-format.md)`; signal?: AbortSignal; }` | Required format and an optional signal for this read.      |

## Returns

`Promise<`[`ContentResult`](https://www.shoalrun.com/content-delivery/sdk/content-result.md)`>`

Validated representation text with its routing and revision metadata.
