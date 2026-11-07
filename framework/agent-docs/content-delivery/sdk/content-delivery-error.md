---
id: reference.content-sdk.ContentDeliveryError
title: ContentDeliveryError
summary: Delivery failure with a machine-readable code and a human-readable message.
type: code-reference
area: publishing
subarea: publishing-content-delivery
canonical: /content-delivery/sdk/content-delivery-error
---

# ContentDeliveryError

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Reference](https://www.shoalrun.com/.well-known/shoalrun/navigation/reference-tab-50f26fe22670.txt) (ID: reference-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Reference](https://www.shoalrun.com/cli.md) > Content delivery > TypeScript symbols > ContentDeliveryError

**Updated: 2026-11-07.**

**Class** `shoalrun.content.ContentDeliveryError`

```typescript
class ContentDeliveryError extends Error
```

Delivery failure with a machine-readable code and a human-readable message.

## Constructor

```typescript
new ContentDeliveryError(code: ContentErrorCode, message: string): ContentDeliveryError
```

**Bases:&#x20;**`Error`

## Fields

| Name                                                                                                                         | Type                                                                                      | Required / default | Description |
| ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------ | ----------- |
| [`code`](https://www.shoalrun.com/content-delivery/sdk/content-delivery-error.md#shoalrun-content-contentdeliveryerror-code) | [`ContentErrorCode`](https://www.shoalrun.com/content-delivery/sdk/content-error-code.md) | Required           | —           |

## shoalrun.content.ContentDeliveryError.code

**Property** `shoalrun.content.ContentDeliveryError.code`

```typescript
readonly code: ContentErrorCode
```

**Type:&#x20;**[`ContentErrorCode`](https://www.shoalrun.com/content-delivery/sdk/content-error-code.md)

Required
