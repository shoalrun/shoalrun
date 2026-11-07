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

## shoalrun.content.ContentRestList

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

### Fields

| Name                                                                                                 | Type                                                                                                                 | Required / default | Description |
| ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------ | ----------- |
| [`publication`](https://www.shoalrun.com/content-delivery/sdk/content-rest-list/publication.md)      | [`ContentPublication`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentpublication) | Required           | —           |
| [`resources`](https://www.shoalrun.com/content-delivery/sdk/content-rest-list/resources.md)          | [`ContentRestEntry`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentrestentry)`[]` | Required           | —           |
| [`revision`](https://www.shoalrun.com/content-delivery/sdk/content-rest-list/revision.md)            | `string`                                                                                                             | Required           | —           |
| [`schemaVersion`](https://www.shoalrun.com/content-delivery/sdk/content-rest-list/schema-version.md) | `1 \| 2`                                                                                                             | Required           | —           |
