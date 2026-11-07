---
id: reference.content-sdk.ContentPublication
title: ContentPublication
summary: Exact documentation publication selected by a content source.
type: code-reference
area: publishing
subarea: publishing-content-delivery
canonical: /content-delivery/sdk/content-publication
---

# ContentPublication

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

**Updated: 2026-09-27.**

**Type** `shoalrun.content.ContentPublication`

```typescript
type ContentPublication = {
    channel: string;
    version: string;
    language: string;
    product?: string;
};
```

Exact documentation publication selected by a content source.

## Fields

| Name                                                                                                                            | Type                  | Required / default | Description |
| ------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ------------------ | ----------- |
| [`channel`](https://www.shoalrun.com/content-delivery/sdk/content-publication.md#shoalrun-content-contentpublication-channel)   | `string`              | Required           | —           |
| [`language`](https://www.shoalrun.com/content-delivery/sdk/content-publication.md#shoalrun-content-contentpublication-language) | `string`              | Required           | —           |
| [`product`](https://www.shoalrun.com/content-delivery/sdk/content-publication.md#shoalrun-content-contentpublication-product)   | `string \| undefined` | Optional           | —           |
| [`version`](https://www.shoalrun.com/content-delivery/sdk/content-publication.md#shoalrun-content-contentpublication-version)   | `string`              | Required           | —           |

## shoalrun.content.ContentPublication.channel

**Property** `shoalrun.content.ContentPublication.channel`

```typescript
channel: string
```

**Type:&#x20;**`string`

Required

## shoalrun.content.ContentPublication.language

**Property** `shoalrun.content.ContentPublication.language`

```typescript
language: string
```

**Type:&#x20;**`string`

Required

## shoalrun.content.ContentPublication.product

**Property** `shoalrun.content.ContentPublication.product`

```typescript
product?: string | undefined
```

**Type:&#x20;**`string | undefined`

Optional

## shoalrun.content.ContentPublication.version

**Property** `shoalrun.content.ContentPublication.version`

```typescript
version: string
```

**Type:&#x20;**`string`

Required
