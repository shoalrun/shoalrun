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

## shoalrun.content.openManifestContentSource

**Function** `shoalrun.content.openManifestContentSource`

```typescript
openManifestContentSource(options: ManifestContentSourceOptions): Promise<ContentSnapshot>
```

Open and validate one immutable static manifest revision.
The caller owns trust in the compiler output and host. Browser URLs must use
the application's origin. Requests reject redirects and unexpected content types.

### Parameters

| Parameter | Type / default                                                                                                                           | Description                                                     |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `options` | [`ManifestContentSourceOptions`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-manifestcontentsourceoptions) | Manifest URL, request implementation, cancellation, and limits. |

### Returns

`Promise<`[`ContentSnapshot`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentsnapshot)`>`

A revision-pinned snapshot for listing and reading exported resources.

### Examples

```typescript
const snapshot = await openManifestContentSource({ manifestUrl: '/help/manifest.json' });
const page = await snapshot.get({ kind: 'page', documentId: 'guide.start' }, { format: 'markdown' });
snapshot.dispose();
```
