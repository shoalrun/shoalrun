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

## Where relationship explanations come from

The **Why they’re connected** text in this site's [documentation explorer](https://www.shoalrun.com/explore.md) comes directly from the relationship's authored `reason` field. Authors maintain that text in `docs/config/relationships.yaml`. The build validates each relationship and publishes its reason in the `relationships` array in `documents.json`. The explorer reads that manifest and displays the explanation.

Opening the graph, selecting a page, or inspecting a matrix cell makes no model calls. The explorer does not infer connections or generate explanations from page content. Relationship types, direction, and reasons come from the declared configuration; page titles and summaries come from document metadata.

Write a reason that tells readers what the connected page helps them do or understand. Prefer a concrete explanation such as “Inspect the HTML, Markdown, and manifests produced by the build” over “These pages are related.” For two-way relationships, write text that works from either page. The `reason` field is required by relationship validation.

To change an explanation, edit its `reason` in the relationship configuration and rebuild the site. The same authored reason is available to humans in related-reading views and to agents through `documents.json`.
