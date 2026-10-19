---
id: reference.config
title: Configuration reference
summary: Every top-level setting in docs.config.yaml, with defaults, validation
  rules, and links to the full guides.
type: reference
area: publishing
subarea: publishing-configuration
canonical: /config
---

# Configuration reference

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Reference > Configuration reference

**Updated: 2026-10-19.**

Parent page: [Full Markdown page](/config.md)

**Page reading path** — these links apply to the full page.

**Read first**

- [How Shoalrun works](https://www.shoalrun.com/concepts.md) — Understand publications, stable IDs, and config composition before changing settings.

A project's config starts at `docs.config.yaml`. The CLI looks for that name by default, and `shoalrun scaffold -n` searches parent directories for it. For the configuration workflow, composition rules, and debugging, start with [configure your project](https://www.shoalrun.com/configuration.md). This page lists every top-level key. Keys with a dedicated guide link there for the full rules. For complete, working configs, see [example configs](https://www.shoalrun.com/config/examples.md).

The root file must be a YAML mapping with `schemaVersion: 1`. YAML is parsed strictly: duplicate keys fail. Any top-level key not listed here fails with `unknown setting <key>`. Keys nested inside `site`, `apis`, `publications`, and `outputs` are not all checked yet, so check spelling there carefully.

```yaml title="docs.config.yaml"
schemaVersion: 1
site:
  title: Example documentation
publications:
  defaults: { channel: production, version: current, language: en }
  channels:
    production: { pathPrefix: "" }
  versions:
    current: { pathPrefix: "" }
  enabled:
    - { channel: production, version: current }
navigation: { $include: ./config/nav.yaml }
```

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
