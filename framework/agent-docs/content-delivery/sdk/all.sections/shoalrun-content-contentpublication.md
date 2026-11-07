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

## shoalrun.content.ContentPublication

**Type** `shoalrun.content.ContentPublication`

```typescript
type ContentPublication = {
    channel: string;
    version: string;
    language: string;
    product?: string;
};
```

Exact documentation publication selected by a content source.

### Fields

| Name                                                                                                            | Type                  | Required / default | Description |
| --------------------------------------------------------------------------------------------------------------- | --------------------- | ------------------ | ----------- |
| [`channel`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentpublication-channel)   | `string`              | Required           | —           |
| [`language`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentpublication-language) | `string`              | Required           | —           |
| [`product`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentpublication-product)   | `string \| undefined` | Optional           | —           |
| [`version`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentpublication-version)   | `string`              | Required           | —           |
