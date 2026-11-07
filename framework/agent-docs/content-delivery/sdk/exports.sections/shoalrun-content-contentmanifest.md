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

## shoalrun.content.ContentManifest

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

### Fields

| Name                                                                                                | Type                                                                                                                 | Required / default | Description |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------ | ----------- |
| [`assets`](https://www.shoalrun.com/content-delivery/sdk/content-manifest/assets.md)                | [`ContentAsset`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentasset)`[]`         | Required           | —           |
| [`diagnostics`](https://www.shoalrun.com/content-delivery/sdk/content-manifest/diagnostics.md)      | `{ code: string; documentId?: string; message: string; }[]`                                                          | Required           | —           |
| [`digest`](https://www.shoalrun.com/content-delivery/sdk/content-manifest/digest.md)                | `string`                                                                                                             | Required           | —           |
| [`files`](https://www.shoalrun.com/content-delivery/sdk/content-manifest/files.md)                  | [`ContentFile`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentfile)`[]`           | Required           | —           |
| [`kind`](https://www.shoalrun.com/content-delivery/sdk/content-manifest/kind.md)                    | `"shoalrun-content-export"`                                                                                          | Required           | —           |
| [`publicBase`](https://www.shoalrun.com/content-delivery/sdk/content-manifest/public-base.md)       | `string`                                                                                                             | Required           | —           |
| [`publication`](https://www.shoalrun.com/content-delivery/sdk/content-manifest/publication.md)      | [`ContentPublication`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentpublication) | Required           | —           |
| [`resources`](https://www.shoalrun.com/content-delivery/sdk/content-manifest/resources.md)          | [`ContentResource`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentresource)`[]`   | Required           | —           |
| [`review`](https://www.shoalrun.com/content-delivery/sdk/content-manifest/review.md)                | `{ status: "ok" \| "required"; apis: Array<{ apiId: string; digest: string; }>; }`                                   | Required           | —           |
| [`schemaVersion`](https://www.shoalrun.com/content-delivery/sdk/content-manifest/schema-version.md) | `1 \| 2`                                                                                                             | Required           | —           |
