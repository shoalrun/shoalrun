---
id: reference.content-sdk.contentRefKey
title: contentRefKey
summary: Serialize a reference to a deterministic key without including
  publication scope.
type: code-reference
area: publishing
subarea: publishing-content-delivery
canonical: /content-delivery/sdk/content-ref-key
---

# contentRefKey

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

**Updated: 2026-09-27.**

**Function** `shoalrun.content.contentRefKey`

```typescript
contentRefKey(ref: ContentRef): string
```

Serialize a reference to a deterministic key without including publication scope.

## Parameters

| Parameter | Type / default                                                               | Description |
| --------- | ---------------------------------------------------------------------------- | ----------- |
| `ref`     | [`ContentRef`](https://www.shoalrun.com/content-delivery/sdk/content-ref.md) | —           |

## Returns

`string`
