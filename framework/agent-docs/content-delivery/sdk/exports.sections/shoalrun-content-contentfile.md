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

## shoalrun.content.ContentFile

**Type** `shoalrun.content.ContentFile`

```typescript
type ContentFile = {
    path: string;
    bytes: number;
    digest: string;
};
```

Export-relative file path, byte length, and SHA-256 digest.

### Fields

| Name                                                                             | Type     | Required / default | Description |
| -------------------------------------------------------------------------------- | -------- | ------------------ | ----------- |
| [`bytes`](https://www.shoalrun.com/content-delivery/sdk/content-file/bytes.md)   | `number` | Required           | —           |
| [`digest`](https://www.shoalrun.com/content-delivery/sdk/content-file/digest.md) | `string` | Required           | —           |
| [`path`](https://www.shoalrun.com/content-delivery/sdk/content-file/path.md)     | `string` | Required           | —           |
