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

## Override card text

By default, a card shows the target page's `title` and `summary`. These are the resolved values after global defaults, page frontmatter, and enforced values have been applied. Add an optional `card` object to the target page's frontmatter when its card needs different wording.

An **eyebrow** is a short label above the card title, such as “Integration guide” or “Tutorial.” It helps readers recognize the kind of content before reading the title. It is optional display text; it does not set the document's type, add a tag, or affect collection filters. In this example, “Integration guide” appears above “Send your first payment”:

```yaml
title: Create a payment
summary: Submit a payment and understand the result.
card:
  icon: credit-card
  title: Send your first payment
  description: Prepare the request and inspect the response.
  eyebrow: Integration guide
```

| Field              | What it displays                                  | When omitted                                                        |
| ------------------ | ------------------------------------------------- | ------------------------------------------------------------------- |
| `card.title`       | The linked heading inside the card.               | Uses the document `title`.                                          |
| `card.description` | A short explanation of what the reader will find. | Uses `outputs.text.card`, which defaults to the document `summary`. |
| `card.eyebrow`     | A small label above the title.                    | No label.                                                           |
| `card.icon`        | A decorative Lucide symbol above the text.        | No icon, unless inherited from global frontmatter.                  |

These overrides affect cards only. The page heading, SEO, and navigation keep their existing values. A card's destination always comes from the stable ID; `href` overrides are not supported. Values must be nonempty strings. Images, arbitrary badges, and other card fields are not implemented and fail with a diagnostic. Subject lifecycle status comes from the target document, including authoritative OpenAPI deprecation.

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

## HTML, Markdown, and agents

HTML renders cards and collections as linked previews, with decorative icons when configured. Markdown expands each result into a readable link with its description, status, and relationship reason when present. An agent receives the same destinations and context without relying on the card layout or icons. Both outputs include only public matches from the current publication.

## Related reading

### Next steps

- [Publishing and agent representations](https://www.shoalrun.com/publish/output.md) — Inspect the HTML, Markdown, and manifests produced by the build.

### Related topics

- [Page metadata](https://www.shoalrun.com/author/frontmatter.md) — Configure shared metadata and optional card text overrides.

- [DocLink](https://www.shoalrun.com/author/components/doc-link.md) — Link to a page inline, or show it as a card with its summary.

### Often confused with

- [Related reading](https://www.shoalrun.com/author/related-reading.md) — Related reading follows authored relationships with reasons; cards and collections show pages you pick by ID or filter by metadata.
