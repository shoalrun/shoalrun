---
id: guide.search
title: Site search
summary: Search settings, keyboard behavior, provider interfaces, and index fields.
type: reference
area: discovery
subarea: discovery-search
canonical: /author/search
---

# Site search

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Search and chat > Site search

**Updated: 2026-10-26.**

**Verified: 2026-10-01.**

Parent page: [Full Markdown page](/author/search.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [Preview semantic search in this checkout](https://www.shoalrun.com/recipes/preview-hybrid-search.md) — Build the passage index and verify hybrid search and lexical fallback in this checkout.

Site search returns links to pages and sections. It is enabled by default and matches words in the browser, with no provider account or server required.

Shoalrun supplies the search box and keyboard controls. A **search provider** supplies results; you can replace the built-in provider with your own module. [Search and chat](https://www.shoalrun.com/search-and-chat.md) explains when to add semantic search or cited answers.

## Reuse the lexical index

Set `index: true` to build `/search-index.json` for a custom provider. Use it to load the pages into a client-side library such as MiniSearch or FlexSearch:

```yaml title="docs.config.yaml"
outputs:
  html:
    search:
      provider: custom
      module: ./search/minisearch.js
      index: true
```

The generated index contains one record for each published page:

```json title="search-index.json"
{
  "schemaVersion": 1,
  "documents": [
    {
      "id": "guide.snippets",
      "url": "/author/snippets",
      "markdownUrl": "/author/snippets.md",
      "title": "Reuse prose across pages",
      "summary": "Share validated prose across pages with typed variables.",
      "type": "how-to",
      "variant": "production|current|en",
      "headings": [{ "id": "register-a-snippet", "title": "Register a snippet" }],
      "text": "A snippet is a shared Markdown or MDX fragment…"
    }
  ]
}
```

The index fields have these limits:

- `headings` covers levels 2 through 4, including headings later in the article.
- `text` holds the first 5,000 characters of the HTML article as plain text. Body words beyond that limit are not searchable through this field.
- Titles and the selected summary are indexed separately from body text.
- A section result links to a heading; it does not mean the section's full body was indexed.
- `id` and `markdownUrl` let local tools cite the matching page.

When reader views are enabled, `readerFilters` holds page marks and `readerSegments` holds shared and marked text. A custom provider must apply those marks to respect the selected view. The full text remains in the index; reader views do not restrict access to published files.

The browser index comes from the HTML article, including HTML-only blocks and excluding Markdown-only blocks written with [Only](https://www.shoalrun.com/author/components/only.md). It excludes the surrounding header, navigation, and search UI. Marked sections stay in the stored index; the built-in browser provider filters their text when a view is active. Each `readerSegments` text value is capped at 5,000 characters.

The `summary` field uses `outputs.text.search`, or a page’s `displayText.search` override. Without a configured selection, it uses the frontmatter summary. This site selects description before summary. The lexical provider uses the selected text for ranking and result snippets.
