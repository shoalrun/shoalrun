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

## shoalrun.content

**Module** `shoalrun.content`

### Functions

| Name                                                                                                                           | Kind       | Description                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------ | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`contentRefKey`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentrefkey)                         | `function` | Serialize a reference to a deterministic key without including publication scope.                                                                                                                                                             |
| [`contentResourceKey`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentresourcekey)               | `function` | Public identity only: independent of publication, revision, and export filenames.                                                                                                                                                             |
| [`mountContent`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-mountcontent)                           | `function` | Mount trusted compiler HTML with instance-specific anchor and accessibility IDs. This is not a sanitizer. The result must come from trusted compiler output. The mount replaces the container's children and rewrites local routing metadata. |
| [`openManifestContentSource`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-openmanifestcontentsource) | `function` | Open and validate one immutable static manifest revision. The caller owns trust in the compiler output and host. Browser URLs must use the application's origin. Requests reject redirects and unexpected content types.                      |
| [`openRestContentSource`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-openrestcontentsource)         | `function` | Open a REST inventory and pin subsequent resource reads to its revision.                                                                                                                                                                      |
| [`validateContentManifest`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-validatecontentmanifest)     | `function` | Validate a parsed manifest's shape, identities, paths, and resource bounds. This assertion narrows the value but doesn't verify fetched file bytes or trust in a host.                                                                        |

### Members

| Name                                                                                                                                 | Kind        | Description                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------ | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`ContentAnchor`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentanchor)                               | `type`      | Mapping from a canonical document fragment to its exported HTML ID.                                                                                            |
| [`ContentAsset`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentasset)                                 | `type`      | A content-addressed file with its declared media type.                                                                                                         |
| [`ContentDeliveryError`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentdeliveryerror)                 | `class`     | Delivery failure with a machine-readable code and a human-readable message.                                                                                    |
| [`ContentDeliveryLimits`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentdeliverylimits)               | `type`      | Positive safe-integer bounds applied when opening and reading content.                                                                                         |
| [`ContentErrorCode`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contenterrorcode)                         | `type`      | Stable error categories raised by content-source validation and reads.                                                                                         |
| [`ContentFile`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentfile)                                   | `type`      | Export-relative file path, byte length, and SHA-256 digest.                                                                                                    |
| [`ContentFormat`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentformat)                               | `type`      | Portable representations a content client can request.                                                                                                         |
| [`ContentLink`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentlink)                                   | `type`      | Classified link and optional resource identity for application routing.                                                                                        |
| [`ContentManifest`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentmanifest)                           | `type`      | One validated, content-addressed export inventory.                                                                                                             |
| [`ContentMount`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentmount)                                 | `type`      | Handles and rewritten routing metadata for one mounted HTML instance.                                                                                          |
| [`ContentPublication`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentpublication)                     | `type`      | Exact documentation publication selected by a content source.                                                                                                  |
| [`ContentRef`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentref)                                     | `type`      | Stable identity of a page, a section within a page, or a named snippet instance. A reference is scoped to the publication and revision of the opened snapshot. |
| [`ContentRepresentation`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentrepresentation)               | `type`      | One portable format, including its file metadata, anchors, and typed links.                                                                                    |
| [`ContentResource`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentresource)                           | `type`      | Inventory entry describing one exported document, section, or snippet instance.                                                                                |
| [`ContentRestEntry`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentrestentry)                         | `type`      | One resource inventory entry with its REST lookup key.                                                                                                         |
| [`ContentRestError`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentresterror)                         | `type`      | JSON error envelope returned by the content REST service.                                                                                                      |
| [`ContentRestErrorCode`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentresterrorcode)                 | `type`      | Error categories used by the content REST protocol.                                                                                                            |
| [`ContentRestList`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentrestlist)                           | `type`      | Revision-scoped inventory envelope returned by the content REST service.                                                                                       |
| [`ContentRestResource`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentrestresource)                   | `type`      | Revision-scoped metadata envelope for a single content resource.                                                                                               |
| [`ContentResult`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentresult)                               | `type`      | A fetched representation together with the metadata needed to render or route it.                                                                              |
| [`ContentSnapshot`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentsnapshot)                           | `interface` | A client pinned to one immutable inventory revision and publication.                                                                                           |
| [`ManifestContentSourceOptions`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-manifestcontentsourceoptions) | `type`      | Configuration for opening a static content-export manifest.                                                                                                    |
| [`RestContentSourceOptions`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-restcontentsourceoptions)         | `type`      | Options for a REST inventory and its revision-pinned resource reads.                                                                                           |

## shoalrun.content.ContentAnchor

**Type** `shoalrun.content.ContentAnchor`

```typescript
type ContentAnchor = {
    id: string;
    exportedId: string;
    title?: string;
};
```

Mapping from a canonical document fragment to its exported HTML ID.

### Fields

| Name                                                                                                           | Type                  | Required / default | Description |
| -------------------------------------------------------------------------------------------------------------- | --------------------- | ------------------ | ----------- |
| [`exportedId`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentanchor-exportedid) | `string`              | Required           | —           |
| [`id`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentanchor-id)                 | `string`              | Required           | —           |
| [`title`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentanchor-title)           | `string \| undefined` | Optional           | —           |

## shoalrun.content.ContentAnchor.exportedId

**Property** `shoalrun.content.ContentAnchor.exportedId`

```typescript
exportedId: string
```

**Type:&#x20;**`string`

Required

## shoalrun.content.ContentAnchor.id

**Property** `shoalrun.content.ContentAnchor.id`

```typescript
id: string
```

**Type:&#x20;**`string`

Required

## shoalrun.content.ContentAnchor.title

**Property** `shoalrun.content.ContentAnchor.title`

```typescript
title?: string | undefined
```

**Type:&#x20;**`string | undefined`

Optional

## shoalrun.content.ContentAsset

**Type** `shoalrun.content.ContentAsset`

```typescript
type ContentAsset = ContentFile & {
    mediaType: string;
};
```

A content-addressed file with its declared media type.

### Fields

| Name                                                                                                        | Type     | Required / default | Description |
| ----------------------------------------------------------------------------------------------------------- | -------- | ------------------ | ----------- |
| [`mediaType`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentasset-mediatype) | `string` | Required           | —           |

## shoalrun.content.ContentAsset.mediaType

**Property** `shoalrun.content.ContentAsset.mediaType`

```typescript
mediaType: string
```

**Type:&#x20;**`string`

Required

## shoalrun.content.ContentDeliveryError

**Class** `shoalrun.content.ContentDeliveryError`

```typescript
class ContentDeliveryError extends Error
```

Delivery failure with a machine-readable code and a human-readable message.

### Constructor

```typescript
new ContentDeliveryError(code: ContentErrorCode, message: string): ContentDeliveryError
```

**Bases:&#x20;**`Error`

### Fields

| Name                                                                                                      | Type                                                                                                         | Required / default | Description |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------ | ----------- |
| [`code`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentdeliveryerror-code) | [`ContentErrorCode`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contenterrorcode) | Required           | —           |

## shoalrun.content.ContentDeliveryError.code

**Property** `shoalrun.content.ContentDeliveryError.code`

```typescript
readonly code: ContentErrorCode
```

**Type:&#x20;**[`ContentErrorCode`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contenterrorcode)

Required

## shoalrun.content.ContentDeliveryLimits

**Type** `shoalrun.content.ContentDeliveryLimits`

```typescript
type ContentDeliveryLimits = {
    manifestBytes?: number;
    resourceBytes?: number;
    resources?: number;
};
```

Positive safe-integer bounds applied when opening and reading content.

### Fields

| Name                                                                                                                         | Type                  | Required / default | Description                                                            |
| ---------------------------------------------------------------------------------------------------------------------------- | --------------------- | ------------------ | ---------------------------------------------------------------------- |
| [`manifestBytes`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentdeliverylimits-manifestbytes) | `number \| undefined` | Optional           | Maximum manifest or REST inventory bytes. Defaults to 5,000,000.       |
| [`resourceBytes`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentdeliverylimits-resourcebytes) | `number \| undefined` | Optional           | Maximum bytes for an individual representation. Defaults to 8,000,000. |
| [`resources`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentdeliverylimits-resources)         | `number \| undefined` | Optional           | Maximum resource count in the inventory. Defaults to 10,000.           |

## shoalrun.content.ContentDeliveryLimits.manifestBytes

**Property** `shoalrun.content.ContentDeliveryLimits.manifestBytes`

```typescript
manifestBytes?: number | undefined
```

Maximum manifest or REST inventory bytes. Defaults to 5,000,000.

**Type:&#x20;**`number | undefined`

Optional

## shoalrun.content.ContentDeliveryLimits.resourceBytes

**Property** `shoalrun.content.ContentDeliveryLimits.resourceBytes`

```typescript
resourceBytes?: number | undefined
```

Maximum bytes for an individual representation. Defaults to 8,000,000.

**Type:&#x20;**`number | undefined`

Optional

## shoalrun.content.ContentDeliveryLimits.resources

**Property** `shoalrun.content.ContentDeliveryLimits.resources`

```typescript
resources?: number | undefined
```

Maximum resource count in the inventory. Defaults to 10,000.

**Type:&#x20;**`number | undefined`

Optional

## shoalrun.content.ContentErrorCode

**Type** `shoalrun.content.ContentErrorCode`

```typescript
type ContentErrorCode = 'invalid_manifest' | 'not_found' | 'unsupported_format' | 'stale_revision' | 'network_error' | 'invalid_content' | 'disposed';
```

Stable error categories raised by content-source validation and reads.

## shoalrun.content.ContentFile

**Type** `shoalrun.content.ContentFile`

```typescript
type ContentFile = {
    path: string;
    bytes: number;
    digest: string;
};
```

Export-relative file path, byte length, and SHA-256 digest.

### Fields

| Name                                                                                                 | Type     | Required / default | Description |
| ---------------------------------------------------------------------------------------------------- | -------- | ------------------ | ----------- |
| [`bytes`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentfile-bytes)   | `number` | Required           | —           |
| [`digest`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentfile-digest) | `string` | Required           | —           |
| [`path`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentfile-path)     | `string` | Required           | —           |

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

## shoalrun.content.ContentFormat

**Type** `shoalrun.content.ContentFormat`

```typescript
type ContentFormat = 'html' | 'markdown';
```

Portable representations a content client can request.

## shoalrun.content.ContentLink

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

### Fields

| Name                                                                                                     | Type                                                                                                            | Required / default | Description |
| -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------ | ----------- |
| [`asset`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentlink-asset)       | `string \| undefined`                                                                                           | Optional           | —           |
| [`fragment`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentlink-fragment) | `string \| undefined`                                                                                           | Optional           | —           |
| [`href`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentlink-href)         | `string`                                                                                                        | Required           | —           |
| [`key`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentlink-key)           | `string`                                                                                                        | Required           | —           |
| [`kind`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentlink-kind)         | `"resource" \| "canonical" \| "external" \| "asset"`                                                            | Required           | —           |
| [`query`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentlink-query)       | `string \| undefined`                                                                                           | Optional           | —           |
| [`ref`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentlink-ref)           | [`ContentRef`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentref)` \| undefined` | Optional           | —           |

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

**Type:&#x20;**[`ContentRef`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentref)` | undefined`

Optional

## shoalrun.content.ContentManifest

**Type** `shoalrun.content.ContentManifest`

```typescript
type ContentManifest = {
    schemaVersion: 1 | 2;
    kind: 'shoalrun-content-export';
    digest: string;
    publicBase: string;
    publication: ContentPublication;
    review: {
        status: 'ok' | 'required';
        apis: Array<{
            apiId: string;
            digest: string;
        }>;
    };
    resources: ContentResource[];
    assets: ContentAsset[];
    files: ContentFile[];
    diagnostics: Array<{
        code: string;
        documentId?: string;
        message: string;
    }>;
};
```

One validated, content-addressed export inventory.

### Fields

| Name                                                                                                                   | Type                                                                                                             | Required / default | Description |
| ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------ | ----------- |
| [`assets`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentmanifest-assets)               | [`ContentAsset`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentasset)`[]`         | Required           | —           |
| [`diagnostics`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentmanifest-diagnostics)     | `{ code: string; documentId?: string; message: string; }[]`                                                      | Required           | —           |
| [`digest`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentmanifest-digest)               | `string`                                                                                                         | Required           | —           |
| [`files`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentmanifest-files)                 | [`ContentFile`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentfile)`[]`           | Required           | —           |
| [`kind`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentmanifest-kind)                   | `"shoalrun-content-export"`                                                                                      | Required           | —           |
| [`publicBase`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentmanifest-publicbase)       | `string`                                                                                                         | Required           | —           |
| [`publication`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentmanifest-publication)     | [`ContentPublication`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentpublication) | Required           | —           |
| [`resources`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentmanifest-resources)         | [`ContentResource`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentresource)`[]`   | Required           | —           |
| [`review`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentmanifest-review)               | `{ status: "ok" \| "required"; apis: Array<{ apiId: string; digest: string; }>; }`                               | Required           | —           |
| [`schemaVersion`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentmanifest-schemaversion) | `1 \| 2`                                                                                                         | Required           | —           |

## shoalrun.content.ContentManifest.assets

**Property** `shoalrun.content.ContentManifest.assets`

```typescript
assets: ContentAsset[]
```

**Type:&#x20;**[`ContentAsset`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentasset)`[]`

Required

## shoalrun.content.ContentManifest.diagnostics

**Property** `shoalrun.content.ContentManifest.diagnostics`

```typescript
diagnostics: { code: string; documentId?: string; message: string; }[]
```

**Type:&#x20;**`{ code: string; documentId?: string; message: string; }[]`

Required

## shoalrun.content.ContentManifest.digest

**Property** `shoalrun.content.ContentManifest.digest`

```typescript
digest: string
```

**Type:&#x20;**`string`

Required

## shoalrun.content.ContentManifest.files

**Property** `shoalrun.content.ContentManifest.files`

```typescript
files: ContentFile[]
```

**Type:&#x20;**[`ContentFile`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentfile)`[]`

Required

## shoalrun.content.ContentManifest.kind

**Property** `shoalrun.content.ContentManifest.kind`

```typescript
kind: "shoalrun-content-export"
```

**Type:&#x20;**`"shoalrun-content-export"`

Required

## shoalrun.content.ContentManifest.publicBase

**Property** `shoalrun.content.ContentManifest.publicBase`

```typescript
publicBase: string
```

**Type:&#x20;**`string`

Required

## shoalrun.content.ContentManifest.publication

**Property** `shoalrun.content.ContentManifest.publication`

```typescript
publication: ContentPublication
```

**Type:&#x20;**[`ContentPublication`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentpublication)

Required

## shoalrun.content.ContentManifest.resources

**Property** `shoalrun.content.ContentManifest.resources`

```typescript
resources: ContentResource[]
```

**Type:&#x20;**[`ContentResource`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentresource)`[]`

Required

## shoalrun.content.ContentManifest.review

**Property** `shoalrun.content.ContentManifest.review`

```typescript
review: { status: "ok" | "required"; apis: Array<{ apiId: string; digest: string; }>; }
```

**Type:&#x20;**`{ status: "ok" | "required"; apis: Array<{ apiId: string; digest: string; }>; }`

Required

## shoalrun.content.ContentManifest.schemaVersion

**Property** `shoalrun.content.ContentManifest.schemaVersion`

```typescript
schemaVersion: 1 | 2
```

**Type:&#x20;**`1 | 2`

Required

## shoalrun.content.ContentMount

**Type** `shoalrun.content.ContentMount`

```typescript
type ContentMount = {
    anchors: readonly ContentAnchor[];
    links: readonly ContentLink[];
    unmount(): void;
};
```

Handles and rewritten routing metadata for one mounted HTML instance.

### Fields

| Name                                                                                                    | Type                                                                                                                  | Required / default | Description                                                         |
| ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------- |
| [`anchors`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentmount-anchors) | `readonly `[`ContentAnchor`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentanchor)`[]` | Required           | Anchors after instance-specific ID rewriting.                       |
| [`links`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentmount-links)     | `readonly `[`ContentLink`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentlink)`[]`     | Required           | Typed links, including rewritten local fragments for this instance. |

### Methods

| Name                                                                                                    | Kind     | Description                                   |
| ------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------- |
| [`unmount`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentmount-unmount) | `method` | Remove nodes that still belong to this mount. |

## shoalrun.content.ContentMount.anchors

**Property** `shoalrun.content.ContentMount.anchors`

```typescript
anchors: readonly ContentAnchor[]
```

Anchors after instance-specific ID rewriting.

**Type:&#x20;**`readonly `[`ContentAnchor`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentanchor)`[]`

Required

## shoalrun.content.ContentMount.links

**Property** `shoalrun.content.ContentMount.links`

```typescript
links: readonly ContentLink[]
```

Typed links, including rewritten local fragments for this instance.

**Type:&#x20;**`readonly `[`ContentLink`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentlink)`[]`

Required

## shoalrun.content.ContentMount.unmount

**Method** `shoalrun.content.ContentMount.unmount`

```typescript
unmount(): void
```

Remove nodes that still belong to this mount.

### Returns

`void`

## shoalrun.content.ContentPublication

**Type** `shoalrun.content.ContentPublication`

```typescript
type ContentPublication = {
    channel: string;
    version: string;
    language: string;
    product?: string;
};
```

Exact documentation publication selected by a content source.

### Fields

| Name                                                                                                            | Type                  | Required / default | Description |
| --------------------------------------------------------------------------------------------------------------- | --------------------- | ------------------ | ----------- |
| [`channel`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentpublication-channel)   | `string`              | Required           | —           |
| [`language`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentpublication-language) | `string`              | Required           | —           |
| [`product`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentpublication-product)   | `string \| undefined` | Optional           | —           |
| [`version`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentpublication-version)   | `string`              | Required           | —           |

## shoalrun.content.ContentPublication.channel

**Property** `shoalrun.content.ContentPublication.channel`

```typescript
channel: string
```

**Type:&#x20;**`string`

Required

## shoalrun.content.ContentPublication.language

**Property** `shoalrun.content.ContentPublication.language`

```typescript
language: string
```

**Type:&#x20;**`string`

Required

## shoalrun.content.ContentPublication.product

**Property** `shoalrun.content.ContentPublication.product`

```typescript
product?: string | undefined
```

**Type:&#x20;**`string | undefined`

Optional

## shoalrun.content.ContentPublication.version

**Property** `shoalrun.content.ContentPublication.version`

```typescript
version: string
```

**Type:&#x20;**`string`

Required

## shoalrun.content.ContentRef

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

## shoalrun.content.ContentRepresentation

**Type** `shoalrun.content.ContentRepresentation`

```typescript
type ContentRepresentation = ContentAsset & {
    anchors: ContentAnchor[];
    links: ContentLink[];
};
```

One portable format, including its file metadata, anchors, and typed links.

### Fields

| Name                                                                                                             | Type                                                                                                       | Required / default | Description |
| ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------ | ----------- |
| [`anchors`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentrepresentation-anchors) | [`ContentAnchor`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentanchor)`[]` | Required           | —           |
| [`links`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentrepresentation-links)     | [`ContentLink`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentlink)`[]`     | Required           | —           |

## shoalrun.content.ContentRepresentation.anchors

**Property** `shoalrun.content.ContentRepresentation.anchors`

```typescript
anchors: ContentAnchor[]
```

**Type:&#x20;**[`ContentAnchor`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentanchor)`[]`

Required

## shoalrun.content.ContentRepresentation.links

**Property** `shoalrun.content.ContentRepresentation.links`

```typescript
links: ContentLink[]
```

**Type:&#x20;**[`ContentLink`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentlink)`[]`

Required

## shoalrun.content.ContentResource

**Type** `shoalrun.content.ContentResource`

```typescript
type ContentResource = {
    ref: ContentRef;
    publication: ContentPublication;
    title: string;
    summary: string;
    type: string;
    canonicalUrl?: string;
    source?: {
        documentId?: string;
        snippetId?: string;
        valuesDigest?: string;
    };
    representations: Partial<Record<ContentFormat, ContentRepresentation>>;
    assets: string[];
    externalDependencies: Array<{
        url: string;
        kind: 'image';
    }>;
};
```

Inventory entry describing one exported document, section, or snippet instance.

### Fields

| Name                                                                                                                                 | Type                                                                                                                                                                                                                                                  | Required / default | Description                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | --------------------------------------------------------------------- |
| [`assets`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentresource-assets)                             | `string[]`                                                                                                                                                                                                                                            | Required           | —                                                                     |
| [`canonicalUrl`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentresource-canonicalurl)                 | `string \| undefined`                                                                                                                                                                                                                                 | Optional           | —                                                                     |
| [`externalDependencies`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentresource-externaldependencies) | `{ url: string; kind: "image"; }[]`                                                                                                                                                                                                                   | Required           | —                                                                     |
| [`publication`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentresource-publication)                   | [`ContentPublication`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentpublication)                                                                                                                                      | Required           | Exact product, channel, version, and documentation language.          |
| [`ref`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentresource-ref)                                   | [`ContentRef`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentref)                                                                                                                                                      | Required           | Stable identity used by ContentSnapshot.get.                          |
| [`representations`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentresource-representations)           | `Partial<Record<`[`ContentFormat`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentformat)`, `[`ContentRepresentation`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentrepresentation)`>>` | Required           | Available portable formats and their files, anchors, and typed links. |
| [`source`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentresource-source)                             | `{ documentId?: string; snippetId?: string; valuesDigest?: string; } \| undefined`                                                                                                                                                                    | Optional           | —                                                                     |
| [`summary`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentresource-summary)                           | `string`                                                                                                                                                                                                                                              | Required           | Short explanation of the resource's purpose.                          |
| [`title`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentresource-title)                               | `string`                                                                                                                                                                                                                                              | Required           | Human-readable resource title.                                        |
| [`type`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentresource-type)                                 | `string`                                                                                                                                                                                                                                              | Required           | Authored document type, or section/snippet for a selected resource.   |

## shoalrun.content.ContentResource.assets

**Property** `shoalrun.content.ContentResource.assets`

```typescript
assets: string[]
```

**Type:&#x20;**`string[]`

Required

## shoalrun.content.ContentResource.canonicalUrl

**Property** `shoalrun.content.ContentResource.canonicalUrl`

```typescript
canonicalUrl?: string | undefined
```

**Type:&#x20;**`string | undefined`

Optional

## shoalrun.content.ContentResource.externalDependencies

**Property** `shoalrun.content.ContentResource.externalDependencies`

```typescript
externalDependencies: { url: string; kind: "image"; }[]
```

**Type:&#x20;**`{ url: string; kind: "image"; }[]`

Required

## shoalrun.content.ContentResource.publication

**Property** `shoalrun.content.ContentResource.publication`

```typescript
publication: ContentPublication
```

Exact product, channel, version, and documentation language.

**Type:&#x20;**[`ContentPublication`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentpublication)

Required

## shoalrun.content.ContentResource.ref

**Property** `shoalrun.content.ContentResource.ref`

```typescript
ref: ContentRef
```

Stable identity used by ContentSnapshot.get.

**Type:&#x20;**[`ContentRef`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentref)

Required

## shoalrun.content.ContentResource.representations

**Property** `shoalrun.content.ContentResource.representations`

```typescript
representations: Partial<Record<ContentFormat, ContentRepresentation>>
```

Available portable formats and their files, anchors, and typed links.

**Type:&#x20;**`Partial<Record<`[`ContentFormat`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentformat)`, `[`ContentRepresentation`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentrepresentation)`>>`

Required

## shoalrun.content.ContentResource.source

**Property** `shoalrun.content.ContentResource.source`

```typescript
source?: { documentId?: string; snippetId?: string; valuesDigest?: string; } | undefined
```

**Type:&#x20;**`{ documentId?: string; snippetId?: string; valuesDigest?: string; } | undefined`

Optional

## shoalrun.content.ContentResource.summary

**Property** `shoalrun.content.ContentResource.summary`

```typescript
summary: string
```

Short explanation of the resource's purpose.

**Type:&#x20;**`string`

Required

## shoalrun.content.ContentResource.title

**Property** `shoalrun.content.ContentResource.title`

```typescript
title: string
```

Human-readable resource title.

**Type:&#x20;**`string`

Required

## shoalrun.content.ContentResource.type

**Property** `shoalrun.content.ContentResource.type`

```typescript
type: string
```

Authored document type, or section/snippet for a selected resource.

**Type:&#x20;**`string`

Required

## shoalrun.content.ContentRestEntry

**Type** `shoalrun.content.ContentRestEntry`

```typescript
type ContentRestEntry = {
    key: string;
    resource: ContentResource;
};
```

One resource inventory entry with its REST lookup key.

### Fields

| Name                                                                                                          | Type                                                                                                       | Required / default | Description |
| ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------ | ----------- |
| [`key`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentrestentry-key)           | `string`                                                                                                   | Required           | —           |
| [`resource`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentrestentry-resource) | [`ContentResource`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentresource) | Required           | —           |

## shoalrun.content.ContentRestEntry.key

**Property** `shoalrun.content.ContentRestEntry.key`

```typescript
key: string
```

**Type:&#x20;**`string`

Required

## shoalrun.content.ContentRestEntry.resource

**Property** `shoalrun.content.ContentRestEntry.resource`

```typescript
resource: ContentResource
```

**Type:&#x20;**[`ContentResource`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentresource)

Required

## shoalrun.content.ContentRestError

**Type** `shoalrun.content.ContentRestError`

```typescript
type ContentRestError = {
    error: {
        code: ContentRestErrorCode;
        message: string;
    };
};
```

JSON error envelope returned by the content REST service.

### Fields

| Name                                                                                                    | Type                                                                                                                                                 | Required / default | Description |
| ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ----------- |
| [`error`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentresterror-error) | `{ code: `[`ContentRestErrorCode`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentresterrorcode)`; message: string; }` | Required           | —           |

## shoalrun.content.ContentRestError.error

**Property** `shoalrun.content.ContentRestError.error`

```typescript
error: { code: ContentRestErrorCode; message: string; }
```

**Type:&#x20;**`{ code: `[`ContentRestErrorCode`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentresterrorcode)`; message: string; }`

Required

## shoalrun.content.ContentRestErrorCode

**Type** `shoalrun.content.ContentRestErrorCode`

```typescript
type ContentRestErrorCode = 'invalid_request' | 'not_found' | 'unsupported_format' | 'stale_revision' | 'method_not_allowed' | 'internal_error';
```

Error categories used by the content REST protocol.

## shoalrun.content.ContentRestList

**Type** `shoalrun.content.ContentRestList`

```typescript
type ContentRestList = {
    schemaVersion: 1 | 2;
    revision: string;
    publication: ContentPublication;
    resources: ContentRestEntry[];
};
```

Revision-scoped inventory envelope returned by the content REST service.

### Fields

| Name                                                                                                                   | Type                                                                                                             | Required / default | Description |
| ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------ | ----------- |
| [`publication`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentrestlist-publication)     | [`ContentPublication`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentpublication) | Required           | —           |
| [`resources`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentrestlist-resources)         | [`ContentRestEntry`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentrestentry)`[]` | Required           | —           |
| [`revision`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentrestlist-revision)           | `string`                                                                                                         | Required           | —           |
| [`schemaVersion`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentrestlist-schemaversion) | `1 \| 2`                                                                                                         | Required           | —           |

## shoalrun.content.ContentRestList.publication

**Property** `shoalrun.content.ContentRestList.publication`

```typescript
publication: ContentPublication
```

**Type:&#x20;**[`ContentPublication`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentpublication)

Required

## shoalrun.content.ContentRestList.resources

**Property** `shoalrun.content.ContentRestList.resources`

```typescript
resources: ContentRestEntry[]
```

**Type:&#x20;**[`ContentRestEntry`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentrestentry)`[]`

Required

## shoalrun.content.ContentRestList.revision

**Property** `shoalrun.content.ContentRestList.revision`

```typescript
revision: string
```

**Type:&#x20;**`string`

Required

## shoalrun.content.ContentRestList.schemaVersion

**Property** `shoalrun.content.ContentRestList.schemaVersion`

```typescript
schemaVersion: 1 | 2
```

**Type:&#x20;**`1 | 2`

Required

## shoalrun.content.ContentRestResource

**Type** `shoalrun.content.ContentRestResource`

```typescript
type ContentRestResource = {
    schemaVersion: 1 | 2;
    revision: string;
    publication: ContentPublication;
    key: string;
    resource: ContentResource;
};
```

Revision-scoped metadata envelope for a single content resource.

### Fields

| Name                                                                                                                       | Type                                                                                                             | Required / default | Description |
| -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------ | ----------- |
| [`key`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentrestresource-key)                     | `string`                                                                                                         | Required           | —           |
| [`publication`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentrestresource-publication)     | [`ContentPublication`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentpublication) | Required           | —           |
| [`resource`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentrestresource-resource)           | [`ContentResource`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentresource)       | Required           | —           |
| [`revision`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentrestresource-revision)           | `string`                                                                                                         | Required           | —           |
| [`schemaVersion`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentrestresource-schemaversion) | `1 \| 2`                                                                                                         | Required           | —           |

## shoalrun.content.ContentRestResource.key

**Property** `shoalrun.content.ContentRestResource.key`

```typescript
key: string
```

**Type:&#x20;**`string`

Required

## shoalrun.content.ContentRestResource.publication

**Property** `shoalrun.content.ContentRestResource.publication`

```typescript
publication: ContentPublication
```

**Type:&#x20;**[`ContentPublication`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentpublication)

Required

## shoalrun.content.ContentRestResource.resource

**Property** `shoalrun.content.ContentRestResource.resource`

```typescript
resource: ContentResource
```

**Type:&#x20;**[`ContentResource`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentresource)

Required

## shoalrun.content.ContentRestResource.revision

**Property** `shoalrun.content.ContentRestResource.revision`

```typescript
revision: string
```

**Type:&#x20;**`string`

Required

## shoalrun.content.ContentRestResource.schemaVersion

**Property** `shoalrun.content.ContentRestResource.schemaVersion`

```typescript
schemaVersion: 1 | 2
```

**Type:&#x20;**`1 | 2`

Required

## shoalrun.content.ContentResult

**Type** `shoalrun.content.ContentResult`

```typescript
type ContentResult = {
    resource: Readonly<ContentResource>;
    representation: Readonly<ContentRepresentation>;
    format: ContentFormat;
    content: string;
    revision: string;
};
```

A fetched representation together with the metadata needed to render or route it.

### Fields

| Name                                                                                                                   | Type                                                                                                                                 | Required / default | Description                                                         |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------ | ------------------------------------------------------------------- |
| [`content`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentresult-content)               | `string`                                                                                                                             | Required           | Validated UTF-8 HTML or Markdown text.                              |
| [`format`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentresult-format)                 | [`ContentFormat`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentformat)                               | Required           | Representation actually returned by the source.                     |
| [`representation`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentresult-representation) | `Readonly<`[`ContentRepresentation`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentrepresentation)`>` | Required           | File, media type, anchors, and typed links for the selected format. |
| [`resource`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentresult-resource)             | `Readonly<`[`ContentResource`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentresource)`>`             | Required           | Inventory entry that was selected by the requested reference.       |
| [`revision`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentresult-revision)             | `string`                                                                                                                             | Required           | Revision shared by this response and its opened content snapshot.   |

## shoalrun.content.ContentResult.content

**Property** `shoalrun.content.ContentResult.content`

```typescript
content: string
```

Validated UTF-8 HTML or Markdown text.

**Type:&#x20;**`string`

Required

## shoalrun.content.ContentResult.format

**Property** `shoalrun.content.ContentResult.format`

```typescript
format: ContentFormat
```

Representation actually returned by the source.

**Type:&#x20;**[`ContentFormat`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentformat)

Required

## shoalrun.content.ContentResult.representation

**Property** `shoalrun.content.ContentResult.representation`

```typescript
representation: Readonly<ContentRepresentation>
```

File, media type, anchors, and typed links for the selected format.

**Type:&#x20;**`Readonly<`[`ContentRepresentation`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentrepresentation)`>`

Required

## shoalrun.content.ContentResult.resource

**Property** `shoalrun.content.ContentResult.resource`

```typescript
resource: Readonly<ContentResource>
```

Inventory entry that was selected by the requested reference.

**Type:&#x20;**`Readonly<`[`ContentResource`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentresource)`>`

Required

## shoalrun.content.ContentResult.revision

**Property** `shoalrun.content.ContentResult.revision`

```typescript
revision: string
```

Revision shared by this response and its opened content snapshot.

**Type:&#x20;**`string`

Required

## shoalrun.content.ContentSnapshot

**Interface** `shoalrun.content.ContentSnapshot`

```typescript
interface ContentSnapshot
```

A client pinned to one immutable inventory revision and publication.

### Fields

| Name                                                                                                               | Type                                                                                                                           | Required / default | Description                                                        |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | ------------------ | ------------------------------------------------------------------ |
| [`publication`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentsnapshot-publication) | `Readonly<`[`ContentPublication`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentpublication)`>` | Required           | Publication shared by every resource available from this snapshot. |
| [`revision`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentsnapshot-revision)       | `string`                                                                                                                       | Required           | Content digest identifying this inventory revision.                |

### Methods

| Name                                                                                                       | Kind     | Description                                                               |
| ---------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------- |
| [`dispose`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentsnapshot-dispose) | `method` | Cancel pending requests and prevent subsequent reads or inventory access. |
| [`get`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentsnapshot-get)         | `method` | Fetch one available representation of a stable content reference.         |
| [`list`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentsnapshot-list)       | `method` | List the resources in the opened inventory without fetching their bodies. |

## shoalrun.content.ContentSnapshot.dispose

**Method** `shoalrun.content.ContentSnapshot.dispose`

```typescript
dispose(): void
```

Cancel pending requests and prevent subsequent reads or inventory access.

### Returns

`void`

## shoalrun.content.ContentSnapshot.get

**Method** `shoalrun.content.ContentSnapshot.get`

```typescript
get(ref: ContentRef, options: { format: ContentFormat; signal?: AbortSignal; }): Promise<ContentResult>
```

Fetch one available representation of a stable content reference.

### Parameters

| Parameter | Type / default                                                                                                                                | Description                                                |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `ref`     | [`ContentRef`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentref)                                              | Page, section, or named snippet instance in this snapshot. |
| `options` | `{ format: `[`ContentFormat`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentformat)`; signal?: AbortSignal; }` | Required format and an optional signal for this read.      |

### Returns

`Promise<`[`ContentResult`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentresult)`>`

Validated representation text with its routing and revision metadata.

## shoalrun.content.ContentSnapshot.list

**Method** `shoalrun.content.ContentSnapshot.list`

```typescript
list(): readonly Readonly<ContentResource>[]
```

List the resources in the opened inventory without fetching their bodies.

### Returns

`readonly Readonly<`[`ContentResource`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentresource)`>[]`

Read-only resource entries for this publication and revision.

## shoalrun.content.ContentSnapshot.publication

**Property** `shoalrun.content.ContentSnapshot.publication`

```typescript
readonly publication: Readonly<ContentPublication>
```

Publication shared by every resource available from this snapshot.

**Type:&#x20;**`Readonly<`[`ContentPublication`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentpublication)`>`

Required

## shoalrun.content.ContentSnapshot.revision

**Property** `shoalrun.content.ContentSnapshot.revision`

```typescript
readonly revision: string
```

Content digest identifying this inventory revision.

**Type:&#x20;**`string`

Required

## shoalrun.content.ManifestContentSourceOptions

**Type** `shoalrun.content.ManifestContentSourceOptions`

```typescript
type ManifestContentSourceOptions = {
    manifestUrl: string | URL;
    fetch?: typeof globalThis.fetch;
    signal?: AbortSignal;
    limits?: ContentDeliveryLimits;
};
```

Configuration for opening a static content-export manifest.

### Fields

| Name                                                                                                                            | Type                                                                                                                                  | Required / default | Description                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ---------------------------------------------------------------------------- |
| [`fetch`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-manifestcontentsourceoptions-fetch)             | `((input: RequestInfo \| URL, init?: RequestInit) => Promise<Response>) \| undefined`                                                 | Optional           | Fetch implementation. Defaults to globalThis.fetch.                          |
| [`limits`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-manifestcontentsourceoptions-limits)           | [`ContentDeliveryLimits`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentdeliverylimits)` \| undefined` | Optional           | Inventory and representation bounds.                                         |
| [`manifestUrl`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-manifestcontentsourceoptions-manifesturl) | `string \| URL`                                                                                                                       | Required           | Manifest URL; a browser resolves relative URLs against its current location. |
| [`signal`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-manifestcontentsourceoptions-signal)           | `AbortSignal \| undefined`                                                                                                            | Optional           | Cancel the opening request. Use get's signal to cancel an individual read.   |

## shoalrun.content.ManifestContentSourceOptions.fetch

**Property** `shoalrun.content.ManifestContentSourceOptions.fetch`

```typescript
fetch?: ((input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) | undefined
```

Fetch implementation. Defaults to globalThis.fetch.

**Type:&#x20;**`((input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) | undefined`

Optional

## shoalrun.content.ManifestContentSourceOptions.limits

**Property** `shoalrun.content.ManifestContentSourceOptions.limits`

```typescript
limits?: ContentDeliveryLimits | undefined
```

Inventory and representation bounds.

**Type:&#x20;**[`ContentDeliveryLimits`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentdeliverylimits)` | undefined`

Optional

## shoalrun.content.ManifestContentSourceOptions.manifestUrl

**Property** `shoalrun.content.ManifestContentSourceOptions.manifestUrl`

```typescript
manifestUrl: string | URL
```

Manifest URL; a browser resolves relative URLs against its current location.

**Type:&#x20;**`string | URL`

Required

## shoalrun.content.ManifestContentSourceOptions.signal

**Property** `shoalrun.content.ManifestContentSourceOptions.signal`

```typescript
signal?: AbortSignal | undefined
```

Cancel the opening request. Use get's signal to cancel an individual read.

**Type:&#x20;**`AbortSignal | undefined`

Optional

## shoalrun.content.RestContentSourceOptions

**Type** `shoalrun.content.RestContentSourceOptions`

```typescript
type RestContentSourceOptions = {
    baseUrl: string | URL;
    publication: ContentPublication;
    revision?: string;
    fetch?: typeof globalThis.fetch;
    signal?: AbortSignal;
    limits?: ContentDeliveryLimits;
};
```

Options for a REST inventory and its revision-pinned resource reads.

### Fields

| Name                                                                                                                        | Type                                                                                                                                  | Required / default | Description                                                                              |
| --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ---------------------------------------------------------------------------------------- |
| [`baseUrl`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-restcontentsourceoptions-baseurl)         | `string \| URL`                                                                                                                       | Required           | REST mount URL, such as /content/v1. Browser requests must use the application's origin. |
| [`fetch`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-restcontentsourceoptions-fetch)             | `((input: RequestInfo \| URL, init?: RequestInit) => Promise<Response>) \| undefined`                                                 | Optional           | Fetch implementation. Defaults to globalThis.fetch.                                      |
| [`limits`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-restcontentsourceoptions-limits)           | [`ContentDeliveryLimits`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentdeliverylimits)` \| undefined` | Optional           | Inventory and representation bounds.                                                     |
| [`publication`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-restcontentsourceoptions-publication) | [`ContentPublication`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentpublication)                      | Required           | Exact publication to request; include product for a product-scoped source.               |
| [`revision`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-restcontentsourceoptions-revision)       | `string \| undefined`                                                                                                                 | Optional           | Expected inventory revision. Omit it to open the current revision.                       |
| [`signal`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-restcontentsourceoptions-signal)           | `AbortSignal \| undefined`                                                                                                            | Optional           | Cancel the inventory-opening request.                                                    |

## shoalrun.content.RestContentSourceOptions.baseUrl

**Property** `shoalrun.content.RestContentSourceOptions.baseUrl`

```typescript
baseUrl: string | URL
```

REST mount URL, such as /content/v1. Browser requests must use the application's origin.

**Type:&#x20;**`string | URL`

Required

## shoalrun.content.RestContentSourceOptions.fetch

**Property** `shoalrun.content.RestContentSourceOptions.fetch`

```typescript
fetch?: ((input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) | undefined
```

Fetch implementation. Defaults to globalThis.fetch.

**Type:&#x20;**`((input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) | undefined`

Optional

## shoalrun.content.RestContentSourceOptions.limits

**Property** `shoalrun.content.RestContentSourceOptions.limits`

```typescript
limits?: ContentDeliveryLimits | undefined
```

Inventory and representation bounds.

**Type:&#x20;**[`ContentDeliveryLimits`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentdeliverylimits)` | undefined`

Optional

## shoalrun.content.RestContentSourceOptions.publication

**Property** `shoalrun.content.RestContentSourceOptions.publication`

```typescript
publication: ContentPublication
```

Exact publication to request; include product for a product-scoped source.

**Type:&#x20;**[`ContentPublication`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentpublication)

Required

## shoalrun.content.RestContentSourceOptions.revision

**Property** `shoalrun.content.RestContentSourceOptions.revision`

```typescript
revision?: string | undefined
```

Expected inventory revision. Omit it to open the current revision.

**Type:&#x20;**`string | undefined`

Optional

## shoalrun.content.RestContentSourceOptions.signal

**Property** `shoalrun.content.RestContentSourceOptions.signal`

```typescript
signal?: AbortSignal | undefined
```

Cancel the inventory-opening request.

**Type:&#x20;**`AbortSignal | undefined`

Optional

## shoalrun.content.contentRefKey

**Function** `shoalrun.content.contentRefKey`

```typescript
contentRefKey(ref: ContentRef): string
```

Serialize a reference to a deterministic key without including publication scope.

### Parameters

| Parameter | Type / default                                                                                   | Description |
| --------- | ------------------------------------------------------------------------------------------------ | ----------- |
| `ref`     | [`ContentRef`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentref) | —           |

### Returns

`string`

## shoalrun.content.contentResourceKey

**Function** `shoalrun.content.contentResourceKey`

```typescript
contentResourceKey(ref: ContentRef): string
```

Public identity only: independent of publication, revision, and export filenames.

### Parameters

| Parameter | Type / default                                                                                   | Description |
| --------- | ------------------------------------------------------------------------------------------------ | ----------- |
| `ref`     | [`ContentRef`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentref) | —           |

### Returns

`string`

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

## shoalrun.content.openManifestContentSource

**Function** `shoalrun.content.openManifestContentSource`

```typescript
openManifestContentSource(options: ManifestContentSourceOptions): Promise<ContentSnapshot>
```

Open and validate one immutable static manifest revision.
The caller owns trust in the compiler output and host. Browser URLs must use
the application's origin. Requests reject redirects and unexpected content types.

### Parameters

| Parameter | Type / default                                                                                                                       | Description                                                     |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| `options` | [`ManifestContentSourceOptions`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-manifestcontentsourceoptions) | Manifest URL, request implementation, cancellation, and limits. |

### Returns

`Promise<`[`ContentSnapshot`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentsnapshot)`>`

A revision-pinned snapshot for listing and reading exported resources.

### Examples

```typescript
const snapshot = await openManifestContentSource({ manifestUrl: '/help/manifest.json' });
const page = await snapshot.get({ kind: 'page', documentId: 'guide.start' }, { format: 'markdown' });
snapshot.dispose();
```

## shoalrun.content.openRestContentSource

**Function** `shoalrun.content.openRestContentSource`

```typescript
openRestContentSource(options: RestContentSourceOptions): Promise<ContentSnapshot>
```

Open a REST inventory and pin subsequent resource reads to its revision.

### Parameters

| Parameter | Type / default                                                                                                               | Description                                                             |
| --------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `options` | [`RestContentSourceOptions`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-restcontentsourceoptions) | REST mount, exact publication, optional revision, and request settings. |

### Returns

`Promise<`[`ContentSnapshot`](https://www.shoalrun.com/content-delivery/sdk/all.md#shoalrun-content-contentsnapshot)`>`

A snapshot with the same list/get/dispose interface as the manifest source.

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
