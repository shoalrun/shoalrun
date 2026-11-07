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

Breadcrumbs: [Reference](https://www.shoalrun.com/cli.md) > Content delivery > TypeScript reference

**Updated: 2026-11-07.**

Parent page: [Full Markdown page](/content-delivery/sdk/all.md)

## shoalrun.content.ContentSnapshot

**Interface** `shoalrun.content.ContentSnapshot`

```typescript
interface ContentSnapshot
```

A client pinned to one immutable inventory revision and publication.

### Fields

| Name                                                                                                               | Type                                                                                                                           | Required / default | Description                                                        |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | ------------------ | ------------------------------------------------------------------ |
| [`publication`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentsnapshot-publication) | `Readonly<`[`ContentPublication`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentpublication)`>` | Required           | Publication shared by every resource available from this snapshot. |
| [`revision`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentsnapshot-revision)       | `string`                                                                                                                       | Required           | Content digest identifying this inventory revision.                |

### Methods

| Name                                                                                                       | Kind     | Description                                                               |
| ---------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------- |
| [`dispose`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentsnapshot-dispose) | `method` | Cancel pending requests and prevent subsequent reads or inventory access. |
| [`get`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentsnapshot-get)         | `method` | Fetch one available representation of a stable content reference.         |
| [`list`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentsnapshot-list)       | `method` | List the resources in the opened inventory without fetching their bodies. |
