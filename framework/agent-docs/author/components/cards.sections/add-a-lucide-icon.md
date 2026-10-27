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

Navigation section: [Reference](https://www.shoalrun.com/.well-known/shoalrun/navigation/reference-tab-50f26fe22670.txt) (ID: reference-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Reference](https://www.shoalrun.com/cli.md) > Components > Cards and collections

**Updated: 2026-10-26.**

Parent page: [Full Markdown page](/author/components/cards.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [Publishing and agent representations](https://www.shoalrun.com/publish/output.md) — Inspect the HTML, Markdown, and manifests produced by the build.

A card is a linked preview of another documentation page: it shows a title and short preview so readers can decide where to go next. Cards use the target page's title, the project's configured `outputs.text.card` field, and its current URL. The target is the page the reader will open when they select the card.

Authors maintain those details in the target page's frontmatter, the YAML metadata at the top of the file. A card references the page's stable `id`, so renaming its file or changing its URL does not break the card. HTML displays a card layout; Markdown displays the same links, descriptions, subject lifecycle status, and relationship reasons as a readable list.

Use these components as standalone, empty blocks in `.md` or `.mdx` pages or registered snippets. Literal attributes are accepted; arbitrary JavaScript expressions are not evaluated.

## Add a Lucide icon

Choose an icon from the [Lucide icon browser](https://lucide.dev/icons/) and put its lowercase name on the target page:

```yaml
card:
  icon: book-open
```

Names use hyphens, such as `book-open`, `credit-card`, `terminal`, or `sliders-horizontal`. The pinned Lucide package supplies the icons at build time. An unknown name or URL fails with a file-specific diagnostic, so typos never silently produce an empty icon. New icons from a later Lucide release need a dependency update first.

The icon appears in every card for that page, including curated lists, collections, and relationship views. It does not change the page heading or sidebar. Omit `card.icon` for a text-only card. Global `frontmatter.defaults.card.icon` and `frontmatter.enforced.card.icon` use the same precedence rules as other card metadata; a page can override a default with another icon name.

Icons are inline SVGs with `aria-hidden="true"` and `focusable="false"`. The visible card title remains the link's accessible name. Icons are decorative, omitted from Markdown, and require no browser JavaScript, font download, or CDN. Only the selected SVG shapes appear in each page. Adjust their color and size with `.doc-card-icon` in `styles/site.css`.

Lucide is open source under the [ISC license](https://lucide.dev/license), with notices for Feather-derived icons. Builds include the package's complete notice at `/assets/lucide-LICENSE.txt`; retain it when deploying the generated site.
