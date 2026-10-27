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

## Automatic footers

Some links appear without a relationship. The build adds these lists at the end of a page, in HTML and Markdown:

- **Related documentation** links pages that share an operation ID in `operations`.
- **Related API references** and **Related guides** link a guide or how-to page with the API references named in its `relatedApiReferences`. See [link guides to API references](https://www.shoalrun.com/api-docs/generate.md).

These automatic lists are separate from authored relationships and can appear alongside related reading. They do not establish workflow order.

The current mapping uses explicit document-ID pairs. DITA table imports, external targets, and topic-group shorthand are not supported yet.
