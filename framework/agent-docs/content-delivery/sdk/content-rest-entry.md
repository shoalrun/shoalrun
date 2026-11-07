---
id: reference.content-sdk.ContentRestEntry
title: ContentRestEntry
summary: One resource inventory entry with its REST lookup key.
type: code-reference
area: publishing
subarea: publishing-content-delivery
canonical: /content-delivery/sdk/content-rest-entry
---

# ContentRestEntry

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

**Updated: 2026-09-27.**

**Type** `shoalrun.content.ContentRestEntry`

```typescript
type ContentRestEntry = {
    key: string;
    resource: ContentResource;
};
```

One resource inventory entry with its REST lookup key.

## Fields

| Name                                                                                                                         | Type                                                                                   | Required / default | Description |
| ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------ | ----------- |
| [`key`](https://www.shoalrun.com/content-delivery/sdk/content-rest-entry.md#shoalrun-content-contentrestentry-key)           | `string`                                                                               | Required           | —           |
| [`resource`](https://www.shoalrun.com/content-delivery/sdk/content-rest-entry.md#shoalrun-content-contentrestentry-resource) | [`ContentResource`](https://www.shoalrun.com/content-delivery/sdk/content-resource.md) | Required           | —           |

## shoalrun.content.ContentRestEntry.key

**Property** `shoalrun.content.ContentRestEntry.key`

```typescript
key: string
```

**Type:&#x20;**`string`

Required

## shoalrun.content.ContentRestEntry.resource

**Property** `shoalrun.content.ContentRestEntry.resource`

```typescript
resource: ContentResource
```

**Type:&#x20;**[`ContentResource`](https://www.shoalrun.com/content-delivery/sdk/content-resource.md)

Required
