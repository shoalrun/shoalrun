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

## shoalrun.content.ContentDeliveryError

**Class** `shoalrun.content.ContentDeliveryError`

```typescript
class ContentDeliveryError extends Error
```

Delivery failure with a machine-readable code and a human-readable message.

### Constructor

```typescript
new ContentDeliveryError(code: ContentErrorCode, message: string): ContentDeliveryError
```

**Bases:&#x20;**`Error`

### Fields

| Name                                                                                   | Type                                                                                                             | Required / default | Description |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------ | ----------- |
| [`code`](https://www.shoalrun.com/content-delivery/sdk/content-delivery-error/code.md) | [`ContentErrorCode`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contenterrorcode) | Required           | —           |
