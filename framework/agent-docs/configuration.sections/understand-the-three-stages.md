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

## Understand the three stages

Configuration takes effect in three stages:

1. **Resolve configuration.** Read the entry file, load presets and includes, and merge them into one value. Track which file supplied each setting.
2. **Resolve pages.** Apply configured frontmatter defaults, the page's own metadata, and enforced metadata. Validate the resulting page fields.
3. **Build publications.** Select public pages for enabled channel/version/language combinations, resolve links and APIs, then produce HTML, Markdown, and discovery files.

A preset changes configuration. A page default changes metadata. An enabled publication selects an edition to build. These mechanisms have separate rules; changing one does not automatically create pages or translations.

### Find the section you need

Start with the configuration sections that control the behavior you want to change.

| Goal                                           | Configuration sections                              |
| ---------------------------------------------- | --------------------------------------------------- |
| Name the site and locate content               | `site`                                              |
| Choose editions and routes                     | `publications`, `redirects`                         |
| Organize pages and related reading             | `navigation`, `relationships`                       |
| Define page metadata and authoring conventions | `frontmatter`, `metadata`, `templates`, `authoring` |
| Reuse text and semantic content                | `variables`, `snippets`, `callouts`, `badges`       |
| Register local OpenAPI sources and operations  | `apis`                                              |
| Style the site and configure rendering         | `theme`, `outputs`                                  |
| Configure reader views and project checks      | `readerFilters`, `audit`                            |

Every entry config resolves to a YAML mapping with `schemaVersion: 1`. Duplicate YAML keys and unknown top-level settings fail. Nested settings are not all checked for unknown keys, so verify spelling against the reference.
