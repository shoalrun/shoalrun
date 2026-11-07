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

Breadcrumbs: [Reference](https://www.shoalrun.com/cli.md) > Content delivery > TypeScript reference

**Updated: 2026-11-07.**

Parent page: [Full Markdown page](/content-delivery/sdk/all.md)

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

| Name                                                                                                                         | Type                  | Required / default | Description                                                            |
| ---------------------------------------------------------------------------------------------------------------------------- | --------------------- | ------------------ | ---------------------------------------------------------------------- |
| [`manifestBytes`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentdeliverylimits-manifestbytes) | `number \| undefined` | Optional           | Maximum manifest or REST inventory bytes. Defaults to 5,000,000.       |
| [`resourceBytes`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentdeliverylimits-resourcebytes) | `number \| undefined` | Optional           | Maximum bytes for an individual representation. Defaults to 8,000,000. |
| [`resources`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentdeliverylimits-resources)         | `number \| undefined` | Optional           | Maximum resource count in the inventory. Defaults to 10,000.           |
