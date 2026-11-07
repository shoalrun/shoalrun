---
id: reference.content-sdk.ContentErrorCode
title: ContentErrorCode
summary: Stable error categories raised by content-source validation and reads.
type: code-reference
area: publishing
subarea: publishing-content-delivery
canonical: /content-delivery/sdk/content-error-code
---

# ContentErrorCode

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

**Updated: 2026-09-27.**

**Type** `shoalrun.content.ContentErrorCode`

```typescript
type ContentErrorCode = 'invalid_manifest' | 'not_found' | 'unsupported_format' | 'stale_revision' | 'network_error' | 'invalid_content' | 'disposed';
```

Stable error categories raised by content-source validation and reads.
