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

## shoalrun.content.ContentRestEntry

**Type** `shoalrun.content.ContentRestEntry`

```typescript
type ContentRestEntry = {
    key: string;
    resource: ContentResource;
};
```

One resource inventory entry with its REST lookup key.

### Fields

| Name                                                                                       | Type                                                                                                           | Required / default | Description |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- | ------------------ | ----------- |
| [`key`](https://www.shoalrun.com/content-delivery/sdk/content-rest-entry/key.md)           | `string`                                                                                                       | Required           | —           |
| [`resource`](https://www.shoalrun.com/content-delivery/sdk/content-rest-entry/resource.md) | [`ContentResource`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentresource) | Required           | —           |
