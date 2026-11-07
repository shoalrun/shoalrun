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

## shoalrun.content.openManifestContentSource

**Function** `shoalrun.content.openManifestContentSource`

```typescript
openManifestContentSource(options: ManifestContentSourceOptions): Promise<ContentSnapshot>
```

Open and validate one immutable static manifest revision.
The caller owns trust in the compiler output and host. Browser URLs must use
the application's origin. Requests reject redirects and unexpected content types.

### Parameters

| Parameter | Type / default                                                                                                                       | Description                                                     |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| `options` | [`ManifestContentSourceOptions`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-manifestcontentsourceoptions) | Manifest URL, request implementation, cancellation, and limits. |

### Returns

`Promise<`[`ContentSnapshot`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentsnapshot)`>`

A revision-pinned snapshot for listing and reading exported resources.

### Examples

```typescript
const snapshot = await openManifestContentSource({ manifestUrl: '/help/manifest.json' });
const page = await snapshot.get({ kind: 'page', documentId: 'guide.start' }, { format: 'markdown' });
snapshot.dispose();
```
