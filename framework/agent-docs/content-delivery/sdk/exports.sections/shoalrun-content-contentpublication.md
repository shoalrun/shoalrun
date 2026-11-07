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

## shoalrun.content.ContentPublication

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

### Fields

| Name                                                                                        | Type                  | Required / default | Description |
| ------------------------------------------------------------------------------------------- | --------------------- | ------------------ | ----------- |
| [`channel`](https://www.shoalrun.com/content-delivery/sdk/content-publication/channel.md)   | `string`              | Required           | —           |
| [`language`](https://www.shoalrun.com/content-delivery/sdk/content-publication/language.md) | `string`              | Required           | —           |
| [`product`](https://www.shoalrun.com/content-delivery/sdk/content-publication/product.md)   | `string \| undefined` | Optional           | —           |
| [`version`](https://www.shoalrun.com/content-delivery/sdk/content-publication/version.md)   | `string`              | Required           | —           |
