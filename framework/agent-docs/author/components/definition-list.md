---
id: guide.component.definition-list
title: Definition lists
summary: Pair terms with full explanations in semantic HTML and readable Markdown.
type: reference
canonical: /author/components/definition-list
---

# Definition lists

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Components > Definition lists

**Updated: 2026-09-27.**

Use `<DefinitionList>` for a compact glossary or configuration reference. Put alternating `<Term>` and `<Definition>` children inside it. Add `filter` when readers need to search a long list by term or definition text.

## Syntax

```mdx
<DefinitionList filter>
<Term>Publication</Term>
<Definition>A channel, version, and language combination.</Definition>
<Term>Slug</Term>
<Definition>The page's public path. See [Page metadata](doc:guide.frontmatter).</Definition>
</DefinitionList>
```

- **Publication**

  A channel, version, and language combination.

- **Slug**

  The page's public path. See [Page metadata](https://www.shoalrun.com/author/frontmatter.md).

`filter` is an optional bare attribute on `<DefinitionList>`. The other tags have no attributes. Terms and definitions must have content; definitions can contain links and rich text. See the [site glossary](https://www.shoalrun.com/glossary.md) for a longer filtered list.

## HTML, Markdown, and agents

HTML uses `<dl>`, `<dt>`, and `<dd>`, with aligned columns on wide screens and stacked pairs on narrow screens. With `filter`, JavaScript adds a labeled search input and a live count above the list. It searches both terms and definitions, hides or shows each pair together, and Escape clears the query. Without JavaScript, every pair remains visible and the filter control stays hidden.

Markdown keeps each term immediately before its full definition in a list, so an agent can read every pair in order. The interactive filter does not appear in Markdown.

## Related reading

### Related topics

- [Glossary](https://www.shoalrun.com/glossary.md) — See a long, filterable definition list in use.
