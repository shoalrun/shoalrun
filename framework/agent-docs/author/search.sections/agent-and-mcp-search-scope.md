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

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Search, chat, and agent access > Site search

**Updated: 2026-11-05.**

**Verified: 2026-10-01.**

Parent page: [Full Markdown page](/author/search.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [Preview semantic search in this checkout](https://www.shoalrun.com/recipes/preview-hybrid-search.md) — Build the passage index and verify hybrid search and lexical fallback in this checkout.

Site search returns links to pages and sections. It's enabled by default and matches words in the browser, with no provider account or server required.

Shoalrun supplies the search box and keyboard controls. A **search provider** supplies results; you can replace the built-in provider with your own module. [Search and chat](https://www.shoalrun.com/search-and-chat.md) explains when to add semantic search or cited answers.

## Agent and MCP search scope

`outputs.html.search.provider: semantic` changes the website search box. It doesn't change CLI or MCP search into semantic retrieval. Those tools retain keyword search and explicit publication selection.

Since 0.1.0-alpha.18

A product is part of publication identity, even when a reader facet also uses the name `product`. A saved reader view doesn't choose a product release or remove content from generated files.

For a build containing independently versioned products, select the product release when searching:

```sh
npx --no-install shoalrun search site-dist "missing events" \
  --product payments --channel production --version v3 --language en
```

A local MCP server’s `search_docs` tool accepts the same `product`, `channel`, `version`, and `language` fields. Call `get_publications` first when the scope is unknown; it returns a compact page of published coordinates, not a page inventory. Follow `nextOffset` for more. Follow the returned `read.tool` and `read.arguments` to read the matching page or section in that publication. Don't substitute a current-release page with the same logical ID.

A hosted MCP build still packages one configured publication, including its product when present, and rejects requests for another scope. Its `get_publications` result lists only that endpoint’s publication. A local stdio MCP server can discover and select among publications in its built site. Customer-specific builds expose only their compiled edition; excluded product releases don't become available through search or reader filters.
