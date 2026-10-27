---
id: guide.content-export
title: Export content into your application
summary: Export shared content for application help.
type: how-to
area: publishing
subarea: publishing-builds
canonical: /publish/content-export
---

# Export content into your application

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Publish and maintain > Export content into your application

**Updated: 2026-10-26.**

Parent page: [Full Markdown page](/publish/content-export.md)

Keep application help and your documentation website in one content source. `shoalrun export` produces a directory of resolved Markdown, passive HTML fragments, referenced assets, and a manifest. Your application owns the help drawer, onboarding screen, or other interface that displays the content. It does not need a Shoalrun browser runtime.

## Inspect the manifest

The versioned `manifest.json` identifies documents by ID and publication. It includes titles, summaries, types, eligible canonical URLs, representation paths and digests, typed links, HTML anchor maps, local assets, external image dependencies, and diagnostics. It does not copy raw source frontmatter, configuration, local dependency paths, or browser runtime payloads.

The bundle's `digest` is the SHA-256 of `JSON.stringify` of the parsed manifest with its own `digest` field removed. The `files` list records byte counts and SHA-256 digests for every payload file, including notices. All text is UTF-8. The manifest itself is excluded from that list. Deterministic output lets applications compare bundles and invalidate cached content.
