---
id: reference.content-sdk.ContentRestError
title: ContentRestError
summary: JSON error envelope returned by the content REST service.
type: code-reference
area: publishing
subarea: publishing-content-delivery
canonical: /content-delivery/sdk/content-rest-error
---

# ContentRestError

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

**Updated: 2026-09-27.**

**Type** `shoalrun.content.ContentRestError`

```typescript
type ContentRestError = {
    error: {
        code: ContentRestErrorCode;
        message: string;
    };
};
```

JSON error envelope returned by the content REST service.

## Fields

| Name                                                                                                                   | Type                                                                                                                               | Required / default | Description |
| ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ----------- |
| [`error`](https://www.shoalrun.com/content-delivery/sdk/content-rest-error.md#shoalrun-content-contentresterror-error) | `{ code: `[`ContentRestErrorCode`](https://www.shoalrun.com/content-delivery/sdk/content-rest-error-code.md)`; message: string; }` | Required           | —           |

## shoalrun.content.ContentRestError.error

**Property** `shoalrun.content.ContentRestError.error`

```typescript
error: { code: ContentRestErrorCode; message: string; }
```

**Type:&#x20;**`{ code: `[`ContentRestErrorCode`](https://www.shoalrun.com/content-delivery/sdk/content-rest-error-code.md)`; message: string; }`

Required
