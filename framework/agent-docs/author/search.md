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

Site search returns links to pages and sections. It is enabled by default and matches words in the browser, with no provider account or server required.

Shoalrun supplies the search box and keyboard controls. A **search provider** supplies results; you can replace the built-in provider with your own module. [Search and chat](https://www.shoalrun.com/search-and-chat.md) explains when to add semantic search or cited answers.

## Choose a provider

Set the provider under `outputs.html.search`:

```yaml title="docs.config.yaml"
outputs:
  html:
    search:
      provider: lexical
```

| Provider  | Behavior                                                                |
| --------- | ----------------------------------------------------------------------- |
| `lexical` | The default. Builds `/search-index.json` and matches it in the browser. |
| `custom`  | Loads your browser module. Needs `module`; `index` is optional.         |
| `none`    | Removes the search box. Writes no index or provider file.               |

The build copies the provider module to `/assets/search-provider.js`. The search box imports that file when a reader first focuses the box or types.

## Use the search box

Press `/` or `Ctrl`+`K` (`⌘`+`K` on macOS) to focus the box. Use the arrow keys to move through results, Enter to open one, and Escape to close the list. When a match falls inside a section, the result names the section and links to its heading.

The box needs JavaScript. Without it, both the search box and sidebar filter stay hidden; the published navigation links still work.

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

## Hosted semantic search limits

Shoalrun's hosted search endpoint accepts site-specific limits, separate from the Ask budget:

```yaml title="docs.config.yaml"
search:
  limits:
    perCallerPerDay: 100
    perDay: 1000
    perCallerPerMinute: 10
```

These are the defaults. Each value must be a positive whole number. They apply to Shoalrun's hosted semantic search handler; the built-in browser keyword provider and third-party search services manage their own limits.

The Vercel adapter wires these settings into the generated search function when hosted search is included in the build. Configure the embedding provider and shared Redis/KV credentials in the hosting environment. See [Publish on Vercel](https://www.shoalrun.com/publish/vercel.md).

Other hosting platforms need an adapter that runs Shoalrun's hosted search handler, passes the site's settings, and connects the shared counter store. Shoalrun does not automatically apply these limits to another host or a customer's search service. A static-only deployment can use the built-in browser keyword provider without a server function.

Daily limits count attempts to embed a query and reset at midnight UTC. A caller is identified by the forwarded IP address, so people sharing a network can share an allowance. The site-wide limit applies across callers using the same counter store. Use a separate store for each site's independent allowance.

When a daily allowance is spent, search returns keyword results. Provider failures and the semantic deadline also retain keyword results. The endpoint reports `mode` and a `fallbackReason` for keyword responses, and the host logs the reason without query text. A denied budget can mean an exhausted allowance or a counter-store failure; store errors are logged separately. Requests above the per-minute limit receive HTTP 429 with `Retry-After`.

## Write a custom provider

A provider is one ES module. It must export `search`, and it can export `prepare`:

```js title="search/hosted.js"
const endpoint = 'https://search.example.com/query';

// Optional. Runs when the reader first focuses the box.
export async function prepare({ language }) {
  await fetch(`${endpoint}/warm?language=${language}`);
}

export async function search(query, { language, limit, signal }) {
  const params = new URLSearchParams({ q: query, language, limit: String(limit) });
  const response = await fetch(`${endpoint}?${params}`, { signal });
  if (!response.ok) throw new Error(`Search failed: ${response.status}`);
  const { hits } = await response.json();
  return hits.map(hit => ({ url: hit.path, title: hit.title, summary: hit.snippet }));
}
```

Register the module in the config:

```yaml title="docs.config.yaml"
outputs:
  html:
    search:
      provider: custom
      module: ./search/hosted.js
```

The `module` path resolves from the config file that declares it. The module is a build dependency, so a rebuild picks up changes.

### Search context

The search box passes a context object to both functions.

| Field             | Value                                                                                                                                                     |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `variant`         | The page's channel, version, and language, joined by `\|`, such as `production\|current\|en`.                                                             |
| `language`        | The page's `lang` value.                                                                                                                                  |
| `indexUrl`        | The base-path-prefixed `/search-index.json` URL. The file exists only when the build writes an index.                                                     |
| `limit`           | The maximum number of results the box shows.                                                                                                              |
| `signal`          | An `AbortSignal`, passed to `search` only. It aborts when the reader types again.                                                                         |
| `readerSelection` | The active reader view as facet IDs mapped to arrays of choice IDs. An empty object means show all. Custom providers must use it to filter their results. |

Pass `signal` to `fetch` so stale requests stop. The box ignores results from an aborted search.

### Search results

`search` returns an array, or a promise of one. Each result is an object:

| Field     | Required | Value                                                                      |
| --------- | -------- | -------------------------------------------------------------------------- |
| `url`     | Yes      | A site-root path or `http(s)` URL. Add `#heading-id` to link to a section. |
| `title`   | Yes      | The page title.                                                            |
| `summary` | No       | One line of supporting text.                                               |
| `section` | No       | A section title, shown after the page title.                               |

The box drops results without a valid `url` and `title`, and it keeps the first `limit` results. It escapes all text and highlights query terms itself. If `search` throws, the box shows "Search is unavailable right now."

### Module limits

The build copies one file. It does not copy files that the module imports with relative paths. Bundle the provider into one file, or import dependencies from absolute URLs.

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

## Turn search off

Set the provider to `none` to remove the browser search box and its page index:

```yaml title="docs.config.yaml"
outputs:
  html:
    search:
      provider: none
```

This removes both the reader search box and its index, so the local search command has nothing to query. Markdown twins, `/llms.txt`, and `/documents.json` do not change with the provider. Agents can still discover and fetch pages, but `shoalrun search` cannot query a missing `search-index.json`. The passage index and semantic endpoint are independent of this browser setting. Changing it does not remove those artifacts or disable a deployed endpoint.

## Local semantic preview

The optional search endpoint uses vector similarity when current query and passage embeddings are available. It falls back to keyword passage search if vectors are unavailable, the provider fails, the budget is exhausted, or the deadline expires.

For dotted configuration keys or command flags, the endpoint can add an exact-identifier explanation as the third result. It must contain every requested identifier in prose; tables, code listings, and identifier prefixes do not qualify. The first two semantic results stay in place. File-name queries and requests for fewer than three results keep semantic ranking.

Result snippets prefer prose matching the substantive words in your question, omit generated discovery text, and keep a matching term visible in a long paragraph. Code-only and table-only passages use the page summary.

[Preview semantic search in this checkout](https://www.shoalrun.com/recipes/preview-hybrid-search.md) covers the embedding provider key, passage index, local endpoint, lexical fallback, and Network inspector checks.

## CLI and MCP ranking details

CLI and MCP use the lexical index too, with additional ranking rules for documentation lookups. Browser search keeps its complete-match-first, coverage-first behavior.

### Partial matches

When CLI/MCP search has no complete matches, it first finds the highest meaningful-term coverage. Candidates within one term of that coverage, with at least two matched terms, rank by non-filler field score before coverage. Remaining candidates rank by coverage as before. This lets a focused subject match outrank a page containing one extra incidental word, while keeping sparse title matches below better-covered results. Results still report `matchMode: partial`. This rule applies only to CLI/MCP search; browser search retains coverage-first partial ranking.

### Title plurals

CLI and MCP page-title matching also accepts a simple final-`s` query plural against a singular title. It leaves short words and endings `-ss`, `-us`, and `-is` intact. This title-only rule does not add general stemming to body or heading searches.

### Mixed matches

CLI and MCP search can also return a stronger partial match when every complete match gets all meaningful query terms from body text alone. The partial match must contain all but one meaningful term, match at least two, and score higher through title, summary, or heading matches. Common question words cannot earn this preference. A complete match with any meaningful title, summary, or heading match keeps the original preference. Results report `matchMode: mixed` when the exception applies, retain the complete matches, and rank by non-filler field score. This bounded lexical rule does not infer intent or guarantee an answer. The browser search box keeps its complete-match-first behavior.

## Read a search result with an agent

CLI and MCP search results include a ready-to-use `read` instruction: call `read.tool` with `read.arguments`. This selects `get_section` only when one eligible, author-declared standalone section heading matches the query after common English request wording and page-title context are removed. CLI/MCP ranking favors complete multiword matches to eligible section headings over incidental page-title words. Broad, ambiguous, cross-section, or undeclared-section queries select `get_page`. No outline request is needed first.

The result's `markdownUrl` points to the recommended section or page, with its byte/token size when available. `pageMarkdownUrl` always points to the full page. Use that fallback when more context is needed. This is a lexical recommendation, not proof that the selected content answers the question. Page reads can still truncate at the maximum budget; inspect their budget metadata.

Section resources exist only for pages of at least 2,000 `cl100k_base` tokens and only when they halve both bytes and tokens, including repeated context. Both search indexes include eligible section titles, URLs, sizes, and any `standalone: true` declaration without duplicating section bodies. Fetch-only agents should start with `/llms.min.txt`, which lists full pages and declared standalone section links with sizes and full-page fallbacks. The larger compact JSON index is optional when more headings are needed. The human search box continues to open HTML page or heading links. See [Markdown section resources](https://www.shoalrun.com/author/markdown-metadata.md).

## HTML, Markdown, and agents

The dropdown is an HTML interaction. It links to published pages and sections; it is not written into a page's Markdown twin. An agent can read the same published Markdown pages through their `.md` routes and discovery files. The local semantic endpoint returns links and short text, not an answer or a new agent-only representation. [Publishing and agent representations](https://www.shoalrun.com/publish/output.md) describes the Markdown routes and discovery files.

## Related reading

### Next steps

- [Preview semantic search in this checkout](https://www.shoalrun.com/recipes/preview-hybrid-search.md) — Build the passage index and verify hybrid search and lexical fallback in this checkout.

### Reference while working

- [CLI reference](https://www.shoalrun.com/cli.md) — Query a built site's search index without a server.

### Related topics

- [Header links](https://www.shoalrun.com/styling/header.md) — The search box sits in the site header, before your header links.

- [How documentation answers work](https://www.shoalrun.com/chat.md) — Use retrieved passages to produce cited answers instead of page links. (Status: experimental.)

- [Agent authoring, search, and documentation answers](https://www.shoalrun.com/changelog/authoring-search.md) — Configure semantic search and lexical fallback.
