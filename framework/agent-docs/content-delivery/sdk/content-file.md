---
id: reference.content-sdk.ContentFile
title: ContentFile
summary: Export-relative file path, byte length, and SHA-256 digest.
type: code-reference
area: publishing
subarea: publishing-content-delivery
canonical: /content-delivery/sdk/content-file
---

# ContentFile

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

**Updated: 2026-09-27.**

**Type** `shoalrun.content.ContentFile`

```typescript
type ContentFile = {
    path: string;
    bytes: number;
    digest: string;
};
```

Export-relative file path, byte length, and SHA-256 digest.

## Fields

| Name                                                                                                          | Type     | Required / default | Description |
| ------------------------------------------------------------------------------------------------------------- | -------- | ------------------ | ----------- |
| [`bytes`](https://www.shoalrun.com/content-delivery/sdk/content-file.md#shoalrun-content-contentfile-bytes)   | `number` | Required           | —           |
| [`digest`](https://www.shoalrun.com/content-delivery/sdk/content-file.md#shoalrun-content-contentfile-digest) | `string` | Required           | —           |
| [`path`](https://www.shoalrun.com/content-delivery/sdk/content-file.md#shoalrun-content-contentfile-path)     | `string` | Required           | —           |

## shoalrun.content.ContentFile.bytes

**Property** `shoalrun.content.ContentFile.bytes`

```typescript
bytes: number
```

**Type:&#x20;**`number`

Required

## shoalrun.content.ContentFile.digest

**Property** `shoalrun.content.ContentFile.digest`

```typescript
digest: string
```

**Type:&#x20;**`string`

Required

## shoalrun.content.ContentFile.path

**Property** `shoalrun.content.ContentFile.path`

```typescript
path: string
```

**Type:&#x20;**`string`

Required
