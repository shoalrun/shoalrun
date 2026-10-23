---
id: guide.configuration
title: Organize project configuration
summary: Learn how Shoalrun resolves config files, layers presets, tracks path
  origins, and applies page defaults before building publications.
type: how-to
area: publishing
subarea: publishing-configuration
canonical: /configuration
---

# Organize project configuration

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Get started > Configure your project

**Updated: 2026-10-23.**

Parent page: [Full Markdown page](/configuration.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [Build separate sites from shared content](https://www.shoalrun.com/publish/single-source-sites.md) — Reuse shared configuration and content for separately selected sites.

`docs.config.yaml` connects your content, presentation, and publication settings. Start with one file, then extract sections or share defaults when several projects need them. This guide explains how those choices interact and how to inspect the result.

Use the [configuration reference](https://www.shoalrun.com/config.md) to look up individual fields. Use [example projects](https://www.shoalrun.com/config/examples.md) for complete configurations you can copy.

## Build several sites from shared content

Separate entry configs can share one content directory and base configuration. Use `site.contentFilter` to select pages by any configured facet, then give each site its own origin, navigation, branding, and output directory. See [build separate sites from shared content](https://www.shoalrun.com/publish/single-source-sites.md) for a complete audience and region example.
