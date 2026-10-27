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

## `frontmatter`

Global `defaults`, `enforced` values, per-language formatting `locales`, custom `fields` declarations, and `changelogIdentifier`. Pages can replace defaults but not enforced values. `id` and `slug` can't be set globally. See [frontmatter](https://www.shoalrun.com/author/frontmatter.md) and [release notes and changelog](https://www.shoalrun.com/author/release-notes.md).

Let pages leave out common values:

```yaml title="config/frontmatter.yaml"
defaults:
  type: guide
  channel: production
  version: current
  access: { policy: public }
```

Force a value on every page:

```yaml title="config/frontmatter.yaml"
enforced:
  audiences: [partners]
```

Choose what identifies each changelog entry. The default is `either`; `date` and `version` are also available:

```yaml title="config/frontmatter.yaml"
changelogIdentifier: either
```

Here `version` means the page's `releaseVersion` field, not the documentation publication version.

Declare custom fields. `public: true` lets a field appear in the Markdown twin's header:

```yaml title="config/frontmatter.yaml"
fields:
  owner:
    type: string
    required: true
    description: Team that maintains the page.
  agent.intent:
    type: string
    public: true
  reviewStatus:
    type: string
    enum: [draft, reviewed, approved]
```
