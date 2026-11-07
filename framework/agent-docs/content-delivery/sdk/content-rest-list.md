---
id: reference.content-sdk.ContentRestList
title: ContentRestList
summary: Revision-scoped inventory envelope returned by the content REST service.
type: code-reference
area: publishing
subarea: publishing-content-delivery
canonical: /content-delivery/sdk/content-rest-list
---

# ContentRestList

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

**Updated: 2026-09-27.**

**Type** `shoalrun.content.ContentRestList`

```typescript
type ContentRestList = {
    schemaVersion: 1 | 2;
    revision: string;
    publication: ContentPublication;
    resources: ContentRestEntry[];
};
```

Revision-scoped inventory envelope returned by the content REST service.

## Fields

| Name                                                                                                                                 | Type                                                                                          | Required / default | Description |
| ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- | ------------------ | ----------- |
| [`publication`](https://www.shoalrun.com/content-delivery/sdk/content-rest-list.md#shoalrun-content-contentrestlist-publication)     | [`ContentPublication`](https://www.shoalrun.com/content-delivery/sdk/content-publication.md)  | Required           | —           |
| [`resources`](https://www.shoalrun.com/content-delivery/sdk/content-rest-list.md#shoalrun-content-contentrestlist-resources)         | [`ContentRestEntry`](https://www.shoalrun.com/content-delivery/sdk/content-rest-entry.md)`[]` | Required           | —           |
| [`revision`](https://www.shoalrun.com/content-delivery/sdk/content-rest-list.md#shoalrun-content-contentrestlist-revision)           | `string`                                                                                      | Required           | —           |
| [`schemaVersion`](https://www.shoalrun.com/content-delivery/sdk/content-rest-list.md#shoalrun-content-contentrestlist-schemaversion) | `1 \| 2`                                                                                      | Required           | —           |

## shoalrun.content.ContentRestList.publication

**Property** `shoalrun.content.ContentRestList.publication`

```typescript
publication: ContentPublication
```

**Type:&#x20;**[`ContentPublication`](https://www.shoalrun.com/content-delivery/sdk/content-publication.md)

Required

## shoalrun.content.ContentRestList.resources

**Property** `shoalrun.content.ContentRestList.resources`

```typescript
resources: ContentRestEntry[]
```

**Type:&#x20;**[`ContentRestEntry`](https://www.shoalrun.com/content-delivery/sdk/content-rest-entry.md)`[]`

Required

## shoalrun.content.ContentRestList.revision

**Property** `shoalrun.content.ContentRestList.revision`

```typescript
revision: string
```

**Type:&#x20;**`string`

Required

## shoalrun.content.ContentRestList.schemaVersion

**Property** `shoalrun.content.ContentRestList.schemaVersion`

```typescript
schemaVersion: 1 | 2
```

**Type:&#x20;**`1 | 2`

Required
