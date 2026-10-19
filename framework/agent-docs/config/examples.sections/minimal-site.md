---
id: reference.config-examples
title: Example configs
summary: Complete, working docs.config.yaml files for common kinds of
  documentation sites.
type: reference
area: publishing
subarea: publishing-configuration
canonical: /config/examples
---

# Example configs

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Get started > Example projects

**Updated: 2026-10-19.**

Parent page: [Full Markdown page](/config/examples.md)

Each example below is a complete project in the repository's `framework/example-configs/` directory, with pages and any OpenAPI files it needs. The test suite builds every one, and checks that the configs on this page match the files, so they stay correct. Start with the bundled `minimal` or `api-docs` project, then build it:

```sh
shoalrun init my-docs --starter minimal
cd my-docs
shoalrun build docs.config.yaml site-dist
shoalrun serve site-dist
```

Use `--starter api-docs` for the Cedar Parcel API example. The other examples remain available to copy from `framework/example-configs/`.

The `notifications` project demonstrates an optional [cookbook chooser](https://www.shoalrun.com/author/components/cookbook-chooser.md) with email, push, and SMS choices. Its YAML maps supported selections to prebuilt recipe pages. It also includes unpublished ingredient and recipe drafts to show the authoring path. Build it from the repository root:

```sh
node framework/dist/cli.js build framework/example-configs/notifications/docs.config.yaml /tmp/notifications-site
node framework/dist/cli.js serve /tmp/notifications-site
```

The [configuration reference](https://www.shoalrun.com/config.md) explains every key.

## Minimal site

One publication, page defaults so each page needs only an `id`, `title`, `summary`, and `slug`, and a two-level sidebar.

```yaml title="example-configs/minimal/docs.config.yaml"
# The smallest useful site: one publication, two pages, a sidebar.
schemaVersion: 1

site:
  title: Acme handbook

publications:
  defaults: { channel: production, version: current, language: en }
  channels:
    production: { pathPrefix: "" }
  versions:
    current: { pathPrefix: "" }
  enabled:
    - { channel: production, version: current }

# Every page gets these values unless it sets its own.
frontmatter:
  defaults:
    type: guide
    channel: production
    version: current
    access: { policy: public }

navigation:
  - id: welcome
    doc: guide.welcome
  - id: setup
    label: Setup
    items:
      - id: install
        doc: guide.install
```
