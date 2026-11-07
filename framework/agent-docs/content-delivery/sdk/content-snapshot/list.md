---
id: reference.content-sdk.ContentSnapshot.list
title: list
summary: List the resources in the opened inventory without fetching their bodies.
type: code-reference
area: publishing
subarea: publishing-content-delivery
canonical: /content-delivery/sdk/content-snapshot/list
---

# list

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

**Updated: 2026-09-27.**

**Method** `shoalrun.content.ContentSnapshot.list`

```typescript
list(): readonly Readonly<ContentResource>[]
```

List the resources in the opened inventory without fetching their bodies.

## Returns

`readonly Readonly<`[`ContentResource`](https://www.shoalrun.com/content-delivery/sdk/content-resource.md)`>[]`

Read-only resource entries for this publication and revision.
