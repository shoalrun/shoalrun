---
id: reference.content-sdk.complete
title: Complete content client reference
summary: Public exports from @shoalrun/cli/content, with signatures and JSDoc
  from TypeScript declarations.
type: code-reference
area: publishing
subarea: publishing-content-delivery
canonical: /content-delivery/sdk/all
---

# Complete content client reference

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Reference](https://www.shoalrun.com/.well-known/shoalrun/navigation/reference-tab-50f26fe22670.txt) (ID: reference-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Reference](https://www.shoalrun.com/cli.md) > Content delivery > TypeScript symbols > Complete reference

**Updated: 2026-11-07.**

Parent page: [Full Markdown page](/content-delivery/sdk/all.md)

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

| Name                                                                                                                   | Type                                                                                                                                 | Required / default | Description                                                         |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------ | ------------------------------------------------------------------- |
| [`content`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentresult-content)               | `string`                                                                                                                             | Required           | Validated UTF-8 HTML or Markdown text.                              |
| [`format`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentresult-format)                 | [`ContentFormat`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentformat)                               | Required           | Representation actually returned by the source.                     |
| [`representation`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentresult-representation) | `Readonly<`[`ContentRepresentation`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentrepresentation)`>` | Required           | File, media type, anchors, and typed links for the selected format. |
| [`resource`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentresult-resource)             | `Readonly<`[`ContentResource`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentresource)`>`             | Required           | Inventory entry that was selected by the requested reference.       |
| [`revision`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentresult-revision)             | `string`                                                                                                                             | Required           | Revision shared by this response and its opened content snapshot.   |
