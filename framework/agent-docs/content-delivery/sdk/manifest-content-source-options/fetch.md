---
id: reference.content-sdk.ManifestContentSourceOptions.fetch
title: fetch
summary: Fetch implementation. Defaults to globalThis.fetch.
type: code-reference
area: publishing
subarea: publishing-content-delivery
canonical: /content-delivery/sdk/manifest-content-source-options/fetch
---

# fetch

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

**Updated: 2026-09-27.**

**Property** `shoalrun.content.ManifestContentSourceOptions.fetch`

```typescript
fetch?: ((input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) | undefined
```

Fetch implementation. Defaults to globalThis.fetch.

**Type:&#x20;**`((input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) | undefined`

Optional
