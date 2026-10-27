---
id: guide.component.progress
title: Progress
summary: Show a bounded count with a visible label and native progress bar.
type: reference
area: components
subarea: components-procedures
canonical: /author/components/progress
---

# Progress

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Reference](https://www.shoalrun.com/.well-known/shoalrun/navigation/reference-tab-50f26fe22670.txt) (ID: reference-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Reference](https://www.shoalrun.com/cli.md) > Components > Progress

**Updated: 2026-10-27.**

Use `<Progress>` for a published count in a tutorial or migration guide. It shows the amount completed as text and as a bar. Update the source and rebuild the site when the shared state changes.

## Syntax

```mdx
<Progress label="Migration tasks" value="3" max="5" />
```

Migration tasks: 3 of 5 complete.

## Attributes

Use these attributes to configure the component.

| Attribute | Required | Meaning                                                                     |
| --------- | -------- | --------------------------------------------------------------------------- |
| `label`   | Yes      | Nonempty name shown beside the count and used as the bar's accessible name. |
| `value`   | Yes      | A number from zero through `max`.                                           |
| `max`     | Yes      | A number greater than zero.                                                 |

`<Progress>` is a block element without a body. All three attributes must be literal values. The build rejects a value outside the range or a maximum of zero.

## When to use it

Use this component when a count has a known maximum, such as 3 of 5 migration tasks complete. It is a read-only display: readers cannot mark a task complete or move the bar. For a process with named stages and descriptions, use a [timeline](https://www.shoalrun.com/author/components/timeline.md).

## HTML, Markdown, and agents

HTML shows “Migration tasks: 3 of 5 complete” alongside a native `<progress>` element. The text carries the count even without CSS or color. There is no JavaScript behavior or keyboard control.

Markdown states the same label and count in a sentence. An agent does not need to estimate completion from the bar.

## Related reading

### Often confused with

- [Timelines](https://www.shoalrun.com/author/components/timeline.md) — Progress reports a bounded count; a timeline names and describes stages.
