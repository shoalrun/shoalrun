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

Navigation section: [Reference](https://www.shoalrun.com/.well-known/shoalrun/navigation/reference-tab-50f26fe22670.txt) (ID: reference-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Reference](https://www.shoalrun.com/cli.md) > Configuration reference > Authoring and content

**Updated: 2026-10-27.**

Parent page: [Full Markdown page](/config/content.md)

**Page reading path** — these links apply to the full page.

**Read first**

- [Organize project configuration](https://www.shoalrun.com/configuration.md) — Learn how files combine and how to validate configuration changes.

Configure authoring guidance, page defaults, reusable content, reading paths, and reader views. These keys belong in `docs.config.yaml` or an included configuration file. For file composition and validation commands, see [Configure your project](https://www.shoalrun.com/configuration.md). Use the [configuration index](https://www.shoalrun.com/config.md) to find another setting.

## `templates`

An optional mapping from template ID to `{ type, body, required }`. Built-in templates need no registration; reuse a built-in ID to override it or add a custom ID. `type` becomes the new page's `type`, and `body` is a `.md` or `.mdx` file that can open with commented frontmatter. The only `required` value is `operations`. See [templates](https://www.shoalrun.com/author/templates.md).

```yaml title="config/templates.yaml"
how-to:
  type: how-to
  body: ../templates/how-to.mdx
```

Override the built-in API reference while retaining its operation requirement:

```yaml title="config/templates.yaml"
api-reference:
  type: api-reference
  body: ../templates/api-reference.mdx
  required: [operations]
```

Replace a built-in template by reusing its ID:

```yaml title="config/templates.yaml"
guide:
  type: guide
  body: ../templates/our-guide.mdx
```
