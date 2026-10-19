---
id: guide.component.related-reading
title: RelatedReading
summary: Display authored relationships as links or cards.
type: reference
area: components
subarea: components-navigation
canonical: /author/components/related-reading
---

# RelatedReading

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Components > RelatedReading

**Updated: 2026-10-19.**

`<RelatedReading>` presents connections declared in the central `relationships` config. Use it for prerequisites, next steps, references, related topics, and distinctions that need a reason.

## Syntax

```mdx
<RelatedReading relation="next-step" />
```

| Attribute   | Meaning                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------- |
| `relation`  | Select one relationship type; omit for all types grouped by purpose.                        |
| `relatedTo` | Source document ID; defaults to this page. It must be available in the current publication. |
| `layout`    | `list` by default, or `cards`. Card layout includes card overrides, summaries, and reasons. |
| `empty`     | Text for no matches; default is “No matching documents.” Empty groups are omitted.          |

This is a standalone empty element. A selected `relation` has no automatic heading, so give that view a page heading when useful. See [related reading](https://www.shoalrun.com/author/related-reading.md) for config fields, relationship types, and ordering.

## HTML, Markdown, and agents

With `layout="list"`, HTML and Markdown show links with the relationship reasons; `layout="cards"` adds previews. Only connections whose endpoints are public in the current publication appear. Both layouts export ordinary links and reasons to Markdown, with `.md` destinations, so agents can follow the same reading paths. The HTML wrapper has the `related-reading` class for [project CSS](https://www.shoalrun.com/author/css.md).

When a top-level view describes the current page, section Markdown also carries its `prerequisite` and `next-step` links if they would otherwise be omitted. A **Page reading path** label explains the scope. Nested views and views with another `relatedTo` source stay in their original context. See [section reading paths](https://www.shoalrun.com/author/related-reading.md) for boundaries and size rules.

## Related reading

### Read first

- [Related reading](https://www.shoalrun.com/author/related-reading.md) — Declare the relationships this component displays.
