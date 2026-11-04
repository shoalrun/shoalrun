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

**Updated: 2026-11-04.**

**Verified: 2026-10-01.**

Parent page: [Full Markdown page](/author/search.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [Preview semantic search in this checkout](https://www.shoalrun.com/recipes/preview-hybrid-search.md) — Build the passage index and verify hybrid search and lexical fallback in this checkout.

Site search returns links to pages and sections. It is enabled by default and matches words in the browser, with no provider account or server required.

Shoalrun supplies the search box and keyboard controls. A **search provider** supplies results; you can replace the built-in provider with your own module. [Search and chat](https://www.shoalrun.com/search-and-chat.md) explains when to add semantic search or cited answers.

## Agent and MCP search scope

`outputs.html.search.provider: semantic` changes the website search box. It does not change CLI or MCP search into semantic retrieval. Those tools retain keyword search and explicit publication selection.

For a multi-version Windows build, select the release when searching:

```sh
npx --no-install shoalrun search windows-site "missing events" \
  --channel production --version 7.1 --language en
```

A local MCP server's `search_docs` tool accepts the same `channel`, `version`, and `language` fields. Follow the returned `read.tool` and `read.arguments` to read the matching page or section in that publication. Do not substitute a current-release page with the same logical ID.

A hosted MCP build packages one configured publication, so its endpoint rejects requests for a different release. Product selection currently comes from the chosen build or endpoint. A combined product/version catalog is not part of this release. Customer-specific builds should expose only their selected edition to these tools.
