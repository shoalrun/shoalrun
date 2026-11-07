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

## shoalrun.content.ContentRestError

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

### Fields

| Name                                                                                 | Type                                                                                                                                                     | Required / default | Description |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ----------- |
| [`error`](https://www.shoalrun.com/content-delivery/sdk/content-rest-error/error.md) | `{ code: `[`ContentRestErrorCode`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentresterrorcode)`; message: string; }` | Required           | —           |
