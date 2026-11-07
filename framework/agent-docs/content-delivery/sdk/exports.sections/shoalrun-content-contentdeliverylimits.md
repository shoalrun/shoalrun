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

## shoalrun.content.ContentDeliveryLimits

**Type** `shoalrun.content.ContentDeliveryLimits`

```typescript
type ContentDeliveryLimits = {
    manifestBytes?: number;
    resourceBytes?: number;
    resources?: number;
};
```

Positive safe-integer bounds applied when opening and reading content.

### Fields

| Name                                                                                                       | Type                  | Required / default | Description                                                            |
| ---------------------------------------------------------------------------------------------------------- | --------------------- | ------------------ | ---------------------------------------------------------------------- |
| [`manifestBytes`](https://www.shoalrun.com/content-delivery/sdk/content-delivery-limits/manifest-bytes.md) | `number \| undefined` | Optional           | Maximum manifest or REST inventory bytes. Defaults to 5,000,000.       |
| [`resourceBytes`](https://www.shoalrun.com/content-delivery/sdk/content-delivery-limits/resource-bytes.md) | `number \| undefined` | Optional           | Maximum bytes for an individual representation. Defaults to 8,000,000. |
| [`resources`](https://www.shoalrun.com/content-delivery/sdk/content-delivery-limits/resources.md)          | `number \| undefined` | Optional           | Maximum resource count in the inventory. Defaults to 10,000.           |
