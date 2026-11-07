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
