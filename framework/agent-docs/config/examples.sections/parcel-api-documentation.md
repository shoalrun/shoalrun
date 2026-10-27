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

**Updated: 2026-10-27.**

Parent page: [Full Markdown page](/config/examples.md)

Each example below is a complete project in the repository's `framework/example-configs/` directory, with pages and any OpenAPI files it needs. The test suite builds every one, and checks that the configs on this page match the files, so they stay correct. Start with the bundled `minimal`, `api-docs`, or `showcase` project, then build it:

```sh
shoalrun init my-docs --starter minimal
cd my-docs
shoalrun build docs.config.yaml site-dist
shoalrun serve site-dist
```

Use `--starter api-docs` for the Cedar Parcel API example, or `--starter showcase` for a complete component handbook built around that fictional service. The other examples remain available to copy from `framework/example-configs/`.

The `notifications` project demonstrates an optional [cookbook chooser](https://www.shoalrun.com/author/components/cookbook-chooser.md) with email, push, and SMS choices. Its YAML maps supported selections to prebuilt recipe pages. It also includes unpublished ingredient and recipe drafts to show the authoring path. Build it from the repository root:

```sh
node framework/dist/cli.js build framework/example-configs/notifications/docs.config.yaml /tmp/notifications-site
node framework/dist/cli.js serve /tmp/notifications-site
```

The [configuration reference](https://www.shoalrun.com/config.md) explains every key.

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
