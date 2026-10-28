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

## Check the result

Check the app from a route unrelated to the export mount. Confirm that images load, document links stay in the drawer when intercepted, canonical links open the website, and all expected content is visible. Re-export after changing source content, and distribute the updated bundle with the application.
