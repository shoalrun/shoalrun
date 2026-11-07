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

Breadcrumbs: [Reference](https://www.shoalrun.com/cli.md) > Content delivery > TypeScript symbols > Complete reference

**Updated: 2026-11-07.**

Parent page: [Full Markdown page](/content-delivery/sdk/all.md)

## shoalrun.content.validateContentManifest

**Function** `shoalrun.content.validateContentManifest`

```typescript
validateContentManifest(value: any, maxResources?: number, maxResourceBytes?: number): asserts value is ContentManifest
```

Validate a parsed manifest's shape, identities, paths, and resource bounds.
This assertion narrows the value but doesn't verify fetched file bytes or trust in a host.

### Parameters

| Parameter          | Type / default        | Description                                                   |
| ------------------ | --------------------- | ------------------------------------------------------------- |
| `value`            | `any`                 | Parsed JSON manifest to validate.                             |
| `maxResources`     | `number \| undefined` | Maximum allowed resource count; defaults to 10,000.           |
| `maxResourceBytes` | `number \| undefined` | Maximum declared representation bytes; defaults to 8,000,000. |

### Returns

`void`
