---
id: reference.content-sdk.openRestContentSource
title: openRestContentSource
summary: Open a REST inventory and pin subsequent resource reads to its revision.
type: code-reference
area: publishing
subarea: publishing-content-delivery
canonical: /content-delivery/sdk/open-rest-content-source
---

# openRestContentSource

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Reference](https://www.shoalrun.com/.well-known/shoalrun/navigation/reference-tab-50f26fe22670.txt) (ID: reference-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Reference](https://www.shoalrun.com/cli.md) > Content delivery > TypeScript symbols > openRestContentSource

**Updated: 2026-09-27.**

**Function** `shoalrun.content.openRestContentSource`

```typescript
openRestContentSource(options: RestContentSourceOptions): Promise<ContentSnapshot>
```

Open a REST inventory and pin subsequent resource reads to its revision.

## Parameters

| Parameter | Type / default                                                                                             | Description                                                             |
| --------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `options` | [`RestContentSourceOptions`](https://www.shoalrun.com/content-delivery/sdk/rest-content-source-options.md) | REST mount, exact publication, optional revision, and request settings. |

## Returns

`Promise<`[`ContentSnapshot`](https://www.shoalrun.com/content-delivery/sdk/content-snapshot.md)`>`

A snapshot with the same list/get/dispose interface as the manifest source.
