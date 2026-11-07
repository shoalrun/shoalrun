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
