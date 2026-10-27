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

## Reading paths in section Markdown

A section resource carries the prerequisites and next steps shown in a top-level `<RelatedReading />` view for that page, even when the view appears under a different heading. The added **Page reading path** block names its page-wide scope and retains target titles, reasons, status labels, and Markdown links. Prerequisites come before next steps; each group keeps its configured order. These are authored suggestions, not an inferred linear sequence or proof that prerequisites have been satisfied.

Links already present in the section or repeated page introduction are not copied again. Both list and card views supply the same concise reading-path links. The compiler does not carry other relationship types, views for another `relatedTo` page, or views nested inside tabs, reader sections, or other components into unrelated sections. Nested views remain with their original content and labels. Relationships declared only in config do not appear automatically: display them with `RelatedReading` where readers need them.

Carried links count toward the section's exact byte/token size and its size eligibility. They do not change `standaloneSections` declarations or prove that a section contains every prerequisite. Read the linked prerequisite or full page when the task needs more context.
