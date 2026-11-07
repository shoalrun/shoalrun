---
id: reference.content-sdk.validateContentManifest
title: validateContentManifest
summary: Validate a parsed manifest's shape, identities, paths, and resource
  bounds. This assertion narrows the value but doesn't verify fetched file bytes
  or trust in a host.
type: code-reference
area: publishing
subarea: publishing-content-delivery
canonical: /content-delivery/sdk/validate-content-manifest
---

# validateContentManifest

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

**Updated: 2026-09-27.**

**Function** `shoalrun.content.validateContentManifest`

```typescript
validateContentManifest(value: any, maxResources?: number, maxResourceBytes?: number): asserts value is ContentManifest
```

Validate a parsed manifest's shape, identities, paths, and resource bounds.
This assertion narrows the value but doesn't verify fetched file bytes or trust in a host.

## Parameters

| Parameter          | Type / default        | Description                                                   |
| ------------------ | --------------------- | ------------------------------------------------------------- |
| `value`            | `any`                 | Parsed JSON manifest to validate.                             |
| `maxResources`     | `number \| undefined` | Maximum allowed resource count; defaults to 10,000.           |
| `maxResourceBytes` | `number \| undefined` | Maximum declared representation bytes; defaults to 8,000,000. |

## Returns

`void`
