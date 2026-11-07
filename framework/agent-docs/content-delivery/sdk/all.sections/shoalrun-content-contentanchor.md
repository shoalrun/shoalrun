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

## shoalrun.content.ContentAnchor

**Type** `shoalrun.content.ContentAnchor`

```typescript
type ContentAnchor = {
    id: string;
    exportedId: string;
    title?: string;
};
```

Mapping from a canonical document fragment to its exported HTML ID.

### Fields

| Name                                                                                                           | Type                  | Required / default | Description |
| -------------------------------------------------------------------------------------------------------------- | --------------------- | ------------------ | ----------- |
| [`exportedId`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentanchor-exportedid) | `string`              | Required           | —           |
| [`id`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentanchor-id)                 | `string`              | Required           | —           |
| [`title`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentanchor-title)           | `string \| undefined` | Optional           | —           |
