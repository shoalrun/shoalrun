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

## shoalrun.content.ContentRestErrorCode

**Type** `shoalrun.content.ContentRestErrorCode`

```typescript
type ContentRestErrorCode = 'invalid_request' | 'not_found' | 'unsupported_format' | 'stale_revision' | 'method_not_allowed' | 'internal_error';
```

Error categories used by the content REST protocol.
