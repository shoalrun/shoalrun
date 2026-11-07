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

## shoalrun.content.ContentRef

**Type** `shoalrun.content.ContentRef`

```typescript
type ContentRef = {
    kind: 'page';
    documentId: string;
} | {
    kind: 'section';
    documentId: string;
    sectionId: string;
} | {
    kind: 'snippet';
    id: string;
};
```

Stable identity of a page, a section within a page, or a named snippet instance.
A reference is scoped to the publication and revision of the opened snapshot.
