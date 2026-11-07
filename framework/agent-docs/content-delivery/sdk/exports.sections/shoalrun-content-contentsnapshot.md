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

## shoalrun.content.ContentSnapshot

**Interface** `shoalrun.content.ContentSnapshot`

```typescript
interface ContentSnapshot
```

A client pinned to one immutable inventory revision and publication.

### Fields

| Name                                                                                           | Type                                                                                                                               | Required / default | Description                                                        |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------ |
| [`publication`](https://www.shoalrun.com/content-delivery/sdk/content-snapshot/publication.md) | `Readonly<`[`ContentPublication`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentpublication)`>` | Required           | Publication shared by every resource available from this snapshot. |
| [`revision`](https://www.shoalrun.com/content-delivery/sdk/content-snapshot/revision.md)       | `string`                                                                                                                           | Required           | Content digest identifying this inventory revision.                |

### Methods

| Name                                                                                   | Kind     | Description                                                               |
| -------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------- |
| [`dispose`](https://www.shoalrun.com/content-delivery/sdk/content-snapshot/dispose.md) | `method` | Cancel pending requests and prevent subsequent reads or inventory access. |
| [`get`](https://www.shoalrun.com/content-delivery/sdk/content-snapshot/get.md)         | `method` | Fetch one available representation of a stable content reference.         |
| [`list`](https://www.shoalrun.com/content-delivery/sdk/content-snapshot/list.md)       | `method` | List the resources in the opened inventory without fetching their bodies. |
