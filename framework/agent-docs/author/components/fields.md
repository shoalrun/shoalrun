---
id: guide.component.fields
title: Fields
summary: Write field lists in MDX with the same readable format as OpenAPI schemas.
type: reference
canonical: /author/components/fields
---

# Fields

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Components > Fields

**Updated: 2026-09-27.**

Use `<Fields>` and `<Field>` to describe fields that are not selected from an OpenAPI schema, or to explain a small task-specific subset in your own words. The list uses the same field styling as generated schemas. If the exact contract already exists in OpenAPI, [ApiSchema](https://www.shoalrun.com/author/components/api-embeds.md) can include the source schema or one of its fields.

## Syntax

```mdx
<Fields>
<Field name="name" type="string" required minLength="1" maxLength="80" example="Casey">

The name shown to readers.

</Field>
<Field name="options" type="object" optional nullable>

Extra display settings.

<Fields>
<Field name="compact" type="boolean" optional default="false">

Use a shorter layout.

</Field>
</Fields>

</Field>
</Fields>
```

- `name` — **required**

  string; minLength: 1; maxLength: 80

  Example: `Casey`

  The name shown to readers.

- `options` — **optional**

  object; nullable

  Extra display settings.

  - `compact` — **optional**

    boolean

    Default: `false`

    Use a shorter layout.

`Fields` takes no attributes and needs direct `Field` children. A `Field` body accepts ordinary Markdown and supported MDX, including a nested `Fields` list. A standalone `Field` or other direct child of `Fields` fails the build.

## Attribute reference

All values are literal MDX attributes. Text and numbers use quoted strings; flags are bare attributes. These declarations describe fields in the published page. They do not validate user input at runtime.

| `Field` attribute        | Required | Meaning                                                                             |
| ------------------------ | -------- | ----------------------------------------------------------------------------------- |
| `name`                   | Yes      | Nonempty field name.                                                                |
| `type`                   | Yes      | Nonempty type label, such as `string`, `integer`, or `array of objects`.            |
| `required`, `optional`   | No       | Bare presence flags. Omission means optional; the two flags cannot appear together. |
| `nullable`               | No       | Bare flag allowing a `null` value. It does not change whether the field is present. |
| `min`, `max`             | No       | Finite numeric value bounds; `minimum` and `maximum` are equivalent spellings.      |
| `minLength`, `maxLength` | No       | Nonnegative integer string-length bounds.                                           |
| `minItems`, `maxItems`   | No       | Nonnegative integer array-size bounds.                                              |
| `format`, `pattern`      | No       | Nonempty text for a format name or pattern.                                         |
| `example`, `default`     | No       | Literal text shown as an example or default value.                                  |
| `deprecated`             | No       | Bare flag marking the field as deprecated.                                          |

Bounds must be numeric, and each minimum must be no greater than its maximum. `min` cannot be combined with `minimum`, nor `max` with `maximum`. Keep the declared type, constraints, and examples consistent with the actual contract.

```mdx
<Fields>
<Field name="rank" type="integer" optional min="0" max="10" example="3">

Position in the list.

</Field>
</Fields>
```

## HTML, Markdown, and agents

The build writes a normal nested Markdown list. Each item starts with the field name and presence rule, followed by its type and authored body. For the first field above, the twin contains:

```md
- `name` — **required**

  string; minLength: 1; maxLength: 80

  Example: `Casey`

  The name shown to readers.
```

Both formats include every field and description. The authored text is part of the page rather than copied from OpenAPI, so keep it aligned with the contract when it describes an API.

## Related reading

### Related topics

- [ApiExample and ApiSchema](https://www.shoalrun.com/author/components/api-embeds.md) — Write field lists by hand in the same format as generated schemas.
