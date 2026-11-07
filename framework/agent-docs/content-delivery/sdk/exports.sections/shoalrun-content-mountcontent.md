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

## shoalrun.content.mountContent

**Function** `shoalrun.content.mountContent`

```typescript
mountContent(container: Element, result: ContentResult, options?: { instanceId?: string; signal?: AbortSignal; }): ContentMount
```

Mount trusted compiler HTML with instance-specific anchor and accessibility IDs.
This is not a sanitizer. The result must come from trusted compiler output.
The mount replaces the container's children and rewrites local routing metadata.

### Parameters

| Parameter   | Type / default                                                                                             | Description                                                        |
| ----------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `container` | `Element`                                                                                                  | DOM element receiving the content.                                 |
| `result`    | [`ContentResult`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentresult) | A validated HTML representation; Markdown results aren't accepted. |
| `options`   | `{ instanceId?: string; signal?: AbortSignal; } \| undefined`                                              | Optional unique instance ID and cancellation signal.               |

### Returns

[`ContentMount`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentmount)

Rewritten anchors, typed links, and an unmount handle.
