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

## shoalrun.content.ContentRestResource

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

### Fields

| Name                                                                                                     | Type                                                                                                                 | Required / default | Description |
| -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------ | ----------- |
| [`key`](https://www.shoalrun.com/content-delivery/sdk/content-rest-resource/key.md)                      | `string`                                                                                                             | Required           | —           |
| [`publication`](https://www.shoalrun.com/content-delivery/sdk/content-rest-resource/publication.md)      | [`ContentPublication`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentpublication) | Required           | —           |
| [`resource`](https://www.shoalrun.com/content-delivery/sdk/content-rest-resource/resource.md)            | [`ContentResource`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentresource)       | Required           | —           |
| [`revision`](https://www.shoalrun.com/content-delivery/sdk/content-rest-resource/revision.md)            | `string`                                                                                                             | Required           | —           |
| [`schemaVersion`](https://www.shoalrun.com/content-delivery/sdk/content-rest-resource/schema-version.md) | `1 \| 2`                                                                                                             | Required           | —           |
