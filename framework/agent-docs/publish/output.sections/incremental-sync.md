---
id: guide.output
title: Publishing and agent representations
summary: Read the published-output contract for HTML, Markdown, manifests, and
  incremental sync.
type: reference
area: publishing
subarea: publishing-builds
canonical: /publish/output
---

# Publishing and agent representations

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Publish > Generated outputs

**Updated: 2026-10-19.**

Parent page: [Full Markdown page](/publish/output.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [Agent-friendly documentation](https://www.shoalrun.com/publish/agent-friendliness.md) — See how these files help agents discover and read the site.

`shoalrun build` turns accepted source pages and local OpenAPI files into a static site. A **publication** is one enabled channel, version, and language combination, such as production, v1, and English. The build includes a public page only in publications matching its frontmatter. It makes no model calls or remote requests.

For each included page, the build writes an HTML page for browsing. It also writes a **Markdown twin**, a generated `.md` copy that agents can read as text. The Markdown twin can start with a short YAML header. That header contains only the page metadata selected in project config, so agents get useful context without a long source header or internal notes. Shared content appears in both bodies; authors can also add content to either format alone with [Only](https://www.shoalrun.com/author/components/only.md).

The site also includes a **document manifest**, `documents.json`, which indexes the built pages and their URLs. Projects with an API source can publish operation pages and **focused contracts**, small OpenAPI files containing one operation and the definitions it needs.

## Incremental sync

`buildId` is a SHA-256 fingerprint of the assembled publication: HTML, Markdown, contracts, assets, and metadata. The compiler hashes route names and bytes in sorted route order before adding the build ID stamps and derived sync snapshot. Identical assembled output produces the same ID. A page edit changes it even when `configDigest` stays the same. Changing an asset or supplied release label also changes it. This identity does not promise byte-identical rendering across platforms.

`documents.json`, `build-info.json`, and `documents.sync.json` carry the same build ID. The sync snapshot contains one record per stable ID and publication variant:

| Field                | Meaning                                                                |
| -------------------- | ---------------------------------------------------------------------- |
| `id`, `variant`      | Page identity, including channel, version, and language.               |
| `url`, `markdownUrl` | Current HTML and Markdown routes.                                      |
| `digest`             | SHA-256 of the exact Markdown bytes.                                   |
| `contentDigest`      | Resolved content fingerprint used for freshness.                       |
| `recordDigest`       | SHA-256 of the canonical JSON manifest record, including its metadata. |

`contentDigest` is an opaque resolved-content change token, not a Markdown byte hash or a semantic-change classification. `recordDigest` hashes the full manifest record, not the smaller sync record. Do not reconstruct it from the sync fields alone. `buildId` is also opaque to consumers: hashing the final output directory does not reproduce the pre-stamp build calculation.

The snapshot's top-level `metadataDigest` covers manifest fields outside the document records, excluding build ID and dependency paths. A changed value tells a client to refresh the full manifest if it needs relationships, operations, redirects, or other global metadata. Canonical JSON sorts object keys and preserves array order.

A client can synchronize without downloading the full manifest on every build:

1. Save `/documents.sync.json` outside the site's output directory. The next build replaces that directory.
2. Poll `/build-info.json`. When its build ID is unchanged, keep the saved snapshot.
3. When the ID changes, fetch `/documents.sync.json`. Compare complete records by ID and publication variant, including routes, `recordDigest`, and `digest`; comparing only `contentDigest` misses changes. Refresh affected metadata when `recordDigest` changes, and fetch added or changed Markdown representations. If `metadataDigest` changes, refresh the manifest when your client uses global metadata. Remove deleted records from the local cache.
4. Verify fetched Markdown bytes against each record's `digest`. A match establishes agreement with the expected representation, not unique membership in one build: identical bytes can occur in multiple builds. A mismatch indicates disagreement; a deployment race is one possible cause. Discard the incomplete update and retry against a matching snapshot. Save the new baseline only after the required resources and metadata have been updated successfully.

The CLI compares two downloaded snapshots:

```sh
shoalrun docs changes current-sync.json --since previous-sync.json
```

It returns `fromBuildId`, `buildId`, `buildChanged`, `metadataChanged`, and `added`, `changed`, and `removed` record arrays. A route move is a change; a removed publication variant is a removal. Metadata-only page changes also appear in `changed`, even if the Markdown digest is unchanged. Asset-only changes can change the build ID with empty page arrays.

These are static files. The host retains no snapshot history and does not interpret `documents.json?since=...`. Clients retain their own baseline. Without one, use the current snapshot as a full initial inventory. A build ID identifies output; it does not archive earlier page bytes or record a build timestamp.
