---
id: reference.content-sdk.ContentMount
title: ContentMount
summary: Handles and rewritten routing metadata for one mounted HTML instance.
type: code-reference
area: publishing
subarea: publishing-content-delivery
canonical: /content-delivery/sdk/content-mount
---

# ContentMount

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

**Updated: 2026-09-27.**

**Type** `shoalrun.content.ContentMount`

```typescript
type ContentMount = {
    anchors: readonly ContentAnchor[];
    links: readonly ContentLink[];
    unmount(): void;
};
```

Handles and rewritten routing metadata for one mounted HTML instance.

## Fields

| Name                                                                                                              | Type                                                                                              | Required / default | Description                                                         |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------- |
| [`anchors`](https://www.shoalrun.com/content-delivery/sdk/content-mount.md#shoalrun-content-contentmount-anchors) | `readonly `[`ContentAnchor`](https://www.shoalrun.com/content-delivery/sdk/content-anchor.md)`[]` | Required           | Anchors after instance-specific ID rewriting.                       |
| [`links`](https://www.shoalrun.com/content-delivery/sdk/content-mount.md#shoalrun-content-contentmount-links)     | `readonly `[`ContentLink`](https://www.shoalrun.com/content-delivery/sdk/content-link.md)`[]`     | Required           | Typed links, including rewritten local fragments for this instance. |

## Methods

| Name                                                                                                              | Kind     | Description                                   |
| ----------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------- |
| [`unmount`](https://www.shoalrun.com/content-delivery/sdk/content-mount.md#shoalrun-content-contentmount-unmount) | `method` | Remove nodes that still belong to this mount. |

## shoalrun.content.ContentMount.anchors

**Property** `shoalrun.content.ContentMount.anchors`

```typescript
anchors: readonly ContentAnchor[]
```

Anchors after instance-specific ID rewriting.

**Type:&#x20;**`readonly `[`ContentAnchor`](https://www.shoalrun.com/content-delivery/sdk/content-anchor.md)`[]`

Required

## shoalrun.content.ContentMount.links

**Property** `shoalrun.content.ContentMount.links`

```typescript
links: readonly ContentLink[]
```

Typed links, including rewritten local fragments for this instance.

**Type:&#x20;**`readonly `[`ContentLink`](https://www.shoalrun.com/content-delivery/sdk/content-link.md)`[]`

Required

## shoalrun.content.ContentMount.unmount

**Method** `shoalrun.content.ContentMount.unmount`

```typescript
unmount(): void
```

Remove nodes that still belong to this mount.

### Returns

`void`
