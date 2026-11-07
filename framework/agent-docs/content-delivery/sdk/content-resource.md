---
id: reference.content-sdk.ContentResource
title: ContentResource
summary: Inventory entry describing one exported document, section, or snippet instance.
type: code-reference
area: publishing
subarea: publishing-content-delivery
canonical: /content-delivery/sdk/content-resource
---

# ContentResource

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Reference](https://www.shoalrun.com/.well-known/shoalrun/navigation/reference-tab-50f26fe22670.txt) (ID: reference-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Reference](https://www.shoalrun.com/cli.md) > Content delivery > TypeScript symbols > ContentResource

**Updated: 2026-09-27.**

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

## Fields

| Name                                                                                                                                              | Type                                                                                                                                                                                                          | Required / default | Description                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | --------------------------------------------------------------------- |
| [`assets`](https://www.shoalrun.com/content-delivery/sdk/content-resource.md#shoalrun-content-contentresource-assets)                             | `string[]`                                                                                                                                                                                                    | Required           | —                                                                     |
| [`canonicalUrl`](https://www.shoalrun.com/content-delivery/sdk/content-resource.md#shoalrun-content-contentresource-canonicalurl)                 | `string \| undefined`                                                                                                                                                                                         | Optional           | —                                                                     |
| [`externalDependencies`](https://www.shoalrun.com/content-delivery/sdk/content-resource.md#shoalrun-content-contentresource-externaldependencies) | `{ url: string; kind: "image"; }[]`                                                                                                                                                                           | Required           | —                                                                     |
| [`publication`](https://www.shoalrun.com/content-delivery/sdk/content-resource.md#shoalrun-content-contentresource-publication)                   | [`ContentPublication`](https://www.shoalrun.com/content-delivery/sdk/content-publication.md)                                                                                                                  | Required           | Exact product, channel, version, and documentation language.          |
| [`ref`](https://www.shoalrun.com/content-delivery/sdk/content-resource.md#shoalrun-content-contentresource-ref)                                   | [`ContentRef`](https://www.shoalrun.com/content-delivery/sdk/content-ref.md)                                                                                                                                  | Required           | Stable identity used by ContentSnapshot.get.                          |
| [`representations`](https://www.shoalrun.com/content-delivery/sdk/content-resource.md#shoalrun-content-contentresource-representations)           | `Partial<Record<`[`ContentFormat`](https://www.shoalrun.com/content-delivery/sdk/content-format.md)`, `[`ContentRepresentation`](https://www.shoalrun.com/content-delivery/sdk/content-representation.md)`>>` | Required           | Available portable formats and their files, anchors, and typed links. |
| [`source`](https://www.shoalrun.com/content-delivery/sdk/content-resource.md#shoalrun-content-contentresource-source)                             | `{ documentId?: string; snippetId?: string; valuesDigest?: string; } \| undefined`                                                                                                                            | Optional           | —                                                                     |
| [`summary`](https://www.shoalrun.com/content-delivery/sdk/content-resource.md#shoalrun-content-contentresource-summary)                           | `string`                                                                                                                                                                                                      | Required           | Short explanation of the resource's purpose.                          |
| [`title`](https://www.shoalrun.com/content-delivery/sdk/content-resource.md#shoalrun-content-contentresource-title)                               | `string`                                                                                                                                                                                                      | Required           | Human-readable resource title.                                        |
| [`type`](https://www.shoalrun.com/content-delivery/sdk/content-resource.md#shoalrun-content-contentresource-type)                                 | `string`                                                                                                                                                                                                      | Required           | Authored document type, or section/snippet for a selected resource.   |

## shoalrun.content.ContentResource.assets

**Property** `shoalrun.content.ContentResource.assets`

```typescript
assets: string[]
```

**Type:&#x20;**`string[]`

Required

## shoalrun.content.ContentResource.canonicalUrl

**Property** `shoalrun.content.ContentResource.canonicalUrl`

```typescript
canonicalUrl?: string | undefined
```

**Type:&#x20;**`string | undefined`

Optional

## shoalrun.content.ContentResource.externalDependencies

**Property** `shoalrun.content.ContentResource.externalDependencies`

```typescript
externalDependencies: { url: string; kind: "image"; }[]
```

**Type:&#x20;**`{ url: string; kind: "image"; }[]`

Required

## shoalrun.content.ContentResource.publication

**Property** `shoalrun.content.ContentResource.publication`

```typescript
publication: ContentPublication
```

Exact product, channel, version, and documentation language.

**Type:&#x20;**[`ContentPublication`](https://www.shoalrun.com/content-delivery/sdk/content-publication.md)

Required

## shoalrun.content.ContentResource.ref

**Property** `shoalrun.content.ContentResource.ref`

```typescript
ref: ContentRef
```

Stable identity used by ContentSnapshot.get.

**Type:&#x20;**[`ContentRef`](https://www.shoalrun.com/content-delivery/sdk/content-ref.md)

Required

## shoalrun.content.ContentResource.representations

**Property** `shoalrun.content.ContentResource.representations`

```typescript
representations: Partial<Record<ContentFormat, ContentRepresentation>>
```

Available portable formats and their files, anchors, and typed links.

**Type:&#x20;**`Partial<Record<`[`ContentFormat`](https://www.shoalrun.com/content-delivery/sdk/content-format.md)`, `[`ContentRepresentation`](https://www.shoalrun.com/content-delivery/sdk/content-representation.md)`>>`

Required

## shoalrun.content.ContentResource.source

**Property** `shoalrun.content.ContentResource.source`

```typescript
source?: { documentId?: string; snippetId?: string; valuesDigest?: string; } | undefined
```

**Type:&#x20;**`{ documentId?: string; snippetId?: string; valuesDigest?: string; } | undefined`

Optional

## shoalrun.content.ContentResource.summary

**Property** `shoalrun.content.ContentResource.summary`

```typescript
summary: string
```

Short explanation of the resource's purpose.

**Type:&#x20;**`string`

Required

## shoalrun.content.ContentResource.title

**Property** `shoalrun.content.ContentResource.title`

```typescript
title: string
```

Human-readable resource title.

**Type:&#x20;**`string`

Required

## shoalrun.content.ContentResource.type

**Property** `shoalrun.content.ContentResource.type`

```typescript
type: string
```

Authored document type, or section/snippet for a selected resource.

**Type:&#x20;**`string`

Required
