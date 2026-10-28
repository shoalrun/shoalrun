---
id: guide.content-export
title: Export content into your application
summary: Export selected documentation and assets for your application.
type: how-to
area: publishing
subarea: publishing-builds
canonical: /publish/content-export
---

# Export content into your application

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Publish and maintain > Export content into your application

**Updated: 2026-10-28.**

Parent page: [Full Markdown page](/publish/content-export.md)

Keep application help and your documentation website in one content source. `shoalrun export` produces a directory of resolved Markdown, passive HTML fragments, referenced assets, and a manifest. Your application owns the help drawer, onboarding screen, or other interface that displays the content. It does not need a Shoalrun browser runtime.

## Upgrade an existing integration

If an existing bundle contains `manifest.documents`, upgrade the CLI and rebuild the export before using this guide's loader. Update custom consumers to the resource contract:

- Read `manifest.resources` instead of `manifest.documents`.
- Select page resources with `ref.kind === 'page'` and `ref.documentId` instead of a document's `id`.
- Route links with `kind: resource` through their typed `ref`, rather than `kind: document` and `documentId`.
- Read file paths from the rebuilt manifest; do not retain paths from the old bundle.

The `documents` configuration selector remains shorthand for whole pages. Use [resource selectors](https://www.shoalrun.com/content-delivery/select.md) when selecting approved sections or named snippet instances.
