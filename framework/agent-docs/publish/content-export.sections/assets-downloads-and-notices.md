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

## Assets, downloads, and notices

Local assets must be inside the content directory or an explicitly configured `assetRoots` directory. Roots and notice paths resolve relative to the config file that declares them:

```yaml
exports:
  app-help:
    documents: [guide.api-keys, guide.billing]
    publicBase: /help/
    assetRoots: [./downloads]
    notices: [./CONTENT-LICENSE.txt]
```

Supported files include PNG, JPEG, GIF, WebP, AVIF, passive SVG, PDF, plain text, CSV, JSON, and YAML. Local assets use content-hashed paths. Unsupported asset types, missing files, symlink escapes, active SVG, and unresolved local links fail the export. Asset directories are not copied wholesale. Self-contained focused OpenAPI downloads are included when referenced.

Remote images are not downloaded. The manifest records them in each resource's `externalDependencies`, and the command reports them in diagnostics. A document with a remote image is not offline-complete. Explicit notice files and applicable diagram-renderer notices are retained in `NOTICES.txt`.
