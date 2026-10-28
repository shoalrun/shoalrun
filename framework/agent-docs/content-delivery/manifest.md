---
id: reference.content-manifest
title: Content manifest
summary: Look up resource references, representations, assets, revision digests,
  and export diagnostics.
type: reference
area: publishing
subarea: publishing-content-delivery
subjectLifecycle: in-development
canonical: /content-delivery/manifest
---

# Content manifest

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Reference](https://www.shoalrun.com/.well-known/shoalrun/navigation/reference-tab-50f26fe22670.txt) (ID: reference-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Reference](https://www.shoalrun.com/cli.md) > Content delivery > Content manifest

**Updated: 2026-10-28.**

**Status: In development.**

`manifest.json` is the entry point for a content export. The resource-aware implementation uses `kind: shoalrun-content-export`, `schemaVersion: 1`, and a `resources` array. Earlier whole-page exports use a `documents` array; rebuild those exports before opening them with the resource client.

## Bundle fields

These fields describe the complete export and its publication.

| Field         | Meaning                                                              |
| ------------- | -------------------------------------------------------------------- |
| `digest`      | Revision digest for the bundle manifest                              |
| `publicBase`  | Root-relative serving mount with a trailing slash                    |
| `publication` | One channel, version, and language                                   |
| `review`      | API source-review status and digests                                 |
| `resources`   | Selected pages, sections, and snippet instances                      |
| `assets`      | Local asset records                                                  |
| `files`       | Exported file paths, sizes, and digests                              |
| `diagnostics` | Export findings such as external images or static interaction output |

A review status of `required` identifies a review candidate. Do not serve it as an approved content release.

## Resource fields

Each resource has `ref`, `publication`, `title`, `summary`, `type`, `representations`, `assets`, and `externalDependencies`. A `canonicalUrl` or source metadata may also be present.

```json
{
  "kind": "section",
  "documentId": "guide.billing",
  "sectionId": "refunds"
}
```

This is a section's `ref`, not a complete manifest. Page references use `kind` and `documentId`; snippet-instance references use `kind` and `id`. Identity is scoped to the publication. A title or generated filename is not a resource reference.

## Representations and links

Each available `html` or `markdown` representation declares `path`, `mediaType`, `bytes`, `digest`, `anchors`, and `links`. Paths point to files under the export mount. Anchors map source IDs to exported DOM IDs. Link records distinguish `resource`, `canonical`, `external`, and `asset` targets; resource links include a typed reference.

A resource's asset list names local dependencies. `externalDependencies` identifies remote images that were not copied. Distribute `NOTICES.txt` and any required attribution with the content.

## Validate a consumer

Use the content client or validate the manifest before fetching its declared paths. Unknown references and unavailable formats are errors. Check representation bytes and digest against the opened revision. Do not assume that a valid digest makes an untrusted host or its HTML safe.

## HTML, Markdown, and agents

The manifest records each representation separately because anchors, links, and rendered bytes can differ. It supplies IDs and revision context without inserting machine labels into ordinary Markdown headings. An agent can select Markdown by a resource reference while an application selects HTML from the same revision.

## Related reading

### Read first

- [Content delivery](https://www.shoalrun.com/content-delivery.md) — Understand resource delivery and its application boundary. (Status: in development.)

### Related topics

- [Publish and update content](https://www.shoalrun.com/content-delivery/publish.md) — Inspect revision and representation metadata. (Status: in development.)
