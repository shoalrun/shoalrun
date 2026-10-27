---
id: guide.custom-metadata
title: Metadata customization
summary: Configure metadata defaults, enforcement, fields, and providers.
type: reference
area: authoring
subarea: authoring-metadata
canonical: /author/custom-metadata
---

# Metadata customization

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Reference](https://www.shoalrun.com/.well-known/shoalrun/navigation/reference-tab-50f26fe22670.txt) (ID: reference-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Reference](https://www.shoalrun.com/cli.md) > Page metadata > Metadata customization

**Updated: 2026-10-26.**

Parent page: [Full Markdown page](/author/custom-metadata.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [Markdown metadata](https://www.shoalrun.com/author/markdown-metadata.md) — Choose which eligible project fields to publish.

Use this guide when your project needs shared metadata rules or fields beyond the [native page metadata](https://www.shoalrun.com/author/frontmatter.md). To choose which values appear in published Markdown, see [Markdown metadata](https://www.shoalrun.com/author/markdown-metadata.md).

## Choose text for each surface

`summary` and `description` are separate fields. The short `summary` is required by Shoalrun; the fuller `description` is optional. Project config chooses an ordered list of field paths for each surface. The first nonempty string wins:

```yaml title="docs.config.yaml"
outputs:
  text:
    card: [summary]
    pageHeader: [summary]
    search: [description, summary]
    htmlDescription: [description, summary]
    socialCard: [summary]
```

`socialCard` writes an Open Graph description tag when it finds text; it does not generate a card image. Without a `socialCard` rule or page override, Shoalrun writes no Open Graph description. The other surfaces default to `summary` if no rule is set. The search choice becomes the summary in `search-index.json`. A card's existing `card.description` and an HTML page's existing `seo.description` take precedence over these rules.

Override one surface on a page with literal text:

```yaml title="A page's frontmatter"
displayText:
  socialCard: A short introduction for link previews.
```

`displayText` is presentation control; it is not exported as Markdown metadata. A configured text rule can also select a custom or provider-supplied string field by path. Selecting it for public HTML or the search index is an explicit publication decision.
