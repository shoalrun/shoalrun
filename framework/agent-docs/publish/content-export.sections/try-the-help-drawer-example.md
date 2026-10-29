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

**Updated: 2026-10-29.**

Parent page: [Full Markdown page](/publish/content-export.md)

Keep application help and your documentation website in one content source. `shoalrun export` produces a directory of resolved Markdown, passive HTML fragments, referenced assets, and a manifest. Your application owns the help drawer, onboarding screen, or other interface that displays the content. It does not need a Shoalrun browser runtime.

## Try the help-drawer example

The package's `examples/help-drawer` directory contains a small application with two help documents, an image, a diagram, reader sections, tabs, a walkthrough, and a custom component. Copy it into a project with Shoalrun installed, then run from that example directory:

```sh
npx --no-install shoalrun export docs.config.yaml --target app-help --out public/help
node preview.mjs
```

Open `http://127.0.0.1:8774/settings/account`. Choose **Help with API keys**, follow **Billing help** inside the drawer, then follow the API-key link back. The app remains on its settings route. No Shoalrun browser runtime is loaded. The omitted account guide uses the configured example documentation origin; replace that origin and deploy the corresponding docs page for a working external destination.
