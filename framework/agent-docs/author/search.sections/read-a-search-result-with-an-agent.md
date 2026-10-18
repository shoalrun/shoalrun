---
id: guide.search
title: Site search
summary: Search settings, keyboard behavior, provider interfaces, and index fields.
type: reference
canonical: /author/search
---

# Site search

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Search and chat > Site search

**Updated: 2026-10-18.**

**Verified: 2026-10-01.**

Parent page: [Full Markdown page](/author/search.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [Preview semantic search in this checkout](https://www.shoalrun.com/recipes/preview-hybrid-search.md) — Build the passage index and verify hybrid search and lexical fallback in this checkout.

Site search returns links to pages and sections. It is enabled by default and matches words in the browser, with no provider account or server required.

Shoalrun supplies the search box and keyboard controls. A **search provider** supplies results; you can replace the built-in provider with your own module. [Search and chat](https://www.shoalrun.com/search-and-chat.md) explains when to add semantic search or cited answers.

## Read a search result with an agent

CLI and MCP search results include a ready-to-use `read` instruction: call `read.tool` with `read.arguments`. This selects `get_section` only when one eligible, author-declared standalone section heading matches the query after common English request wording and page-title context are removed. CLI/MCP ranking favors complete multiword matches to eligible section headings over incidental page-title words. Broad, ambiguous, cross-section, or undeclared-section queries select `get_page`. No outline request is needed first.

The result's `markdownUrl` points to the recommended section or page, with its byte/token size when available. `pageMarkdownUrl` always points to the full page. Use that fallback when more context is needed. This is a lexical recommendation, not proof that the selected content answers the question. Page reads can still truncate at the maximum budget; inspect their budget metadata.

Section resources exist only for pages of at least 2,000 `cl100k_base` tokens and only when they halve both bytes and tokens, including repeated context. Both search indexes include eligible section titles, URLs, sizes, and any `standalone: true` declaration without duplicating section bodies. Fetch-only agents should start with `/llms.min.txt`, which lists full pages and declared standalone section links with sizes and full-page fallbacks. The larger compact JSON index is optional when more headings are needed. The human search box continues to open HTML page or heading links. See [Markdown section resources](https://www.shoalrun.com/author/markdown-metadata.md).
