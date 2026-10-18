---
id: reference.config-examples
title: Example configs
summary: Complete, working docs.config.yaml files for common kinds of
  documentation sites.
type: reference
canonical: /config/examples
---

# Example configs

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Get started > Example projects

**Updated: 2026-09-28.**

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

## Multilingual help center

English at the root and German under `/de`. German pages set `language: de` and reuse the English page IDs. The site also sets a theme that follows the reader's light or dark setting, project-wide snippet values, and a custom callout type.

```yaml title="example-configs/multilingual/docs.config.yaml"
# One site in English and German, with a theme, a shared snippet,
# and a custom callout type. English is the default language, so its
# pages have no prefix; German pages live under /de.
schemaVersion: 1

site:
  title: Tidewater help center
  header:
    links:
      - { label: Status, href: "https://status.example.com" }
      - { label: Contact us, href: "mailto:help@example.com", style: button }

theme:
  preset: reef
  palette: harbor
  mode: system        # follows the reader's setting and shows a switch

publications:
  defaults: { channel: production, version: current, language: en }
  channels:
    production: { pathPrefix: "" }
  versions:
    current: { pathPrefix: "" }
  enabled:
    - { channel: production, version: current }              # English
    - { channel: production, version: current, language: de }  # German

frontmatter:
  defaults:
    type: guide
    channel: production
    version: current
    access: { policy: public }

# Values every page can use in snippets.
variables:
  product: Tidewater
  supportHours: 24

snippets:
  support.contact:
    file: ./snippets/contact.mdx
    variables:
      product: { type: string, required: true }
      supportHours: { type: number, required: true }

callouts:
  types:
    privacy:
      label: Privacy
      tone: important
      icon: shield-check

navigation:
  - id: home
    doc: guide.home
  - id: account
    label: Account
    items:
      - id: reset-password
        doc: guide.reset-password
```
