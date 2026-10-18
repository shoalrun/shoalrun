---
id: guide.component.doc-link
title: DocLink
summary: Link to a page by stable document ID.
type: reference
canonical: /author/components/doc-link
---

# DocLink

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Components > DocLink

**Updated: 2026-10-17.**

`<DocLink>` resolves a document ID to its URL in the current publication. It is useful in MDX when the link should use a stable target and optionally inherit the target page's title.

## Which link should I use?

Choose a link form based on whether the destination is a document, a section, or an external resource.

| Link                                                        | Use it for                                                                     | What happens                                                |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| `[Read the guide](doc:guide.frontmatter)`                   | Most links to another Shoalrun page.                                           | Resolves the stable document ID in the current publication. |
| `<DocLink doc="guide.frontmatter">Read the guide</DocLink>` | An MDX link by ID, especially when you want the target title as fallback text. | Resolves the same target as `doc:` Markdown.                |
| `[Open the specification](https://example.test/spec)`       | External sites, downloads, or other URLs without a Shoalrun document ID.       | Keeps the authored URL.                                     |
| `[Jump to fields](#fields)`                                 | A section on the current page.                                                 | Keeps the fragment link.                                    |

Prefer `doc:` Markdown for ordinary prose. Both ID-based forms survive a target slug change and fail the build if the target is unavailable in this publication. A normal Markdown link to a Shoalrun route can work, but the authored URL must be updated if that route changes. Raw HTML or JSX anchors such as `<a href="...">` do not have a semantic adapter in this prototype and fail the build; use Markdown links instead.

## Syntax

```mdx
<DocLink doc="guide.frontmatter">Read the frontmatter guide</DocLink>
```

| Attribute | Required | Meaning                                                   |
| --------- | -------- | --------------------------------------------------------- |
| `doc`     | Yes      | Stable ID of a page available in the current publication. |

If the body is empty, the target page title supplies the link text. Keep explicit body text plain. See [content and stable IDs](https://www.shoalrun.com/author/content.md).

## HTML, Markdown, and agents

The build keeps only the plain text inside `DocLink`, so emphasis or code formatting there is dropped. HTML links to the page; the Markdown twin links to its `.md` URL. An agent following that link receives the target’s Markdown page.

## Related reading

### Related topics

- [Content and stable IDs](https://www.shoalrun.com/author/content.md) — Link to pages by stable ID so links survive slug changes.

- [Cards and collections](https://www.shoalrun.com/author/components/cards.md) — Link to a page inline, or show it as a card with its summary.
