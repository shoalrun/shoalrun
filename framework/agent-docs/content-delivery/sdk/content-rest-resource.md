---
id: reference.content-sdk.ContentRestResource
title: ContentRestResource
summary: Revision-scoped metadata envelope for a single content resource.
type: code-reference
area: publishing
subarea: publishing-content-delivery
canonical: /content-delivery/sdk/content-rest-resource
---

# ContentRestResource

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

**Updated: 2026-09-27.**

**Type** `shoalrun.content.ContentRestResource`

```typescript
type ContentRestResource = {
    schemaVersion: 1 | 2;
    revision: string;
    publication: ContentPublication;
    key: string;
    resource: ContentResource;
};
```

Revision-scoped metadata envelope for a single content resource.

## Fields

| Name                                                                                                                                         | Type                                                                                         | Required / default | Description |
| -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------ | ----------- |
| [`key`](https://www.shoalrun.com/content-delivery/sdk/content-rest-resource.md#shoalrun-content-contentrestresource-key)                     | `string`                                                                                     | Required           | —           |
| [`publication`](https://www.shoalrun.com/content-delivery/sdk/content-rest-resource.md#shoalrun-content-contentrestresource-publication)     | [`ContentPublication`](https://www.shoalrun.com/content-delivery/sdk/content-publication.md) | Required           | —           |
| [`resource`](https://www.shoalrun.com/content-delivery/sdk/content-rest-resource.md#shoalrun-content-contentrestresource-resource)           | [`ContentResource`](https://www.shoalrun.com/content-delivery/sdk/content-resource.md)       | Required           | —           |
| [`revision`](https://www.shoalrun.com/content-delivery/sdk/content-rest-resource.md#shoalrun-content-contentrestresource-revision)           | `string`                                                                                     | Required           | —           |
| [`schemaVersion`](https://www.shoalrun.com/content-delivery/sdk/content-rest-resource.md#shoalrun-content-contentrestresource-schemaversion) | `1 \| 2`                                                                                     | Required           | —           |

## shoalrun.content.ContentRestResource.key

**Property** `shoalrun.content.ContentRestResource.key`

```typescript
key: string
```

**Type:&#x20;**`string`

Required

## shoalrun.content.ContentRestResource.publication

**Property** `shoalrun.content.ContentRestResource.publication`

```typescript
publication: ContentPublication
```

**Type:&#x20;**[`ContentPublication`](https://www.shoalrun.com/content-delivery/sdk/content-publication.md)

Required

## shoalrun.content.ContentRestResource.resource

**Property** `shoalrun.content.ContentRestResource.resource`

```typescript
resource: ContentResource
```

**Type:&#x20;**[`ContentResource`](https://www.shoalrun.com/content-delivery/sdk/content-resource.md)

Required

## shoalrun.content.ContentRestResource.revision

**Property** `shoalrun.content.ContentRestResource.revision`

```typescript
revision: string
```

**Type:&#x20;**`string`

Required

## shoalrun.content.ContentRestResource.schemaVersion

**Property** `shoalrun.content.ContentRestResource.schemaVersion`

```typescript
schemaVersion: 1 | 2
```

**Type:&#x20;**`1 | 2`

Required
