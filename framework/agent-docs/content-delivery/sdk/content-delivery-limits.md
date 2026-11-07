---
id: reference.content-sdk.ContentDeliveryLimits
title: ContentDeliveryLimits
summary: Positive safe-integer bounds applied when opening and reading content.
type: code-reference
area: publishing
subarea: publishing-content-delivery
canonical: /content-delivery/sdk/content-delivery-limits
---

# ContentDeliveryLimits

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

**Updated: 2026-09-27.**

**Type** `shoalrun.content.ContentDeliveryLimits`

```typescript
type ContentDeliveryLimits = {
    manifestBytes?: number;
    resourceBytes?: number;
    resources?: number;
};
```

Positive safe-integer bounds applied when opening and reading content.

## Fields

| Name                                                                                                                                             | Type                  | Required / default | Description                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------- | ------------------ | ---------------------------------------------------------------------- |
| [`manifestBytes`](https://www.shoalrun.com/content-delivery/sdk/content-delivery-limits.md#shoalrun-content-contentdeliverylimits-manifestbytes) | `number \| undefined` | Optional           | Maximum manifest or REST inventory bytes. Defaults to 5,000,000.       |
| [`resourceBytes`](https://www.shoalrun.com/content-delivery/sdk/content-delivery-limits.md#shoalrun-content-contentdeliverylimits-resourcebytes) | `number \| undefined` | Optional           | Maximum bytes for an individual representation. Defaults to 8,000,000. |
| [`resources`](https://www.shoalrun.com/content-delivery/sdk/content-delivery-limits.md#shoalrun-content-contentdeliverylimits-resources)         | `number \| undefined` | Optional           | Maximum resource count in the inventory. Defaults to 10,000.           |

## shoalrun.content.ContentDeliveryLimits.manifestBytes

**Property** `shoalrun.content.ContentDeliveryLimits.manifestBytes`

```typescript
manifestBytes?: number | undefined
```

Maximum manifest or REST inventory bytes. Defaults to 5,000,000.

**Type:&#x20;**`number | undefined`

Optional

## shoalrun.content.ContentDeliveryLimits.resourceBytes

**Property** `shoalrun.content.ContentDeliveryLimits.resourceBytes`

```typescript
resourceBytes?: number | undefined
```

Maximum bytes for an individual representation. Defaults to 8,000,000.

**Type:&#x20;**`number | undefined`

Optional

## shoalrun.content.ContentDeliveryLimits.resources

**Property** `shoalrun.content.ContentDeliveryLimits.resources`

```typescript
resources?: number | undefined
```

Maximum resource count in the inventory. Defaults to 10,000.

**Type:&#x20;**`number | undefined`

Optional
