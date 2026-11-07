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

## shoalrun.content.openRestContentSource

**Function** `shoalrun.content.openRestContentSource`

```typescript
openRestContentSource(options: RestContentSourceOptions): Promise<ContentSnapshot>
```

Open a REST inventory and pin subsequent resource reads to its revision.

### Parameters

| Parameter | Type / default                                                                                                               | Description                                                             |
| --------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `options` | [`RestContentSourceOptions`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-restcontentsourceoptions) | REST mount, exact publication, optional revision, and request settings. |

### Returns

`Promise<`[`ContentSnapshot`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentsnapshot)`>`

A snapshot with the same list/get/dispose interface as the manifest source.
