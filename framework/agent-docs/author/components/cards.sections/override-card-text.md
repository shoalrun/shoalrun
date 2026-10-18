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
