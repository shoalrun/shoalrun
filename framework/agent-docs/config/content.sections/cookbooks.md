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

## `cookbooks`

Optional mapping of cookbook IDs to a chooser title and ordered reader options. Each option has a unique `id`, `label`, and `doc` ID for a public `type: recipe` page in the same publication as the chooser. The build rejects duplicate options and unavailable targets. Set `mode: single` for alternative goals or use `mode: multiple` (the default) for compatible recipes. Optional option fields `when`, `needs`, and `outcome` explain each choice. The browser loads selected published recipe content in configured order and supports selection links, Markdown downloads, and printing. The [CookbookChooser reference](https://www.shoalrun.com/author/components/cookbook-chooser.md) shows a live example and the HTML and Markdown behavior.

```yaml title="docs.config.yaml"
cookbooks: { $include: ./config/cookbooks.yaml }
```
