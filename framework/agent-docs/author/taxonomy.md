---
id: guide.page-taxonomy
title: Design and enforce a page taxonomy
summary: Define page categories, validate allowed values, and enforce your
  project's area and subarea rules.
type: how-to
area: authoring
subarea: authoring-metadata
canonical: /author/taxonomy
---

# Design and enforce a page taxonomy

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Metadata > Design and enforce a page taxonomy

**Updated: 2026-10-25.**

Use `area` and `subarea` to describe a page's subject independently of its place in navigation. The same subject can appear in guides, reference pages, recipes, and change notes.

> Built-in taxonomy enforcement requires `@shoalrun/cli@0.1.0-alpha.3` or later.

Start with an existing Shoalrun project. You need access to its configuration, authored pages, and build command.

## Define allowed categories

Choose areas that readers recognize and subareas for distinct subjects within them. Keep category IDs stable when changing display labels.

Store the definitions and enforcement options in one file:

```yaml title="config/taxonomy.yaml"
required: [area, subarea]
requireExplicit: [area, subarea]
areas:
  components:
    label: Content components
    subareas:
      api-embeds: API examples and schemas
      diagrams: Diagrams
  api:
    label: API documentation
    subareas:
      contracts: Contracts
```

Load the file as the project's taxonomy:

```yaml title="docs.config.yaml"
frontmatter:
  taxonomy: { $include: ./config/taxonomy.yaml }
```

`required` makes the selected fields mandatory after defaults and enforced values are resolved. `requireExplicit` also requires those fields in authored source, including drafts. Generated API reference pages can inherit their categories from global frontmatter defaults.

Each subarea belongs to its declared parent area. IDs do not need to share a prefix. A subarea ID must be unique across the taxonomy.

## Classify pages by subject

Add the category IDs to a page's frontmatter:

```yaml
area: components
subarea: api-embeds
```

The build rejects unknown categories, missing required tags, and subareas that do not belong to the selected area. It applies the checks to authored pages and resolved generated references. The generated frontmatter schema exposes the same vocabulary and pair constraints for editors.

Shoalrun publishes the definitions in `documents.json` under `taxonomy`. Individual page records and search indexes carry their resolved categories. To expose category IDs in Markdown frontmatter, add `area: frontmatter.area` and `subarea: frontmatter.subarea` to `outputs.markdown.metadata.fields`.

## Allow multiple areas when needed

A site permits one area and one subarea per page by default. Enable lists only for the fields your project needs:

```yaml title="config/taxonomy.yaml"
required: [area, subarea]
requireExplicit: [area, subarea]
multiple: [area, subarea]
areas:
  components:
    label: Content components
    subareas:
      api-embeds: API examples and schemas
  api:
    label: API documentation
    subareas:
      contracts: Contracts
```

A page can then belong to both subjects:

```yaml
area: [components, api]
subarea: [api-embeds, contracts]
```

Lists must be nonempty and contain unique IDs. Every subarea must belong to at least one selected area. Scalar values remain valid when multiple values are enabled. Use `multiple: [area]` if only areas may have several values; subareas then remain single-valued.

A matching configured reader facet receives all selected values. See [reader views](https://www.shoalrun.com/author/reader-views.md) for facet controls and matching. Category enforcement works without configuring reader facets.

## Choose the enforcement level

Omit `required` to validate categories only where supplied. Omit `requireExplicit` to let authored pages inherit categories. Omit `multiple` to keep both fields single-valued.

Omit `frontmatter.taxonomy` or set it to `false` to leave category fields optional with their existing behavior. Configured reader facets continue to validate their own choices.

Run the ordinary build after editing the definitions or page tags:

```sh
npx --no-install shoalrun build docs.config.yaml dist
```

Verify that missing required fields, unknown IDs, wrong parent pairs, and disallowed lists fail. Restore valid tags and inspect a generated page and the published taxonomy. When renaming or removing a category, update the definitions and affected pages together.

## Related reading

- [Page metadata](https://www.shoalrun.com/author/frontmatter.md) describes the native category fields.
- [Reader views](https://www.shoalrun.com/author/reader-views.md) explains how category values become facets.
- [Custom metadata](https://www.shoalrun.com/author/custom-metadata.md) covers defaults and additional fields.
