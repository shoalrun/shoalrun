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

**Updated: 2026-10-26.**

**Verified: 2026-10-01.**

Parent page: [Full Markdown page](/author/search.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [Preview semantic search in this checkout](https://www.shoalrun.com/recipes/preview-hybrid-search.md) — Build the passage index and verify hybrid search and lexical fallback in this checkout.

Site search returns links to pages and sections. It is enabled by default and matches words in the browser, with no provider account or server required.

Shoalrun supplies the search box and keyboard controls. A **search provider** supplies results; you can replace the built-in provider with your own module. [Search and chat](https://www.shoalrun.com/search-and-chat.md) explains when to add semantic search or cited answers.

## Local semantic preview

The optional search endpoint uses vector similarity when current query and passage embeddings are available. It falls back to keyword passage search if vectors are unavailable, the provider fails, the budget is exhausted, or the deadline expires.

For dotted configuration keys or command flags, the endpoint can add an exact-identifier explanation as the third result. It must contain every requested identifier in prose; tables, code listings, and identifier prefixes do not qualify. The first two semantic results stay in place. File-name queries and requests for fewer than three results keep semantic ranking.

Result snippets prefer prose matching the substantive words in your question, omit generated discovery text, and keep a matching term visible in a long paragraph. Code-only and table-only passages use the page summary.

[Preview semantic search in this checkout](https://www.shoalrun.com/recipes/preview-hybrid-search.md) covers the embedding provider key, passage index, local endpoint, lexical fallback, and Network inspector checks.
