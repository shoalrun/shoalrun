---
id: guide.related-reading
title: Related reading
summary: Relationship fields, purposes, ordering, validation, and rendered
  reading paths.
type: reference
area: components
subarea: components-navigation
canonical: /author/related-reading
---

# Related reading

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Related reading

**Updated: 2026-10-27.**

Parent page: [Full Markdown page](/author/related-reading.md)

A relationship is an authored connection between two pages, with a reason to follow the link. Use related reading for prerequisites, next steps, references, and distinctions that help readers choose where to go. The links use stable document IDs and remain in the current publication. For curated cards and filtered collections, see [cards and collections](https://www.shoalrun.com/author/components/cards.md).

## Inspect output and changes

`documents.json` records each page's `cardTargets` (selected stable IDs) and `cardQueries` (collection and relationship selectors, including `RelatedReading` and its layout). Its top-level `relationships` array contains only published edges with their concrete publication variants. There is no separate `relationships.json` artifact in this slice.

A full build re-evaluates every collection and relationship view. Changing a target's title, summary, card metadata, slug, or subjectLifecycle refreshes its referring cards. Adding a matching document changes collection membership on the next build. Card content contributes to the referring page's Markdown digest. The compiler currently rebuilds the whole site; these records are not an incremental build cache.

HTML cards use real links, visible keyboard focus, and responsive columns. The Markdown twin uses a list of links to `.md` targets with equivalent text. Cards need no browser JavaScript. The current scope excludes named collection definitions, relationship frontmatter shorthand, operation/schema graph nodes, inferred relationships, and card images.
