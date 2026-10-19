---
id: guide.cards
title: Cards and collections
summary: Link to documents by stable ID and build filtered card collections.
type: reference
area: components
subarea: components-navigation
canonical: /author/components/cards
---

# Cards and collections

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Components > Cards and collections

**Updated: 2026-10-19.**

Parent page: [Full Markdown page](/author/components/cards.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [Publishing and agent representations](https://www.shoalrun.com/publish/output.md) — Inspect the HTML, Markdown, and manifests produced by the build.

A card is a linked preview of another documentation page: it shows a title and short preview so readers can decide where to go next. Cards use the target page's title, the project's configured `outputs.text.card` field, and its current URL. The target is the page the reader will open when they select the card.

Authors maintain those details in the target page's frontmatter, the YAML metadata at the top of the file. A card references the page's stable `id`, so renaming its file or changing its URL does not break the card. HTML displays a card layout; Markdown displays the same links, descriptions, subject lifecycle status, and relationship reasons as a readable list.

Use these components as standalone, empty blocks in `.md` or `.mdx` pages or registered snippets. Literal attributes are accepted; arbitrary JavaScript expressions are not evaluated.

## Build a collection

A **collection** automatically finds pages that match your filters and displays them as cards. Use it when the list should follow the site's content, such as all authoring guides or pages associated with a payment operation. Unlike a curated list, you do not have to maintain an array of every matching page ID.

`DocCollection` re-runs its filters during each build. Adding a matching page adds its card on the next build; removing the tag or making that page a draft removes it. A collection does not create pages, change their metadata, or add them to sidebar navigation.

This example displays up to six other guides tagged `authoring`, sorted by title:

```mdx
<DocCollection type="guide" tag="authoring" orderBy="title" limit={6} />
```

No matching documents.

| Attribute   | Behavior                                                                                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`      | Matches the document kind in frontmatter, such as `guide` or `api-reference`.                                                                                                   |
| `tag`       | Matches a topic label in the target's `tags` array, such as `authoring`.                                                                                                        |
| `operation` | Membership in its stable `operations` IDs; unknown operation IDs fail.                                                                                                          |
| `audience`  | Membership in its `audiences` array; this filters metadata and does not grant access.                                                                                           |
| `orderBy`   | `title` by default, `id`, `date`, or `releaseVersion`. Date sorts newest first; version uses numeric label ordering. Every match needs the chosen field. Stable IDs break ties. |
| `pin`       | Promotes selected matching pages to the front of the collection, in the given order. Supply a literal array of document IDs.                                                    |
| `exclude`   | A literal array of IDs to remove. IDs absent from this publication are ignored.                                                                                                 |
| `limit`     | A positive integer limiting the total, including pinned entries. Write it as an expression, `limit={6}`; the string `limit="6"` fails.                                          |
| `empty`     | Text to show when no documents match; defaults to “No matching documents.”                                                                                                      |

All supplied filters must match. The current page is excluded. Collections never pull in another channel, version, language, or a nonpublic page. With no filters, a collection lists all other public documents in the current publication.

For example, in the API fixture:

```mdx
<DocCollection operation="payments.create" pin={["reference.create-payment"]} />
```

Pinned documents must be visible and satisfy all filters, including exclusions. Invalid pins stop the build. The `pin` and `exclude` arrays require unique document IDs. Collection ordering is deterministic and does not depend on filenames.
