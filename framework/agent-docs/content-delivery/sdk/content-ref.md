---
id: reference.content-sdk.ContentRef
title: ContentRef
summary: Stable identity of a page, a section within a page, or a named snippet
  instance. A reference is scoped to the publication and revision of the opened
  snapshot.
type: code-reference
area: publishing
subarea: publishing-content-delivery
canonical: /content-delivery/sdk/content-ref
---

# ContentRef

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Reference](https://www.shoalrun.com/.well-known/shoalrun/navigation/reference-tab-50f26fe22670.txt) (ID: reference-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Reference](https://www.shoalrun.com/cli.md) > Content delivery > TypeScript symbols > ContentRef

**Updated: 2026-09-27.**

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
