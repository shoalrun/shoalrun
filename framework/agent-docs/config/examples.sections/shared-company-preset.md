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

## Shared company preset

Several sites share one base file. Each site's config extends it and changes only what differs: here, the title, the palette, and extra navigation. The shared file also declares a required `owner` field and a `runbook` template for every site.

```yaml title="example-configs/shared-preset/shared/company-docs.yaml"
# Settings every docs site in the company shares. Sites layer their
# own docs.config.yaml over this file with `extends`.
schemaVersion: 1

site:
  title: Company docs
  header:
    links:
      - { label: All docs, href: "https://docs.example.com" }
      - { label: Support, href: "https://support.example.com", style: button }

theme:
  preset: ledger
  palette: ink

publications:
  defaults: { channel: production, version: current, language: en }
  channels:
    production: { pathPrefix: "" }
  versions:
    current: { pathPrefix: "" }
  enabled:
    - { channel: production, version: current }

frontmatter:
  defaults:
    type: guide
    channel: production
    version: current
    access: { policy: public }
  fields:
    owner:
      type: string
      required: true
      description: Team that maintains the page.

# Every site starts with the same first page. Paths in an extended file
# resolve from that file, so this template body lives next to it.
navigation:
  - id: start
    doc: guide.start

templates:
  runbook:
    type: guide
    body: ./runbook.mdx
```

```yaml title="example-configs/shared-preset/site/docs.config.yaml"
# One team's site. It inherits the shared theme, publication, page
# defaults, the required `owner` field, and the runbook template.
schemaVersion: 1
extends: [../shared/company-docs.yaml]

site:
  title: Billing team docs     # replaces the shared title; header links stay

theme:
  palette: coral               # keeps the shared ledger preset

navigation:
  $concat:                     # adds pages after the shared start page
    - id: runbooks
      label: Runbooks
      items:
        - id: failed-invoices
          doc: guide.failed-invoices
```

Run `shoalrun config explain theme.preset example-configs/shared-preset/site/docs.config.yaml` to see that the preset comes from the shared file.
