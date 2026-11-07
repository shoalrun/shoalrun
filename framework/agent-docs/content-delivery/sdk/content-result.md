---
id: reference.content-sdk.ContentResult
title: ContentResult
summary: A fetched representation together with the metadata needed to render or
  route it.
type: code-reference
area: publishing
subarea: publishing-content-delivery
canonical: /content-delivery/sdk/content-result
---

# ContentResult

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Reference](https://www.shoalrun.com/.well-known/shoalrun/navigation/reference-tab-50f26fe22670.txt) (ID: reference-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Reference](https://www.shoalrun.com/cli.md) > Content delivery > TypeScript symbols > ContentResult

**Updated: 2026-09-27.**

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

## Fields

| Name                                                                                                                              | Type                                                                                                             | Required / default | Description                                                         |
| --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------- |
| [`content`](https://www.shoalrun.com/content-delivery/sdk/content-result.md#shoalrun-content-contentresult-content)               | `string`                                                                                                         | Required           | Validated UTF-8 HTML or Markdown text.                              |
| [`format`](https://www.shoalrun.com/content-delivery/sdk/content-result.md#shoalrun-content-contentresult-format)                 | [`ContentFormat`](https://www.shoalrun.com/content-delivery/sdk/content-format.md)                               | Required           | Representation actually returned by the source.                     |
| [`representation`](https://www.shoalrun.com/content-delivery/sdk/content-result.md#shoalrun-content-contentresult-representation) | `Readonly<`[`ContentRepresentation`](https://www.shoalrun.com/content-delivery/sdk/content-representation.md)`>` | Required           | File, media type, anchors, and typed links for the selected format. |
| [`resource`](https://www.shoalrun.com/content-delivery/sdk/content-result.md#shoalrun-content-contentresult-resource)             | `Readonly<`[`ContentResource`](https://www.shoalrun.com/content-delivery/sdk/content-resource.md)`>`             | Required           | Inventory entry that was selected by the requested reference.       |
| [`revision`](https://www.shoalrun.com/content-delivery/sdk/content-result.md#shoalrun-content-contentresult-revision)             | `string`                                                                                                         | Required           | Revision shared by this response and its opened content snapshot.   |

## shoalrun.content.ContentResult.content

**Property** `shoalrun.content.ContentResult.content`

```typescript
content: string
```

Validated UTF-8 HTML or Markdown text.

**Type:&#x20;**`string`

Required

## shoalrun.content.ContentResult.format

**Property** `shoalrun.content.ContentResult.format`

```typescript
format: ContentFormat
```

Representation actually returned by the source.

**Type:&#x20;**[`ContentFormat`](https://www.shoalrun.com/content-delivery/sdk/content-format.md)

Required

## shoalrun.content.ContentResult.representation

**Property** `shoalrun.content.ContentResult.representation`

```typescript
representation: Readonly<ContentRepresentation>
```

File, media type, anchors, and typed links for the selected format.

**Type:&#x20;**`Readonly<`[`ContentRepresentation`](https://www.shoalrun.com/content-delivery/sdk/content-representation.md)`>`

Required

## shoalrun.content.ContentResult.resource

**Property** `shoalrun.content.ContentResult.resource`

```typescript
resource: Readonly<ContentResource>
```

Inventory entry that was selected by the requested reference.

**Type:&#x20;**`Readonly<`[`ContentResource`](https://www.shoalrun.com/content-delivery/sdk/content-resource.md)`>`

Required

## shoalrun.content.ContentResult.revision

**Property** `shoalrun.content.ContentResult.revision`

```typescript
revision: string
```

Revision shared by this response and its opened content snapshot.

**Type:&#x20;**`string`

Required
