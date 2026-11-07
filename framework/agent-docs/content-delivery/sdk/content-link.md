---
id: reference.content-sdk.ContentLink
title: ContentLink
summary: Classified link and optional resource identity for application routing.
type: code-reference
area: publishing
subarea: publishing-content-delivery
canonical: /content-delivery/sdk/content-link
---

# ContentLink

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

**Updated: 2026-09-27.**

**Type** `shoalrun.content.ContentLink`

```typescript
type ContentLink = {
    key: string;
    kind: 'resource' | 'canonical' | 'external' | 'asset';
    href: string;
    ref?: ContentRef;
    fragment?: string;
    query?: string;
    asset?: string;
};
```

Classified link and optional resource identity for application routing.

## Fields

| Name                                                                                                              | Type                                                                                        | Required / default | Description |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------ | ----------- |
| [`asset`](https://www.shoalrun.com/content-delivery/sdk/content-link.md#shoalrun-content-contentlink-asset)       | `string \| undefined`                                                                       | Optional           | —           |
| [`fragment`](https://www.shoalrun.com/content-delivery/sdk/content-link.md#shoalrun-content-contentlink-fragment) | `string \| undefined`                                                                       | Optional           | —           |
| [`href`](https://www.shoalrun.com/content-delivery/sdk/content-link.md#shoalrun-content-contentlink-href)         | `string`                                                                                    | Required           | —           |
| [`key`](https://www.shoalrun.com/content-delivery/sdk/content-link.md#shoalrun-content-contentlink-key)           | `string`                                                                                    | Required           | —           |
| [`kind`](https://www.shoalrun.com/content-delivery/sdk/content-link.md#shoalrun-content-contentlink-kind)         | `"resource" \| "canonical" \| "external" \| "asset"`                                        | Required           | —           |
| [`query`](https://www.shoalrun.com/content-delivery/sdk/content-link.md#shoalrun-content-contentlink-query)       | `string \| undefined`                                                                       | Optional           | —           |
| [`ref`](https://www.shoalrun.com/content-delivery/sdk/content-link.md#shoalrun-content-contentlink-ref)           | [`ContentRef`](https://www.shoalrun.com/content-delivery/sdk/content-ref.md)` \| undefined` | Optional           | —           |

## shoalrun.content.ContentLink.asset

**Property** `shoalrun.content.ContentLink.asset`

```typescript
asset?: string | undefined
```

**Type:&#x20;**`string | undefined`

Optional

## shoalrun.content.ContentLink.fragment

**Property** `shoalrun.content.ContentLink.fragment`

```typescript
fragment?: string | undefined
```

**Type:&#x20;**`string | undefined`

Optional

## shoalrun.content.ContentLink.href

**Property** `shoalrun.content.ContentLink.href`

```typescript
href: string
```

**Type:&#x20;**`string`

Required

## shoalrun.content.ContentLink.key

**Property** `shoalrun.content.ContentLink.key`

```typescript
key: string
```

**Type:&#x20;**`string`

Required

## shoalrun.content.ContentLink.kind

**Property** `shoalrun.content.ContentLink.kind`

```typescript
kind: "resource" | "canonical" | "external" | "asset"
```

**Type:&#x20;**`"resource" | "canonical" | "external" | "asset"`

Required

## shoalrun.content.ContentLink.query

**Property** `shoalrun.content.ContentLink.query`

```typescript
query?: string | undefined
```

**Type:&#x20;**`string | undefined`

Optional

## shoalrun.content.ContentLink.ref

**Property** `shoalrun.content.ContentLink.ref`

```typescript
ref?: ContentRef | undefined
```

**Type:&#x20;**[`ContentRef`](https://www.shoalrun.com/content-delivery/sdk/content-ref.md)` | undefined`

Optional
