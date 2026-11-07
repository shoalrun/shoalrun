---
id: reference.content-sdk.mountContent
title: mountContent
summary: Mount trusted compiler HTML with instance-specific anchor and
  accessibility IDs. This is not a sanitizer. The result must come from trusted
  compiler output. The mount replaces the container's children and rewrites
  local routing metadata.
type: code-reference
area: publishing
subarea: publishing-content-delivery
canonical: /content-delivery/sdk/mount-content
---

# mountContent

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Reference](https://www.shoalrun.com/.well-known/shoalrun/navigation/reference-tab-50f26fe22670.txt) (ID: reference-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Reference](https://www.shoalrun.com/cli.md) > Content delivery > TypeScript symbols > mountContent

**Updated: 2026-09-27.**

**Function** `shoalrun.content.mountContent`

```typescript
mountContent(container: Element, result: ContentResult, options?: { instanceId?: string; signal?: AbortSignal; }): ContentMount
```

Mount trusted compiler HTML with instance-specific anchor and accessibility IDs.
This is not a sanitizer. The result must come from trusted compiler output.
The mount replaces the container's children and rewrites local routing metadata.

## Parameters

| Parameter   | Type / default                                                                     | Description                                                        |
| ----------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `container` | `Element`                                                                          | DOM element receiving the content.                                 |
| `result`    | [`ContentResult`](https://www.shoalrun.com/content-delivery/sdk/content-result.md) | A validated HTML representation; Markdown results aren't accepted. |
| `options`   | `{ instanceId?: string; signal?: AbortSignal; } \| undefined`                      | Optional unique instance ID and cancellation signal.               |

## Returns

[`ContentMount`](https://www.shoalrun.com/content-delivery/sdk/content-mount.md)

Rewritten anchors, typed links, and an unmount handle.
