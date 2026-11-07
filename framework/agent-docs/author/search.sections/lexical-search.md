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

## Lexical search

The built-in provider uses a precompiled inverted index: each term points to the published pages and sections containing it. Compilation reads the full HTML article and stores term postings rather than another copy of its prose. Browser, CLI, and MCP keyword search use the same lookup engine. Static sites need no server or model credentials.

Titles and headings carry more weight than body mentions, and less common terms help distinguish related pages. Question words such as “how,” “do,” and “the” don't determine coverage. An incidental match for every word can compete with a stronger match covering all but one meaningful term in queries of at least three terms. The browser labels partial and mixed results and suggests refining the query.

Plain-word plural normalization handles common English endings. Limited spelling recovery considers a unique nearby term in visible titles, summaries, or headings. It reports the spelling adjustment and doesn't rewrite quoted text, flags, qualified names, or capitalized identifiers. These rules don't infer meaning; semantic retrieval is a separate provider.

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

Each group works in both directions. Exact word or phrase matches rank above synonym matches. A term can belong to only one group; groups need at least two distinct terms. Phrase matching respects word boundaries, so `walk through` is treated as one term. Shoalrun validates the file during config loading and includes its mapping in `/search-terms.json`, `/search-index.json`, and `ai/chunks.json`. Browser search, `shoalrun search`, and lexical passage retrieval for chat share that vocabulary. Rebuild the site and passage index after editing the file. Custom search providers must read the mapping from `/search-index.json` if they want to apply it to their own results.

### Result ordering and limits

Titles rank above section headings, summaries, and body text. Exact page-title queries open the page itself. Other results can link to a matching section, including a section visible in the selected reader view. The precompiled index retains each section's reader conditions so hidden headings don't supply visible links or ranking evidence.

Changelog entries receive a soft penalty for ordinary queries. Explicit release-history queries retain their release results, and exact-title lookups still work. The semantic provider applies its own modest changelog preference; its scores aren't interchangeable with keyword scores.

The list shows at most eight results, with one result per page. The provider loads and caches the precompiled index on first focus. Product scope Since 0.1.0-alpha.18 includes product, channel, version, and language. Reader selection filters pages and marked sections before scoring. The local CLI doesn't inherit a browser's saved view.
