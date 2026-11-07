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

## shoalrun.content.mountContent

**Function** `shoalrun.content.mountContent`

```typescript
mountContent(container: Element, result: ContentResult, options?: { instanceId?: string; signal?: AbortSignal; }): ContentMount
```

Mount trusted compiler HTML with instance-specific anchor and accessibility IDs.
This is not a sanitizer. The result must come from trusted compiler output.
The mount replaces the container's children and rewrites local routing metadata.

### Parameters

| Parameter   | Type / default                                                                                         | Description                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `container` | `Element`                                                                                              | DOM element receiving the content.                                 |
| `result`    | [`ContentResult`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentresult) | A validated HTML representation; Markdown results aren't accepted. |
| `options`   | `{ instanceId?: string; signal?: AbortSignal; } \| undefined`                                          | Optional unique instance ID and cancellation signal.               |

### Returns

[`ContentMount`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentmount)

Rewritten anchors, typed links, and an unmount handle.
