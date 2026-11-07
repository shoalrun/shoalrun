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

Breadcrumbs: [Reference](https://www.shoalrun.com/cli.md) > Content delivery > TypeScript symbols > Complete reference

**Updated: 2026-11-07.**

Parent page: [Full Markdown page](/content-delivery/sdk/all.md)

## shoalrun.content.ContentRestList

**Type** `shoalrun.content.ContentRestList`

```typescript
type ContentRestList = {
    schemaVersion: 1 | 2;
    revision: string;
    publication: ContentPublication;
    resources: ContentRestEntry[];
};
```

Revision-scoped inventory envelope returned by the content REST service.

### Fields

| Name                                                                                                                   | Type                                                                                                             | Required / default | Description |
| ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------ | ----------- |
| [`publication`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentrestlist-publication)     | [`ContentPublication`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentpublication) | Required           | —           |
| [`resources`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentrestlist-resources)         | [`ContentRestEntry`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentrestentry)`[]` | Required           | —           |
| [`revision`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentrestlist-revision)           | `string`                                                                                                         | Required           | —           |
| [`schemaVersion`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentrestlist-schemaversion) | `1 \| 2`                                                                                                         | Required           | —           |
