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

**Updated: 2026-11-07.**

**Verified: 2026-10-01.**

Parent page: [Full Markdown page](/author/search.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [Preview semantic search in this checkout](https://www.shoalrun.com/recipes/preview-hybrid-search.md) — Build the passage index and verify hybrid search and lexical fallback in this checkout.

Site search returns links to pages and sections. It's enabled by default and matches words in the browser, with no provider account or server required.

Shoalrun supplies the search box and keyboard controls. A **search provider** supplies results; you can replace the built-in provider with your own module. [Search and chat](https://www.shoalrun.com/search-and-chat.md) explains when to add semantic search or cited answers.

## CLI and MCP ranking details

Browser, CLI, and MCP keyword lookups share the precompiled ranking rules. Rebuilding creates the term index; older builds without it retain their previous lexical behavior.

### Partial matches

`matchMode: partial` means no candidate covers all meaningful query terms or their synonyms. Field relevance is balanced against coverage; matching a sparse set of terms doesn't automatically beat a broader match. The returned `total` counts candidates, while `results` respects the requested limit. A large total doesn't mean every candidate is useful.

### Title plurals

Plain words use common English plural forms. Explicit CamelCase and qualified identifiers keep their spelling, so distinct symbols such as `getCredential` and `getCredentials` don't collapse into one name. A reported spelling correction is separate from identifier matching.

### Mixed matches

`matchMode: mixed` means the returned list includes both complete and near-complete candidates. For queries with at least three meaningful terms, a strong candidate missing one term can compete with a weak complete match. A completeness preference alone doesn't establish that a page answers the question.
