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

**Updated: 2026-10-26.**

Parent page: [Full Markdown page](/author/components/cards.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [Publishing and agent representations](https://www.shoalrun.com/publish/output.md) — Inspect the HTML, Markdown, and manifests produced by the build.

A card is a linked preview of another documentation page: it shows a title and short preview so readers can decide where to go next. Cards use the target page's title, the project's configured `outputs.text.card` field, and its current URL. The target is the page the reader will open when they select the card.

Authors maintain those details in the target page's frontmatter, the YAML metadata at the top of the file. A card references the page's stable `id`, so renaming its file or changing its URL does not break the card. HTML displays a card layout; Markdown displays the same links, descriptions, subject lifecycle status, and relationship reasons as a readable list.

Use these components as standalone, empty blocks in `.md` or `.mdx` pages or registered snippets. Literal attributes are accepted; arbitrary JavaScript expressions are not evaluated.

## Link to one document

```mdx
<DocCard doc="guide.frontmatter" />
```

- [Page metadata](https://www.shoalrun.com/author/frontmatter.md)

  Set page identity, publication, and presentation fields before publishing.

The target must be public and available in the current publication: the channel, API version, and language of the page displaying the card. An unknown, draft, or unavailable target stops the build with a diagnostic. There is no automatic fallback to another publication.
