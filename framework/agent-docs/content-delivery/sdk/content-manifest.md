---
id: reference.content-sdk.ContentManifest
title: ContentManifest
summary: One validated, content-addressed export inventory.
type: code-reference
area: publishing
subarea: publishing-content-delivery
canonical: /content-delivery/sdk/content-manifest
---

# ContentManifest

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

**Updated: 2026-09-27.**

**Type** `shoalrun.content.ContentManifest`

```typescript
type ContentManifest = {
    schemaVersion: 1 | 2;
    kind: 'shoalrun-content-export';
    digest: string;
    publicBase: string;
    publication: ContentPublication;
    review: {
        status: 'ok' | 'required';
        apis: Array<{
            apiId: string;
            digest: string;
        }>;
    };
    resources: ContentResource[];
    assets: ContentAsset[];
    files: ContentFile[];
    diagnostics: Array<{
        code: string;
        documentId?: string;
        message: string;
    }>;
};
```

One validated, content-addressed export inventory.

## Fields

| Name                                                                                                                                | Type                                                                                         | Required / default | Description |
| ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------ | ----------- |
| [`assets`](https://www.shoalrun.com/content-delivery/sdk/content-manifest.md#shoalrun-content-contentmanifest-assets)               | [`ContentAsset`](https://www.shoalrun.com/content-delivery/sdk/content-asset.md)`[]`         | Required           | —           |
| [`diagnostics`](https://www.shoalrun.com/content-delivery/sdk/content-manifest.md#shoalrun-content-contentmanifest-diagnostics)     | `{ code: string; documentId?: string; message: string; }[]`                                  | Required           | —           |
| [`digest`](https://www.shoalrun.com/content-delivery/sdk/content-manifest.md#shoalrun-content-contentmanifest-digest)               | `string`                                                                                     | Required           | —           |
| [`files`](https://www.shoalrun.com/content-delivery/sdk/content-manifest.md#shoalrun-content-contentmanifest-files)                 | [`ContentFile`](https://www.shoalrun.com/content-delivery/sdk/content-file.md)`[]`           | Required           | —           |
| [`kind`](https://www.shoalrun.com/content-delivery/sdk/content-manifest.md#shoalrun-content-contentmanifest-kind)                   | `"shoalrun-content-export"`                                                                  | Required           | —           |
| [`publicBase`](https://www.shoalrun.com/content-delivery/sdk/content-manifest.md#shoalrun-content-contentmanifest-publicbase)       | `string`                                                                                     | Required           | —           |
| [`publication`](https://www.shoalrun.com/content-delivery/sdk/content-manifest.md#shoalrun-content-contentmanifest-publication)     | [`ContentPublication`](https://www.shoalrun.com/content-delivery/sdk/content-publication.md) | Required           | —           |
| [`resources`](https://www.shoalrun.com/content-delivery/sdk/content-manifest.md#shoalrun-content-contentmanifest-resources)         | [`ContentResource`](https://www.shoalrun.com/content-delivery/sdk/content-resource.md)`[]`   | Required           | —           |
| [`review`](https://www.shoalrun.com/content-delivery/sdk/content-manifest.md#shoalrun-content-contentmanifest-review)               | `{ status: "ok" \| "required"; apis: Array<{ apiId: string; digest: string; }>; }`           | Required           | —           |
| [`schemaVersion`](https://www.shoalrun.com/content-delivery/sdk/content-manifest.md#shoalrun-content-contentmanifest-schemaversion) | `1 \| 2`                                                                                     | Required           | —           |

## shoalrun.content.ContentManifest.assets

**Property** `shoalrun.content.ContentManifest.assets`

```typescript
assets: ContentAsset[]
```

**Type:&#x20;**[`ContentAsset`](https://www.shoalrun.com/content-delivery/sdk/content-asset.md)`[]`

Required

## shoalrun.content.ContentManifest.diagnostics

**Property** `shoalrun.content.ContentManifest.diagnostics`

```typescript
diagnostics: { code: string; documentId?: string; message: string; }[]
```

**Type:&#x20;**`{ code: string; documentId?: string; message: string; }[]`

Required

## shoalrun.content.ContentManifest.digest

**Property** `shoalrun.content.ContentManifest.digest`

```typescript
digest: string
```

**Type:&#x20;**`string`

Required

## shoalrun.content.ContentManifest.files

**Property** `shoalrun.content.ContentManifest.files`

```typescript
files: ContentFile[]
```

**Type:&#x20;**[`ContentFile`](https://www.shoalrun.com/content-delivery/sdk/content-file.md)`[]`

Required

## shoalrun.content.ContentManifest.kind

**Property** `shoalrun.content.ContentManifest.kind`

```typescript
kind: "shoalrun-content-export"
```

**Type:&#x20;**`"shoalrun-content-export"`

Required

## shoalrun.content.ContentManifest.publicBase

**Property** `shoalrun.content.ContentManifest.publicBase`

```typescript
publicBase: string
```

**Type:&#x20;**`string`

Required

## shoalrun.content.ContentManifest.publication

**Property** `shoalrun.content.ContentManifest.publication`

```typescript
publication: ContentPublication
```

**Type:&#x20;**[`ContentPublication`](https://www.shoalrun.com/content-delivery/sdk/content-publication.md)

Required

## shoalrun.content.ContentManifest.resources

**Property** `shoalrun.content.ContentManifest.resources`

```typescript
resources: ContentResource[]
```

**Type:&#x20;**[`ContentResource`](https://www.shoalrun.com/content-delivery/sdk/content-resource.md)`[]`

Required

## shoalrun.content.ContentManifest.review

**Property** `shoalrun.content.ContentManifest.review`

```typescript
review: { status: "ok" | "required"; apis: Array<{ apiId: string; digest: string; }>; }
```

**Type:&#x20;**`{ status: "ok" | "required"; apis: Array<{ apiId: string; digest: string; }>; }`

Required

## shoalrun.content.ContentManifest.schemaVersion

**Property** `shoalrun.content.ContentManifest.schemaVersion`

```typescript
schemaVersion: 1 | 2
```

**Type:&#x20;**`1 | 2`

Required
