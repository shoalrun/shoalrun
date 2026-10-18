---
id: guide.cards
title: Cards and collections
summary: Link to documents by stable ID and build filtered card collections.
type: reference
canonical: /author/components/cards
---

# Cards and collections

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Components > Cards and collections

**Updated: 2026-09-27.**

Parent page: [Full Markdown page](/author/components/cards.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [Publishing and agent representations](https://www.shoalrun.com/publish/output.md) — Inspect the HTML, Markdown, and manifests produced by the build.

A card is a linked preview of another documentation page: it shows a title and short preview so readers can decide where to go next. Cards use the target page's title, the project's configured `outputs.text.card` field, and its current URL. The target is the page the reader will open when they select the card.

Authors maintain those details in the target page's frontmatter, the YAML metadata at the top of the file. A card references the page's stable `id`, so renaming its file or changing its URL does not break the card. HTML displays a card layout; Markdown displays the same links, descriptions, subject lifecycle status, and relationship reasons as a readable list.

Use these components as standalone, empty blocks in `.md` or `.mdx` pages or registered snippets. Literal attributes are accepted; arbitrary JavaScript expressions are not evaluated.

## Curate a reading list

Use a curated list when you want to choose exactly which pages readers see and in what order. `DocCards` displays one card for each document ID you supply. For example, this list offers the content guide followed by the templates guide:

```mdx
<DocCards docs={["guide.content-identity", "guide.templates"]} />
```

- [Content and stable IDs](https://www.shoalrun.com/author/content.md)

  Give each page a durable identity and publish explicit variants.

- [Templates](https://www.shoalrun.com/author/templates.md)

  Create and edit page starting points, then scaffold drafts from them.

The array controls the order. Duplicate IDs fail validation. An empty array renders “No matching documents.” Set `empty="Your message"` to replace that text. Add an ordinary Markdown heading before a card group when it needs a section title. Cards themselves use list and link semantics rather than inserting heading levels.

`DocCards` can also show cards from a declared relationship. Supply either `docs` or `relation`:

```mdx
<DocCards relation="next-step" relatedTo="guide.cards" />
```

| Attribute   | Required               | Meaning                                                         |
| ----------- | ---------------------- | --------------------------------------------------------------- |
| `docs`      | For a curated list     | Literal array of unique document IDs in display order.          |
| `relation`  | For relationship cards | One declared relationship type; cannot be combined with `docs`. |
| `relatedTo` | No                     | Source document for `relation`; defaults to this page.          |
| `empty`     | No                     | Message for no results; default is “No matching documents.”     |

Use [RelatedReading](https://www.shoalrun.com/author/components/related-reading.md) when a plain link list grouped by purpose fits better than cards.
