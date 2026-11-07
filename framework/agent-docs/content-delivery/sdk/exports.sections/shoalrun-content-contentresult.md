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

## shoalrun.content.ContentResult

**Type** `shoalrun.content.ContentResult`

```typescript
type ContentResult = {
    resource: Readonly<ContentResource>;
    representation: Readonly<ContentRepresentation>;
    format: ContentFormat;
    content: string;
    revision: string;
};
```

A fetched representation together with the metadata needed to render or route it.

### Fields

| Name                                                                                               | Type                                                                                                                                     | Required / default | Description                                                         |
| -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------- |
| [`content`](https://www.shoalrun.com/content-delivery/sdk/content-result/content.md)               | `string`                                                                                                                                 | Required           | Validated UTF-8 HTML or Markdown text.                              |
| [`format`](https://www.shoalrun.com/content-delivery/sdk/content-result/format.md)                 | [`ContentFormat`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentformat)                               | Required           | Representation actually returned by the source.                     |
| [`representation`](https://www.shoalrun.com/content-delivery/sdk/content-result/representation.md) | `Readonly<`[`ContentRepresentation`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentrepresentation)`>` | Required           | File, media type, anchors, and typed links for the selected format. |
| [`resource`](https://www.shoalrun.com/content-delivery/sdk/content-result/resource.md)             | `Readonly<`[`ContentResource`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentresource)`>`             | Required           | Inventory entry that was selected by the requested reference.       |
| [`revision`](https://www.shoalrun.com/content-delivery/sdk/content-result/revision.md)             | `string`                                                                                                                                 | Required           | Revision shared by this response and its opened content snapshot.   |
