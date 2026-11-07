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

**Module** `shoalrun.content`

## Functions

| Name                                                                                                                               | Kind       | Description                                                                                                                                                                                                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`contentRefKey`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentrefkey)                         | `function` | Serialize a reference to a deterministic key without including publication scope.                                                                                                                                                             |
| [`contentResourceKey`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentresourcekey)               | `function` | Public identity only: independent of publication, revision, and export filenames.                                                                                                                                                             |
| [`mountContent`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-mountcontent)                           | `function` | Mount trusted compiler HTML with instance-specific anchor and accessibility IDs. This is not a sanitizer. The result must come from trusted compiler output. The mount replaces the container's children and rewrites local routing metadata. |
| [`openManifestContentSource`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-openmanifestcontentsource) | `function` | Open and validate one immutable static manifest revision. The caller owns trust in the compiler output and host. Browser URLs must use the application's origin. Requests reject redirects and unexpected content types.                      |
| [`openRestContentSource`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-openrestcontentsource)         | `function` | Open a REST inventory and pin subsequent resource reads to its revision.                                                                                                                                                                      |
| [`validateContentManifest`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-validatecontentmanifest)     | `function` | Validate a parsed manifest's shape, identities, paths, and resource bounds. This assertion narrows the value but doesn't verify fetched file bytes or trust in a host.                                                                        |

## Members

| Name                                                                                                                                     | Kind        | Description                                                                                                                                                    |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`ContentAnchor`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentanchor)                               | `type`      | Mapping from a canonical document fragment to its exported HTML ID.                                                                                            |
| [`ContentAsset`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentasset)                                 | `type`      | A content-addressed file with its declared media type.                                                                                                         |
| [`ContentDeliveryError`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentdeliveryerror)                 | `class`     | Delivery failure with a machine-readable code and a human-readable message.                                                                                    |
| [`ContentDeliveryLimits`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentdeliverylimits)               | `type`      | Positive safe-integer bounds applied when opening and reading content.                                                                                         |
| [`ContentErrorCode`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contenterrorcode)                         | `type`      | Stable error categories raised by content-source validation and reads.                                                                                         |
| [`ContentFile`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentfile)                                   | `type`      | Export-relative file path, byte length, and SHA-256 digest.                                                                                                    |
| [`ContentFormat`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentformat)                               | `type`      | Portable representations a content client can request.                                                                                                         |
| [`ContentLink`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentlink)                                   | `type`      | Classified link and optional resource identity for application routing.                                                                                        |
| [`ContentManifest`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentmanifest)                           | `type`      | One validated, content-addressed export inventory.                                                                                                             |
| [`ContentMount`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentmount)                                 | `type`      | Handles and rewritten routing metadata for one mounted HTML instance.                                                                                          |
| [`ContentPublication`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentpublication)                     | `type`      | Exact documentation publication selected by a content source.                                                                                                  |
| [`ContentRef`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentref)                                     | `type`      | Stable identity of a page, a section within a page, or a named snippet instance. A reference is scoped to the publication and revision of the opened snapshot. |
| [`ContentRepresentation`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentrepresentation)               | `type`      | One portable format, including its file metadata, anchors, and typed links.                                                                                    |
| [`ContentResource`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentresource)                           | `type`      | Inventory entry describing one exported document, section, or snippet instance.                                                                                |
| [`ContentRestEntry`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentrestentry)                         | `type`      | One resource inventory entry with its REST lookup key.                                                                                                         |
| [`ContentRestError`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentresterror)                         | `type`      | JSON error envelope returned by the content REST service.                                                                                                      |
| [`ContentRestErrorCode`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentresterrorcode)                 | `type`      | Error categories used by the content REST protocol.                                                                                                            |
| [`ContentRestList`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentrestlist)                           | `type`      | Revision-scoped inventory envelope returned by the content REST service.                                                                                       |
| [`ContentRestResource`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentrestresource)                   | `type`      | Revision-scoped metadata envelope for a single content resource.                                                                                               |
| [`ContentResult`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentresult)                               | `type`      | A fetched representation together with the metadata needed to render or route it.                                                                              |
| [`ContentSnapshot`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentsnapshot)                           | `interface` | A client pinned to one immutable inventory revision and publication.                                                                                           |
| [`ManifestContentSourceOptions`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-manifestcontentsourceoptions) | `type`      | Configuration for opening a static content-export manifest.                                                                                                    |
| [`RestContentSourceOptions`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-restcontentsourceoptions)         | `type`      | Options for a REST inventory and its revision-pinned resource reads.                                                                                           |

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

| Name                                                                                        | Type                  | Required / default | Description |
| ------------------------------------------------------------------------------------------- | --------------------- | ------------------ | ----------- |
| [`exportedId`](https://www.shoalrun.com/content-delivery/sdk/content-anchor/exported-id.md) | `string`              | Required           | —           |
| [`id`](https://www.shoalrun.com/content-delivery/sdk/content-anchor/id.md)                  | `string`              | Required           | —           |
| [`title`](https://www.shoalrun.com/content-delivery/sdk/content-anchor/title.md)            | `string \| undefined` | Optional           | —           |

## shoalrun.content.ContentAsset

**Type** `shoalrun.content.ContentAsset`

```typescript
type ContentAsset = ContentFile & {
    mediaType: string;
};
```

A content-addressed file with its declared media type.

### Fields

| Name                                                                                     | Type     | Required / default | Description |
| ---------------------------------------------------------------------------------------- | -------- | ------------------ | ----------- |
| [`mediaType`](https://www.shoalrun.com/content-delivery/sdk/content-asset/media-type.md) | `string` | Required           | —           |

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

| Name                                                                                   | Type                                                                                                             | Required / default | Description |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------ | ----------- |
| [`code`](https://www.shoalrun.com/content-delivery/sdk/content-delivery-error/code.md) | [`ContentErrorCode`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contenterrorcode) | Required           | —           |

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

| Name                                                                                                       | Type                  | Required / default | Description                                                            |
| ---------------------------------------------------------------------------------------------------------- | --------------------- | ------------------ | ---------------------------------------------------------------------- |
| [`manifestBytes`](https://www.shoalrun.com/content-delivery/sdk/content-delivery-limits/manifest-bytes.md) | `number \| undefined` | Optional           | Maximum manifest or REST inventory bytes. Defaults to 5,000,000.       |
| [`resourceBytes`](https://www.shoalrun.com/content-delivery/sdk/content-delivery-limits/resource-bytes.md) | `number \| undefined` | Optional           | Maximum bytes for an individual representation. Defaults to 8,000,000. |
| [`resources`](https://www.shoalrun.com/content-delivery/sdk/content-delivery-limits/resources.md)          | `number \| undefined` | Optional           | Maximum resource count in the inventory. Defaults to 10,000.           |

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

| Name                                                                             | Type     | Required / default | Description |
| -------------------------------------------------------------------------------- | -------- | ------------------ | ----------- |
| [`bytes`](https://www.shoalrun.com/content-delivery/sdk/content-file/bytes.md)   | `number` | Required           | —           |
| [`digest`](https://www.shoalrun.com/content-delivery/sdk/content-file/digest.md) | `string` | Required           | —           |
| [`path`](https://www.shoalrun.com/content-delivery/sdk/content-file/path.md)     | `string` | Required           | —           |

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

| Name                                                                                 | Type                                                                                                                | Required / default | Description |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ------------------ | ----------- |
| [`asset`](https://www.shoalrun.com/content-delivery/sdk/content-link/asset.md)       | `string \| undefined`                                                                                               | Optional           | —           |
| [`fragment`](https://www.shoalrun.com/content-delivery/sdk/content-link/fragment.md) | `string \| undefined`                                                                                               | Optional           | —           |
| [`href`](https://www.shoalrun.com/content-delivery/sdk/content-link/href.md)         | `string`                                                                                                            | Required           | —           |
| [`key`](https://www.shoalrun.com/content-delivery/sdk/content-link/key.md)           | `string`                                                                                                            | Required           | —           |
| [`kind`](https://www.shoalrun.com/content-delivery/sdk/content-link/kind.md)         | `"resource" \| "canonical" \| "external" \| "asset"`                                                                | Required           | —           |
| [`query`](https://www.shoalrun.com/content-delivery/sdk/content-link/query.md)       | `string \| undefined`                                                                                               | Optional           | —           |
| [`ref`](https://www.shoalrun.com/content-delivery/sdk/content-link/ref.md)           | [`ContentRef`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentref)` \| undefined` | Optional           | —           |

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

| Name                                                                                                | Type                                                                                                                 | Required / default | Description |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------ | ----------- |
| [`assets`](https://www.shoalrun.com/content-delivery/sdk/content-manifest/assets.md)                | [`ContentAsset`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentasset)`[]`         | Required           | —           |
| [`diagnostics`](https://www.shoalrun.com/content-delivery/sdk/content-manifest/diagnostics.md)      | `{ code: string; documentId?: string; message: string; }[]`                                                          | Required           | —           |
| [`digest`](https://www.shoalrun.com/content-delivery/sdk/content-manifest/digest.md)                | `string`                                                                                                             | Required           | —           |
| [`files`](https://www.shoalrun.com/content-delivery/sdk/content-manifest/files.md)                  | [`ContentFile`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentfile)`[]`           | Required           | —           |
| [`kind`](https://www.shoalrun.com/content-delivery/sdk/content-manifest/kind.md)                    | `"shoalrun-content-export"`                                                                                          | Required           | —           |
| [`publicBase`](https://www.shoalrun.com/content-delivery/sdk/content-manifest/public-base.md)       | `string`                                                                                                             | Required           | —           |
| [`publication`](https://www.shoalrun.com/content-delivery/sdk/content-manifest/publication.md)      | [`ContentPublication`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentpublication) | Required           | —           |
| [`resources`](https://www.shoalrun.com/content-delivery/sdk/content-manifest/resources.md)          | [`ContentResource`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentresource)`[]`   | Required           | —           |
| [`review`](https://www.shoalrun.com/content-delivery/sdk/content-manifest/review.md)                | `{ status: "ok" \| "required"; apis: Array<{ apiId: string; digest: string; }>; }`                                   | Required           | —           |
| [`schemaVersion`](https://www.shoalrun.com/content-delivery/sdk/content-manifest/schema-version.md) | `1 \| 2`                                                                                                             | Required           | —           |

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

| Name                                                                                | Type                                                                                                                      | Required / default | Description                                                         |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------- |
| [`anchors`](https://www.shoalrun.com/content-delivery/sdk/content-mount/anchors.md) | `readonly `[`ContentAnchor`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentanchor)`[]` | Required           | Anchors after instance-specific ID rewriting.                       |
| [`links`](https://www.shoalrun.com/content-delivery/sdk/content-mount/links.md)     | `readonly `[`ContentLink`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentlink)`[]`     | Required           | Typed links, including rewritten local fragments for this instance. |

### Methods

| Name                                                                                | Kind     | Description                                   |
| ----------------------------------------------------------------------------------- | -------- | --------------------------------------------- |
| [`unmount`](https://www.shoalrun.com/content-delivery/sdk/content-mount/unmount.md) | `method` | Remove nodes that still belong to this mount. |

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

| Name                                                                                        | Type                  | Required / default | Description |
| ------------------------------------------------------------------------------------------- | --------------------- | ------------------ | ----------- |
| [`channel`](https://www.shoalrun.com/content-delivery/sdk/content-publication/channel.md)   | `string`              | Required           | —           |
| [`language`](https://www.shoalrun.com/content-delivery/sdk/content-publication/language.md) | `string`              | Required           | —           |
| [`product`](https://www.shoalrun.com/content-delivery/sdk/content-publication/product.md)   | `string \| undefined` | Optional           | —           |
| [`version`](https://www.shoalrun.com/content-delivery/sdk/content-publication/version.md)   | `string`              | Required           | —           |

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

| Name                                                                                         | Type                                                                                                           | Required / default | Description |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------ | ----------- |
| [`anchors`](https://www.shoalrun.com/content-delivery/sdk/content-representation/anchors.md) | [`ContentAnchor`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentanchor)`[]` | Required           | —           |
| [`links`](https://www.shoalrun.com/content-delivery/sdk/content-representation/links.md)     | [`ContentLink`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentlink)`[]`     | Required           | —           |

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

| Name                                                                                                              | Type                                                                                                                                                                                                                                                          | Required / default | Description                                                           |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | --------------------------------------------------------------------- |
| [`assets`](https://www.shoalrun.com/content-delivery/sdk/content-resource/assets.md)                              | `string[]`                                                                                                                                                                                                                                                    | Required           | —                                                                     |
| [`canonicalUrl`](https://www.shoalrun.com/content-delivery/sdk/content-resource/canonical-url.md)                 | `string \| undefined`                                                                                                                                                                                                                                         | Optional           | —                                                                     |
| [`externalDependencies`](https://www.shoalrun.com/content-delivery/sdk/content-resource/external-dependencies.md) | `{ url: string; kind: "image"; }[]`                                                                                                                                                                                                                           | Required           | —                                                                     |
| [`publication`](https://www.shoalrun.com/content-delivery/sdk/content-resource/publication.md)                    | [`ContentPublication`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentpublication)                                                                                                                                          | Required           | Exact product, channel, version, and documentation language.          |
| [`ref`](https://www.shoalrun.com/content-delivery/sdk/content-resource/ref.md)                                    | [`ContentRef`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentref)                                                                                                                                                          | Required           | Stable identity used by ContentSnapshot.get.                          |
| [`representations`](https://www.shoalrun.com/content-delivery/sdk/content-resource/representations.md)            | `Partial<Record<`[`ContentFormat`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentformat)`, `[`ContentRepresentation`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentrepresentation)`>>` | Required           | Available portable formats and their files, anchors, and typed links. |
| [`source`](https://www.shoalrun.com/content-delivery/sdk/content-resource/source.md)                              | `{ documentId?: string; snippetId?: string; valuesDigest?: string; } \| undefined`                                                                                                                                                                            | Optional           | —                                                                     |
| [`summary`](https://www.shoalrun.com/content-delivery/sdk/content-resource/summary.md)                            | `string`                                                                                                                                                                                                                                                      | Required           | Short explanation of the resource's purpose.                          |
| [`title`](https://www.shoalrun.com/content-delivery/sdk/content-resource/title.md)                                | `string`                                                                                                                                                                                                                                                      | Required           | Human-readable resource title.                                        |
| [`type`](https://www.shoalrun.com/content-delivery/sdk/content-resource/type.md)                                  | `string`                                                                                                                                                                                                                                                      | Required           | Authored document type, or section/snippet for a selected resource.   |

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

| Name                                                                                       | Type                                                                                                           | Required / default | Description |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- | ------------------ | ----------- |
| [`key`](https://www.shoalrun.com/content-delivery/sdk/content-rest-entry/key.md)           | `string`                                                                                                       | Required           | —           |
| [`resource`](https://www.shoalrun.com/content-delivery/sdk/content-rest-entry/resource.md) | [`ContentResource`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentresource) | Required           | —           |

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

| Name                                                                                 | Type                                                                                                                                                     | Required / default | Description |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ----------- |
| [`error`](https://www.shoalrun.com/content-delivery/sdk/content-rest-error/error.md) | `{ code: `[`ContentRestErrorCode`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentresterrorcode)`; message: string; }` | Required           | —           |

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

| Name                                                                                                 | Type                                                                                                                 | Required / default | Description |
| ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------ | ----------- |
| [`publication`](https://www.shoalrun.com/content-delivery/sdk/content-rest-list/publication.md)      | [`ContentPublication`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentpublication) | Required           | —           |
| [`resources`](https://www.shoalrun.com/content-delivery/sdk/content-rest-list/resources.md)          | [`ContentRestEntry`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentrestentry)`[]` | Required           | —           |
| [`revision`](https://www.shoalrun.com/content-delivery/sdk/content-rest-list/revision.md)            | `string`                                                                                                             | Required           | —           |
| [`schemaVersion`](https://www.shoalrun.com/content-delivery/sdk/content-rest-list/schema-version.md) | `1 \| 2`                                                                                                             | Required           | —           |

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

| Name                                                                                                     | Type                                                                                                                 | Required / default | Description |
| -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------ | ----------- |
| [`key`](https://www.shoalrun.com/content-delivery/sdk/content-rest-resource/key.md)                      | `string`                                                                                                             | Required           | —           |
| [`publication`](https://www.shoalrun.com/content-delivery/sdk/content-rest-resource/publication.md)      | [`ContentPublication`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentpublication) | Required           | —           |
| [`resource`](https://www.shoalrun.com/content-delivery/sdk/content-rest-resource/resource.md)            | [`ContentResource`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentresource)       | Required           | —           |
| [`revision`](https://www.shoalrun.com/content-delivery/sdk/content-rest-resource/revision.md)            | `string`                                                                                                             | Required           | —           |
| [`schemaVersion`](https://www.shoalrun.com/content-delivery/sdk/content-rest-resource/schema-version.md) | `1 \| 2`                                                                                                             | Required           | —           |

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

| Name                                                                                               | Type                                                                                                                                     | Required / default | Description                                                         |
| -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------- |
| [`content`](https://www.shoalrun.com/content-delivery/sdk/content-result/content.md)               | `string`                                                                                                                                 | Required           | Validated UTF-8 HTML or Markdown text.                              |
| [`format`](https://www.shoalrun.com/content-delivery/sdk/content-result/format.md)                 | [`ContentFormat`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentformat)                               | Required           | Representation actually returned by the source.                     |
| [`representation`](https://www.shoalrun.com/content-delivery/sdk/content-result/representation.md) | `Readonly<`[`ContentRepresentation`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentrepresentation)`>` | Required           | File, media type, anchors, and typed links for the selected format. |
| [`resource`](https://www.shoalrun.com/content-delivery/sdk/content-result/resource.md)             | `Readonly<`[`ContentResource`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentresource)`>`             | Required           | Inventory entry that was selected by the requested reference.       |
| [`revision`](https://www.shoalrun.com/content-delivery/sdk/content-result/revision.md)             | `string`                                                                                                                                 | Required           | Revision shared by this response and its opened content snapshot.   |

## shoalrun.content.ContentSnapshot

**Interface** `shoalrun.content.ContentSnapshot`

```typescript
interface ContentSnapshot
```

A client pinned to one immutable inventory revision and publication.

### Fields

| Name                                                                                           | Type                                                                                                                               | Required / default | Description                                                        |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------ |
| [`publication`](https://www.shoalrun.com/content-delivery/sdk/content-snapshot/publication.md) | `Readonly<`[`ContentPublication`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentpublication)`>` | Required           | Publication shared by every resource available from this snapshot. |
| [`revision`](https://www.shoalrun.com/content-delivery/sdk/content-snapshot/revision.md)       | `string`                                                                                                                           | Required           | Content digest identifying this inventory revision.                |

### Methods

| Name                                                                                   | Kind     | Description                                                               |
| -------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------- |
| [`dispose`](https://www.shoalrun.com/content-delivery/sdk/content-snapshot/dispose.md) | `method` | Cancel pending requests and prevent subsequent reads or inventory access. |
| [`get`](https://www.shoalrun.com/content-delivery/sdk/content-snapshot/get.md)         | `method` | Fetch one available representation of a stable content reference.         |
| [`list`](https://www.shoalrun.com/content-delivery/sdk/content-snapshot/list.md)       | `method` | List the resources in the opened inventory without fetching their bodies. |

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

| Name                                                                                                           | Type                                                                                                                                      | Required / default | Description                                                                  |
| -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ---------------------------------------------------------------------------- |
| [`fetch`](https://www.shoalrun.com/content-delivery/sdk/manifest-content-source-options/fetch.md)              | `((input: RequestInfo \| URL, init?: RequestInit) => Promise<Response>) \| undefined`                                                     | Optional           | Fetch implementation. Defaults to globalThis.fetch.                          |
| [`limits`](https://www.shoalrun.com/content-delivery/sdk/manifest-content-source-options/limits.md)            | [`ContentDeliveryLimits`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentdeliverylimits)` \| undefined` | Optional           | Inventory and representation bounds.                                         |
| [`manifestUrl`](https://www.shoalrun.com/content-delivery/sdk/manifest-content-source-options/manifest-url.md) | `string \| URL`                                                                                                                           | Required           | Manifest URL; a browser resolves relative URLs against its current location. |
| [`signal`](https://www.shoalrun.com/content-delivery/sdk/manifest-content-source-options/signal.md)            | `AbortSignal \| undefined`                                                                                                                | Optional           | Cancel the opening request. Use get's signal to cancel an individual read.   |

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

| Name                                                                                                      | Type                                                                                                                                      | Required / default | Description                                                                              |
| --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ---------------------------------------------------------------------------------------- |
| [`baseUrl`](https://www.shoalrun.com/content-delivery/sdk/rest-content-source-options/base-url.md)        | `string \| URL`                                                                                                                           | Required           | REST mount URL, such as /content/v1. Browser requests must use the application's origin. |
| [`fetch`](https://www.shoalrun.com/content-delivery/sdk/rest-content-source-options/fetch.md)             | `((input: RequestInfo \| URL, init?: RequestInit) => Promise<Response>) \| undefined`                                                     | Optional           | Fetch implementation. Defaults to globalThis.fetch.                                      |
| [`limits`](https://www.shoalrun.com/content-delivery/sdk/rest-content-source-options/limits.md)           | [`ContentDeliveryLimits`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentdeliverylimits)` \| undefined` | Optional           | Inventory and representation bounds.                                                     |
| [`publication`](https://www.shoalrun.com/content-delivery/sdk/rest-content-source-options/publication.md) | [`ContentPublication`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentpublication)                      | Required           | Exact publication to request; include product for a product-scoped source.               |
| [`revision`](https://www.shoalrun.com/content-delivery/sdk/rest-content-source-options/revision.md)       | `string \| undefined`                                                                                                                     | Optional           | Expected inventory revision. Omit it to open the current revision.                       |
| [`signal`](https://www.shoalrun.com/content-delivery/sdk/rest-content-source-options/signal.md)           | `AbortSignal \| undefined`                                                                                                                | Optional           | Cancel the inventory-opening request.                                                    |

## shoalrun.content.contentRefKey

**Function** `shoalrun.content.contentRefKey`

```typescript
contentRefKey(ref: ContentRef): string
```

Serialize a reference to a deterministic key without including publication scope.

### Parameters

| Parameter | Type / default                                                                                       | Description |
| --------- | ---------------------------------------------------------------------------------------------------- | ----------- |
| `ref`     | [`ContentRef`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentref) | —           |

### Returns

`string`

## shoalrun.content.contentResourceKey

**Function** `shoalrun.content.contentResourceKey`

```typescript
contentResourceKey(ref: ContentRef): string
```

Public identity only: independent of publication, revision, and export filenames.

### Parameters

| Parameter | Type / default                                                                                       | Description |
| --------- | ---------------------------------------------------------------------------------------------------- | ----------- |
| `ref`     | [`ContentRef`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentref) | —           |

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

| Parameter   | Type / default                                                                                             | Description                                                        |
| ----------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `container` | `Element`                                                                                                  | DOM element receiving the content.                                 |
| `result`    | [`ContentResult`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentresult) | A validated HTML representation; Markdown results aren't accepted. |
| `options`   | `{ instanceId?: string; signal?: AbortSignal; } \| undefined`                                              | Optional unique instance ID and cancellation signal.               |

### Returns

[`ContentMount`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentmount)

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

| Parameter | Type / default                                                                                                                           | Description                                                     |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `options` | [`ManifestContentSourceOptions`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-manifestcontentsourceoptions) | Manifest URL, request implementation, cancellation, and limits. |

### Returns

`Promise<`[`ContentSnapshot`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentsnapshot)`>`

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

| Parameter | Type / default                                                                                                                   | Description                                                             |
| --------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `options` | [`RestContentSourceOptions`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-restcontentsourceoptions) | REST mount, exact publication, optional revision, and request settings. |

### Returns

`Promise<`[`ContentSnapshot`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentsnapshot)`>`

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
