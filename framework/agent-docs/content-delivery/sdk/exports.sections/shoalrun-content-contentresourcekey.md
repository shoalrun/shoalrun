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

## shoalrun.content.contentResourceKey

**Function** `shoalrun.content.contentResourceKey`

```typescript
contentResourceKey(ref: ContentRef): string
```

Public identity only: independent of publication, revision, and export filenames.

### Parameters

| Parameter | Type / default                                                                                       | Description |
| --------- | ---------------------------------------------------------------------------------------------------- | ----------- |
| `ref`     | [`ContentRef`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentref) | —           |

### Returns

`string`
