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

**Updated: 2026-10-19.**

**Verified: 2026-10-01.**

Parent page: [Full Markdown page](/author/search.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [Preview semantic search in this checkout](https://www.shoalrun.com/recipes/preview-hybrid-search.md) — Build the passage index and verify hybrid search and lexical fallback in this checkout.

Site search returns links to pages and sections. It is enabled by default and matches words in the browser, with no provider account or server required.

Shoalrun supplies the search box and keyboard controls. A **search provider** supplies results; you can replace the built-in provider with your own module. [Search and chat](https://www.shoalrun.com/search-and-chat.md) explains when to add semantic search or cited answers.

## CLI and MCP ranking details

CLI and MCP use the lexical index too, with additional ranking rules for documentation lookups. Browser search keeps its complete-match-first, coverage-first behavior.

### Partial matches

When CLI/MCP search has no complete matches, it first finds the highest meaningful-term coverage. Candidates within one term of that coverage, with at least two matched terms, rank by non-filler field score before coverage. Remaining candidates rank by coverage as before. This lets a focused subject match outrank a page containing one extra incidental word, while keeping sparse title matches below better-covered results. Results still report `matchMode: partial`. This rule applies only to CLI/MCP search; browser search retains coverage-first partial ranking.

### Title plurals

CLI and MCP page-title matching also accepts a simple final-`s` query plural against a singular title. It leaves short words and endings `-ss`, `-us`, and `-is` intact. This title-only rule does not add general stemming to body or heading searches.

### Mixed matches

CLI and MCP search can also return a stronger partial match when every complete match gets all meaningful query terms from body text alone. The partial match must contain all but one meaningful term, match at least two, and score higher through title, summary, or heading matches. Common question words cannot earn this preference. A complete match with any meaningful title, summary, or heading match keeps the original preference. Results report `matchMode: mixed` when the exception applies, retain the complete matches, and rank by non-filler field score. This bounded lexical rule does not infer intent or guarantee an answer. The browser search box keeps its complete-match-first behavior.
