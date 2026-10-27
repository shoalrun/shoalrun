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

**Updated: 2026-10-26.**

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

## Parcel API documentation

The fictional Cedar Parcel API demonstrates enrollment shapes, parcel filters, several response formats, binary uploads, deprecation, and a delivery webhook. Its source matches the API reference styling lab. An overview and quickstart introduce the API; enrollment has an authored reference page and the other operations are generated. The complete spec, focused contracts, and API catalog are published. The Markdown twins get a short header, with operation IDs added on reference pages.

```yaml title="example-configs/api-docs/docs.config.yaml"
# Cedar Parcel API: guides, generated references, and agent-friendly contracts.
schemaVersion: 1

site:
  title: Cedar Parcel API
  origin: https://docs.cedar-parcel.example
  # Hidden visually until focused; present in HTML for agents and screen readers.
  agentDiscovery:
    mode: focus
    message: Use Markdown for complete examples and the linked focused API contracts.
  header:
    links:
      - { label: Quickstart, href: /quickstart, style: primary }
  footer:
    columns:
      - title: Start building
        links:
          - { label: Overview, href: / }
          - { label: Quickstart, href: /quickstart }
          - { label: Enrollment reference, href: /reference/create-enrollment }
    text: Cedar Parcel is a fictional example API.

theme:
  preset: shoal
  palette: kelp
  mode: system
  toggle: true

publications:
  defaults: { channel: production, version: current, language: en }
  channels:
    production: { pathPrefix: "" }
  versions:
    current: { pathPrefix: "" }
  enabled:
    - { channel: production, version: current, language: en }

frontmatter:
  defaults:
    type: guide
    channel: production
    version: current
    language: en
    access: { policy: public }

apis:
  cedar:
    source: { kind: file, path: ./apis/cedar-parcel.yaml, publish: true }
    discovery: { endpoint: https://api.cedar-parcel.example/v1 }
    publicReview:
      digest: a7a7e8eb427a7481f1c1f357d03db40319ad2e79bdeea926501da744cbecfd6f
    mappings:
      subjectLifecycle:
        from: x-docs-availability.phase
        values:
          limited: beta
          building: in-development
          retired: deprecated
    querySyntax:
      - parameter: parameters
        pathPrefixes: [/Search/]
        style: unwrapped
        example: declaredValue(gt)=100
    operations:
      - id: cedar.createEnrollment
        sourceOperationId: createEnrollment
        reference: reference.create-enrollment
    generateReferences:
      pathPrefix: /reference

navigation:
  - { id: overview, doc: guide.overview }
  - { id: quickstart, doc: guide.quickstart }
  - id: reference
    label: API reference
    api: cedar
    items:
      - { id: create-enrollment, operation: cedar.createEnrollment }
      - { id: generated, generated: tags }

relationships:
  - id: overview-to-quickstart
    from: guide.overview
    to: guide.quickstart
    type: next-step
    reason: Prepare a local-shop enrollment and inspect its receipt.
  - id: quickstart-to-reference
    from: guide.quickstart
    to: reference.create-enrollment
    type: next-step
    reason: Compare all four program shapes and their required fields.

outputs:
  markdown:
    metadata:
      format: yaml-frontmatter
      fields:
        id: frontmatter.id
        title: frontmatter.title
        summary: frontmatter.summary
        canonical: publication.canonicalUrl
      byType:
        api-reference:
          addFields: { operations: frontmatter.operations }
```

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

## Related reading

### Related topics

- [Configuration reference](https://www.shoalrun.com/config.md) — The same settings, combined into complete, working files.

- [Organize project configuration](https://www.shoalrun.com/configuration.md) — Explore complete projects using composition, versions, and languages.
