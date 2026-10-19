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

## Lexical search

The built-in provider matches words rather than meaning. It lowercases the query and recognizes phrases declared in `search.synonyms`.

The browser provider ranks matches in this order:

1. Pages containing every query term or its mapped synonym.
2. If none match completely, partial results ordered by matched term count, then field score.

Common filler words such as “how,” “do,” and “the” do not count toward partial-match coverage. A partial result must match at least one remaining term. This helps sentence-shaped queries but does not infer meaning or handle typos and general stemming.

The [local search command](https://www.shoalrun.com/cli.md) shares the base index and weights, with additional CLI/MCP ranking rules described below.

### Synonyms

Projects can define their own synonym groups of words and phrases. Put them in a YAML file and include it from the site config:

```yaml title="docs.config.yaml"
search:
  synonyms: { $include: ./config/search-synonyms.yaml }
```

The included file lists equivalent words or phrases:

```yaml title="config/search-synonyms.yaml"
- [walkthrough, "walk through", "code tutorial", tutorial]
```

Each group works in both directions. Exact word or phrase matches rank above synonym matches. A term can belong to only one group; groups need at least two distinct terms. Phrase matching respects word boundaries, so `walk through` is treated as one term. Shoalrun validates the file during config loading and includes its mapping in `/search-index.json` and `ai/chunks.json`. Browser search, `shoalrun search`, and lexical passage retrieval for chat share that vocabulary. Rebuild the site and passage index after editing the file. Custom search providers must read the mapping from `/search-index.json` if they want to apply it to their own results.

### Result ordering and limits

Pages rank by where the terms appear:

1. Title, highest when the title starts with the term.
2. Summary.
3. Section headings.
4. Body text.

The built-in lexical provider returns at most one result per page. It adds a section link when every query term matches one section heading and the query is not already a title match. With a reader view selected, it returns page links because the unfiltered heading list may include hidden sections. Custom providers can return multiple section results from the same page.

The list shows the top eight results. The provider downloads the index once, on first focus, and searches only pages in the reader's channel, version, and language. When [reader views](https://www.shoalrun.com/author/reader-views.md) are configured, it also excludes pages and marked section text outside the selected view. The local CLI search command reads the full index and does not apply a browser's saved view.

The navigation sidebar has a separate filter. Its optional node-level `search` terms help readers find menu items; they do not change `/search-index.json` or masthead results. See [Organize site navigation](https://www.shoalrun.com/author/navigation.md).
