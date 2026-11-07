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

| Name                                                                                                                                 | Type                                                                                                                                                                                                                                                  | Required / default | Description                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | --------------------------------------------------------------------- |
| [`assets`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentresource-assets)                             | `string[]`                                                                                                                                                                                                                                            | Required           | —                                                                     |
| [`canonicalUrl`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentresource-canonicalurl)                 | `string \| undefined`                                                                                                                                                                                                                                 | Optional           | —                                                                     |
| [`externalDependencies`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentresource-externaldependencies) | `{ url: string; kind: "image"; }[]`                                                                                                                                                                                                                   | Required           | —                                                                     |
| [`publication`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentresource-publication)                   | [`ContentPublication`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentpublication)                                                                                                                                      | Required           | Exact product, channel, version, and documentation language.          |
| [`ref`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentresource-ref)                                   | [`ContentRef`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentref)                                                                                                                                                      | Required           | Stable identity used by ContentSnapshot.get.                          |
| [`representations`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentresource-representations)           | `Partial<Record<`[`ContentFormat`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentformat)`, `[`ContentRepresentation`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentrepresentation)`>>` | Required           | Available portable formats and their files, anchors, and typed links. |
| [`source`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentresource-source)                             | `{ documentId?: string; snippetId?: string; valuesDigest?: string; } \| undefined`                                                                                                                                                                    | Optional           | —                                                                     |
| [`summary`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentresource-summary)                           | `string`                                                                                                                                                                                                                                              | Required           | Short explanation of the resource's purpose.                          |
| [`title`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentresource-title)                               | `string`                                                                                                                                                                                                                                              | Required           | Human-readable resource title.                                        |
| [`type`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentresource-type)                                 | `string`                                                                                                                                                                                                                                              | Required           | Authored document type, or section/snippet for a selected resource.   |
