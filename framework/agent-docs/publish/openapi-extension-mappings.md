---
id: reference.openapi-extension-mappings
title: OpenAPI extension mappings
summary: Map selected operation-level x-* values into Shoalrun metadata without
  depending on a particular authoring service.
type: reference
area: api
subarea: api-contracts
canonical: /publish/openapi-extension-mappings
---

# OpenAPI extension mappings

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Document an API > OpenAPI extension mappings

**Updated: 2026-10-25.**

OpenAPI permits [specification extensions](https://spec.openapis.org/oas/v3.1.0#specification-extensions) whose names begin with `x-`. Their names and values belong to the tool or team that wrote the description. Shoalrun reads standard OpenAPI fields directly and applies an extension only when the project config explicitly maps it to a supported Shoalrun field.

## Supported mapping

Use these source locations and value shapes when mapping OpenAPI extensions to Shoalrun fields.

| Shoalrun target    | Source location                                      | Accepted source shape                                           | Shoalrun values                                        |
| ------------------ | ---------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------ |
| `subjectLifecycle` | An operation under `paths` or OpenAPI 3.1 `webhooks` | A scalar `x-*` value, or a scalar member inside an `x-*` object | `beta`, `in-development`, `experimental`, `deprecated` |

Use `apis.<apiId>.mappings.subjectLifecycle`. `from` starts with an operation-level `x-*` key. For an object, add a dot and the member name; further simple member names may follow. `values` maps exact source values to Shoalrun values. Unlisted, missing, null, array, or object values do not set a badge.

For example, this fictional OpenAPI operation uses an object-shaped extension:

```yaml title="openapi.yaml"
paths:
  /widgets:
    get:
      operationId: listWidgets
      x-docs-availability:
        status: testing
        note: May change before general release
      responses:
        '200': { description: Widgets returned }
```

Map its `status` member without changing the OpenAPI file:

```yaml title="config/api.yaml"
catalog:
  source: { kind: file, path: ../apis/catalog/openapi.yaml }
  mappings:
    subjectLifecycle:
      from: x-docs-availability.status
      values:
        testing: beta
        building: in-development
        retired: deprecated
  generateReferences: true
```

The `listWidgets` reference now shows **Beta** in its page header and navigation. Its Markdown twin and `documents.json` also report the mapped status. For a scalar extension such as `x-docs-availability: testing`, use `from: x-docs-availability` with the same `values` map. The source names are examples; the project chooses its own extension name and values.

An authored reference page's `subjectLifecycle` takes precedence over the mapping. OpenAPI `deprecated: true` always makes the operation **Deprecated**; a conflicting authored status fails the build. A mapping is scoped to one API registration and applies to that API's selected operations across its publications.

## Other extension shapes

Extensions outside the supported mapping may need source changes or a different Shoalrun feature.

| Source extension purpose              | Current Shoalrun behavior | Use in Shoalrun today                                                                                                                                                                   |
| ------------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tag names and tag groups              | No automatic mapping      | Use OpenAPI `tags` for generated groups and [navigation config](https://www.shoalrun.com/author/navigation.md) for editorial grouping and MDX pages.                                    |
| Custom code samples                   | No automatic mapping      | Add an authored MDX example or reusable snippet; standard OpenAPI request and response examples still appear automatically.                                                             |
| Enum labels or descriptions           | No automatic mapping      | Standard `enum` values appear in schemas. Put explanatory prose in a schema or field `description`.                                                                                     |
| Hide or internal flags                | No automatic mapping      | Select public operations with `generateReferences.include` or explicit `operations`; set page access in authored frontmatter. Do not rely on an unrecognized extension to hide content. |
| Explorer settings and SDK naming      | No automatic mapping      | Shoalrun does not execute API requests. Keep SDK-specific settings in their owning tool.                                                                                                |
| Webhook markers in older descriptions | No automatic mapping      | Describe inbound events with OpenAPI 3.1 `webhooks`.                                                                                                                                    |

An unmapped `x-*` value does not change the rendered reference. A focused contract omits extension properties while retaining literal example payload keys, even when those keys begin with `x-`. A full OpenAPI download enabled by `source.publish: true` contains the source file as authored, including its extensions. Review that file before publishing it.

## Choosing a new mapping target

The target list above is intentionally small. An extension can describe presentation, visibility, SDK behavior, or actual wire semantics, and identical names do not guarantee identical shapes. When adding a target, define its source location, accepted value shapes, Shoalrun output, precedence over authored metadata and standard OpenAPI, and behavior for unknown values. Keep the source name configurable so projects can adapt descriptions from different tools without baking a vendor vocabulary into Shoalrun.
