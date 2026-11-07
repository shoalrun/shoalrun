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

## shoalrun.content.ContentResource

**Type** `shoalrun.content.ContentResource`

```typescript
type ContentResource = {
    ref: ContentRef;
    publication: ContentPublication;
    title: string;
    summary: string;
    type: string;
    canonicalUrl?: string;
    source?: {
        documentId?: string;
        snippetId?: string;
        valuesDigest?: string;
    };
    representations: Partial<Record<ContentFormat, ContentRepresentation>>;
    assets: string[];
    externalDependencies: Array<{
        url: string;
        kind: 'image';
    }>;
};
```

Inventory entry describing one exported document, section, or snippet instance.

### Fields

| Name                                                                                                              | Type                                                                                                                                                                                                                                                          | Required / default | Description                                                           |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | --------------------------------------------------------------------- |
| [`assets`](https://www.shoalrun.com/content-delivery/sdk/content-resource/assets.md)                              | `string[]`                                                                                                                                                                                                                                                    | Required           | —                                                                     |
| [`canonicalUrl`](https://www.shoalrun.com/content-delivery/sdk/content-resource/canonical-url.md)                 | `string \| undefined`                                                                                                                                                                                                                                         | Optional           | —                                                                     |
| [`externalDependencies`](https://www.shoalrun.com/content-delivery/sdk/content-resource/external-dependencies.md) | `{ url: string; kind: "image"; }[]`                                                                                                                                                                                                                           | Required           | —                                                                     |
| [`publication`](https://www.shoalrun.com/content-delivery/sdk/content-resource/publication.md)                    | [`ContentPublication`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentpublication)                                                                                                                                          | Required           | Exact product, channel, version, and documentation language.          |
| [`ref`](https://www.shoalrun.com/content-delivery/sdk/content-resource/ref.md)                                    | [`ContentRef`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentref)                                                                                                                                                          | Required           | Stable identity used by ContentSnapshot.get.                          |
| [`representations`](https://www.shoalrun.com/content-delivery/sdk/content-resource/representations.md)            | `Partial<Record<`[`ContentFormat`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentformat)`, `[`ContentRepresentation`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentrepresentation)`>>` | Required           | Available portable formats and their files, anchors, and typed links. |
| [`source`](https://www.shoalrun.com/content-delivery/sdk/content-resource/source.md)                              | `{ documentId?: string; snippetId?: string; valuesDigest?: string; } \| undefined`                                                                                                                                                                            | Optional           | —                                                                     |
| [`summary`](https://www.shoalrun.com/content-delivery/sdk/content-resource/summary.md)                            | `string`                                                                                                                                                                                                                                                      | Required           | Short explanation of the resource's purpose.                          |
| [`title`](https://www.shoalrun.com/content-delivery/sdk/content-resource/title.md)                                | `string`                                                                                                                                                                                                                                                      | Required           | Human-readable resource title.                                        |
| [`type`](https://www.shoalrun.com/content-delivery/sdk/content-resource/type.md)                                  | `string`                                                                                                                                                                                                                                                      | Required           | Authored document type, or section/snippet for a selected resource.   |
