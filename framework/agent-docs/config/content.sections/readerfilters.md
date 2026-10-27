---
id: reference.config-content
title: Authoring and content settings
summary: Configure authoring guidance, page defaults, reusable content, reading
  paths, and reader views.
type: reference
area: publishing
subarea: publishing-configuration
canonical: /config/content
---

# Authoring and content settings

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Reference > Configuration reference > Authoring and content

**Updated: 2026-10-27.**

Parent page: [Full Markdown page](/config/content.md)

**Page reading path** — these links apply to the full page.

**Read first**

- [Organize project configuration](https://www.shoalrun.com/configuration.md) — Learn how files combine and how to validate configuration changes.

Configure authoring guidance, page defaults, reusable content, reading paths, and reader views. These keys belong in `docs.config.yaml` or an included configuration file. For file composition and validation commands, see [Configure your project](https://www.shoalrun.com/configuration.md). Use the [configuration index](https://www.shoalrun.com/config.md) to find another setting.

## `readerFilters`

Optional reader views for one site. `facets` maps each stable facet ID to a reader-facing `label` and an `options` map of stable choice IDs to labels. `typeDefaults` optionally marks all pages of a document type unless a page supplies a value for that facet. `controls` selects sidebar and header pickers; `module` names a local browser module for custom controls. The first visit shows all content. See [reader views](https://www.shoalrun.com/author/reader-views.md) for page and section marks, controls, saved choices, and share links.

```yaml title="docs.config.yaml"
readerFilters:
  facets:
    audience:
      label: Reader
      options: { ui: Use the UI, developer: Build with the API }
  typeDefaults:
    api-reference: { audience: [developer] }
```
