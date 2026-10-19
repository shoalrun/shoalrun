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

**Updated: 2026-10-19.**

A relationship is an authored connection between two pages, with a reason to follow the link. Use related reading for prerequisites, next steps, references, and distinctions that help readers choose where to go. The links use stable document IDs and remain in the current publication. For curated cards and filtered collections, see [cards and collections](https://www.shoalrun.com/author/components/cards.md).

## Declare relationships

A **relationship** is an explicit connection between two pages, with a reason to follow the link. For example, a guide can point to the task readers should do next, a prerequisite they should read first, or a useful reference. These connections express your intended reading path; sidebar position and shared operation IDs do not establish that order.

Keep the connections in a central config fragment so pages can display them without repeating the target IDs and reasons in their content:

```yaml title="docs.config.yaml"
relationships: { $include: ./config/relationships.yaml }
```

```yaml title="config/relationships.yaml"
- id: cards-to-output
  from: guide.related-reading
  to: guide.output
  type: next-step
  reason: Inspect the HTML, Markdown, and manifests produced by the build.
  order: 10
```

| Field        | Meaning                                                                                                     |
| ------------ | ----------------------------------------------------------------------------------------------------------- |
| `id`         | Unique relationship ID.                                                                                     |
| `from`, `to` | Stable document IDs.                                                                                        |
| `type`       | A relationship purpose from the table below.                                                                |
| `reason`     | Required text explaining why the target is useful.                                                          |
| `order`      | Optional finite number; smaller values come first, with relationship ID as the tie-breaker. Default is `0`. |

Relationship types describe why a reader should follow the link:

| Type                | Purpose / default group heading                      | Direction              |
| ------------------- | ---------------------------------------------------- | ---------------------- |
| `prerequisite`      | Read first — knowledge needed before this page.      | From source to target. |
| `next-step`         | Next steps — continue the workflow.                  | From source to target. |
| `reference`         | Reference while working — look up details.           | From source to target. |
| `advanced`          | Go deeper — explore a more advanced topic.           | From source to target. |
| `see-also`          | Related topics — parallel or complementary material. | Both directions.       |
| `not-confused-with` | Often confused with — distinguish two topics.        | Both directions.       |

Declare symmetric pairs only once and write a reason that makes sense from either page. For `not-confused-with`, explain the actual distinction in the reason. A prerequisite target is something to read before the source.

Unknown document IDs, self-links, duplicate IDs, duplicate edges of the same type, and prerequisite cycles within a public publication fail. Different relationship types can connect the same pair. Next-step cycles are allowed for workflows with a return step; provide meaningful reasons.

A relationship is published only where both documents have public variants in the same channel, version, and language. Edges to drafts or unavailable variants are omitted from related reading and the public manifest. A relationship does not publish its target or create a cross-version link.

## Where relationship explanations come from

The **Why they’re connected** text in this site's [documentation explorer](https://www.shoalrun.com/explore.md) comes directly from the relationship's authored `reason` field. Authors maintain that text in `docs/config/relationships.yaml`. The build validates each relationship and publishes its reason in the `relationships` array in `documents.json`. The explorer reads that manifest and displays the explanation.

Opening the graph, selecting a page, or inspecting a matrix cell makes no model calls. The explorer does not infer connections or generate explanations from page content. Relationship types, direction, and reasons come from the declared configuration; page titles and summaries come from document metadata.

Write a reason that tells readers what the connected page helps them do or understand. Prefer a concrete explanation such as “Inspect the HTML, Markdown, and manifests produced by the build” over “These pages are related.” For two-way relationships, write text that works from either page. The `reason` field is required by relationship validation.

To change an explanation, edit its `reason` in the relationship configuration and rebuild the site. The same authored reason is available to humans in related-reading views and to agents through `documents.json`.

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

## Reading paths in section Markdown

A section resource carries the prerequisites and next steps shown in a top-level `<RelatedReading />` view for that page, even when the view appears under a different heading. The added **Page reading path** block names its page-wide scope and retains target titles, reasons, status labels, and Markdown links. Prerequisites come before next steps; each group keeps its configured order. These are authored suggestions, not an inferred linear sequence or proof that prerequisites have been satisfied.

Links already present in the section or repeated page introduction are not copied again. Both list and card views supply the same concise reading-path links. The compiler does not carry other relationship types, views for another `relatedTo` page, or views nested inside tabs, reader sections, or other components into unrelated sections. Nested views remain with their original content and labels. Relationships declared only in config do not appear automatically: display them with `RelatedReading` where readers need them.

Carried links count toward the section's exact byte/token size and its size eligibility. They do not change `standaloneSections` declarations or prove that a section contains every prerequisite. Read the linked prerequisite or full page when the task needs more context.

## Automatic footers

Some links appear without a relationship. The build adds these lists at the end of a page, in HTML and Markdown:

- **Related documentation** links pages that share an operation ID in `operations`.
- **Related API references** and **Related guides** link a guide or how-to page with the API references named in its `relatedApiReferences`. See [link guides to API references](https://www.shoalrun.com/api-docs/generate.md).

These automatic lists are separate from authored relationships and can appear alongside related reading. They do not establish workflow order.

The current mapping uses explicit document-ID pairs. DITA table imports, external targets, and topic-group shorthand are not supported yet.

## Inspect output and changes

`documents.json` records each page's `cardTargets` (selected stable IDs) and `cardQueries` (collection and relationship selectors, including `RelatedReading` and its layout). Its top-level `relationships` array contains only published edges with their concrete publication variants. There is no separate `relationships.json` artifact in this slice.

A full build re-evaluates every collection and relationship view. Changing a target's title, summary, card metadata, slug, or subjectLifecycle refreshes its referring cards. Adding a matching document changes collection membership on the next build. Card content contributes to the referring page's Markdown digest. The compiler currently rebuilds the whole site; these records are not an incremental build cache.

HTML cards use real links, visible keyboard focus, and responsive columns. The Markdown twin uses a list of links to `.md` targets with equivalent text. Cards need no browser JavaScript. The current scope excludes named collection definitions, relationship frontmatter shorthand, operation/schema graph nodes, inferred relationships, and card images.

## Related reading

### Reference while working

- [RelatedReading](https://www.shoalrun.com/author/components/related-reading.md) — Look up every RelatedReading attribute.

### Often confused with

- [Cards and collections](https://www.shoalrun.com/author/components/cards.md) — Related reading follows authored relationships with reasons; cards and collections show pages you pick by ID or filter by metadata.
