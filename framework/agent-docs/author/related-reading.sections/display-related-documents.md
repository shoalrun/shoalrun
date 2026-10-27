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

**Updated: 2026-10-26.**

Parent page: [Full Markdown page](/author/related-reading.md)

A relationship is an authored connection between two pages, with a reason to follow the link. Use related reading for prerequisites, next steps, references, and distinctions that help readers choose where to go. The links use stable document IDs and remain in the current publication. For curated cards and filtered collections, see [cards and collections](https://www.shoalrun.com/author/components/cards.md).

## Display related documents

**Related reading** presents centrally maintained connections as lists of links grouped by purpose. **Cards** are a visual presentation for page previews. The same relationship data can drive either presentation; declaring a relationship does not require a card.

Place this under a level-two heading where related reading belongs:

```mdx
## Related reading

<RelatedReading />
```

This renders nonempty groups in the order shown in the relationship-type table, with level-three headings. Within each group, links follow `order`, then relationship ID. Each list item uses the target's page title and the relationship reason. Card titles, descriptions, eyebrows, and icons do not change the default link list. Subject lifecycle status remains visible. Titles and URLs come from the target page; maintain only IDs, relationship purposes, and reasons in the central mapping.

To show one kind of relationship under your own heading:

```mdx
## Next steps

<RelatedReading relation="next-step" />
```

For optional cards, change the presentation:

```mdx
<RelatedReading relation="next-step" layout="cards" />
```

The [RelatedReading component page](https://www.shoalrun.com/author/components/related-reading.md) lists every attribute. `<DocCards relation="next-step" />` remains supported as an explicit card view; `DocCards` also supports curated `docs` arrays. `RelatedReading` accepts relationship queries only.
