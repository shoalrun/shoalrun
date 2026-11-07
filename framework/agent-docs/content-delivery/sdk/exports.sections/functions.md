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

## Functions

| Name                                                                                                                               | Kind       | Description                                                                                                                                                                                                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`contentRefKey`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentrefkey)                         | `function` | Serialize a reference to a deterministic key without including publication scope.                                                                                                                                                             |
| [`contentResourceKey`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-contentresourcekey)               | `function` | Public identity only: independent of publication, revision, and export filenames.                                                                                                                                                             |
| [`mountContent`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-mountcontent)                           | `function` | Mount trusted compiler HTML with instance-specific anchor and accessibility IDs. This is not a sanitizer. The result must come from trusted compiler output. The mount replaces the container's children and rewrites local routing metadata. |
| [`openManifestContentSource`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-openmanifestcontentsource) | `function` | Open and validate one immutable static manifest revision. The caller owns trust in the compiler output and host. Browser URLs must use the application's origin. Requests reject redirects and unexpected content types.                      |
| [`openRestContentSource`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-openrestcontentsource)         | `function` | Open a REST inventory and pin subsequent resource reads to its revision.                                                                                                                                                                      |
| [`validateContentManifest`](https://www.shoalrun.com/content-delivery/sdk/exports.md#shoalrun-content-validatecontentmanifest)     | `function` | Validate a parsed manifest's shape, identities, paths, and resource bounds. This assertion narrows the value but doesn't verify fetched file bytes or trust in a host.                                                                        |
