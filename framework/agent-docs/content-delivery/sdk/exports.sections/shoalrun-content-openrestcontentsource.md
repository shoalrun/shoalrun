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

## shoalrun.content.openRestContentSource

**Function** `shoalrun.content.openRestContentSource`

```typescript
openRestContentSource(options: RestContentSourceOptions): Promise<ContentSnapshot>
```

Open a REST inventory and pin subsequent resource reads to its revision.

### Parameters

| Parameter | Type / default                                                                                                                   | Description                                                             |
| --------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `options` | [`RestContentSourceOptions`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-restcontentsourceoptions) | REST mount, exact publication, optional revision, and request settings. |

### Returns

`Promise<`[`ContentSnapshot`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentsnapshot)`>`

A snapshot with the same list/get/dispose interface as the manifest source.
