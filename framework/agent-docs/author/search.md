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

Site search returns links to pages and sections. It's enabled by default and matches words in the browser, with no provider account or server required.

Shoalrun supplies the search box and keyboard controls. A **search provider** supplies results; you can replace the built-in provider with your own module. [Search and chat](https://www.shoalrun.com/search-and-chat.md) explains when to add semantic search or cited answers.

## Choose a provider

Set the provider under `outputs.html.search`:

```yaml title="docs.config.yaml"
outputs:
  html:
    search:
      provider: lexical
```

| Provider   | Behavior                                                                                         |
| ---------- | ------------------------------------------------------------------------------------------------ |
| `lexical`  | The default. Compiles `/search-terms.json` during the build and searches it in the browser.      |
| `semantic` | Uses Shoalrun’s same-origin search endpoint, with browser keyword fallback. Since 0.1.0-alpha.16 |
| `custom`   | Loads your browser module. Needs `module`; `index` is optional.                                  |
| `none`     | Removes the search box. Writes no index or provider file.                                        |

The build copies the provider module to `/assets/search-provider.js`. The search box imports that file when a reader first focuses the box or types.

## Enable included semantic search

Since 0.1.0-alpha.16

Choose the included semantic provider to connect the search box to Shoalrun's endpoint without writing a browser adapter:

```yaml title="docs.config.yaml"
outputs:
  html:
    search:
      provider: semantic
retrieval:
  embeddings:
    provider: voyage
    model: voyage-4-large
    queryModel: voyage-4-lite
    dimension: 1024
```

Set `VOYAGE_API_KEY` in the terminal environment, then build the site, embed its passages, and start the local endpoint:

```sh
npx --no-install shoalrun build docs.config.yaml site-dist
npx --no-install shoalrun index site-dist --embed --config docs.config.yaml
npx --no-install shoalrun serve site-dist --search --config docs.config.yaml
```

Keys remain server-side. Ordinary semantic queries call the embedding provider; no chat model is required. Exact indexed symbols can use the keyword path without an embedding request. The browser sends the selected publication and reader view with each request. A missing or unavailable endpoint uses the included browser keyword index. Requests cancelled by further typing don't start fallback searches.

Confirm `mode: vector` in the endpoint response to verify semantic retrieval. Rebuild and reindex edited content, then restart the local server. The [passage index](https://www.shoalrun.com/chat/passage-index.md) explains input reuse and release-specific passage identities.

This setting selects the browser connection; it doesn't provision production hosting. The current [Vercel integration](https://www.shoalrun.com/publish/vercel.md) supplies search through its chat-function deployment. Profiled Vercel chat-function builds remain unsupported. Static deployments retain keyword search when no endpoint is present. Custom search services can continue to use `provider: custom`.

## Use the search box

Press `/` or `Ctrl`+`K` (`⌘`+`K` on macOS) to focus the box. Use the arrow keys to move through results, Enter to open one, and Escape to close the list. When a match falls inside a section, the result names the section and links to its heading.

The box needs JavaScript. Without it, both the search box and sidebar filter stay hidden; the published navigation links still work.

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

Other hosting platforms need an adapter that runs Shoalrun's hosted search handler, passes the site's settings, and connects the shared counter store. Shoalrun doesn't automatically apply these limits to another host or a customer's search service. A static-only deployment can use the built-in browser keyword provider without a server function.

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

| Field             | Value                                                                                                                                                                                                                                                       |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `variant`         | The page’s publication key. Productless keys stay `channel\|version\|language`, such as `production\|current\|en`. Product publication keys append the product, such as `production\|v3\|en\|payments`. Forward this key unchanged; don't drop its product. |
| `language`        | The page's `lang` value.                                                                                                                                                                                                                                    |
| `indexUrl`        | The base-path-prefixed `/search-index.json` URL. The file exists only when the build writes an index.                                                                                                                                                       |
| `limit`           | The maximum number of results the box shows.                                                                                                                                                                                                                |
| `signal`          | An `AbortSignal`, passed to `search` only. It aborts when the reader types again.                                                                                                                                                                           |
| `readerSelection` | The active reader view as facet IDs mapped to arrays of choice IDs. An empty object means show all. Custom providers must use it to filter their results.                                                                                                   |

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

The build copies one file. It doesn't copy files that the module imports with relative paths. Bundle the provider into one file, or import dependencies from absolute URLs.

## Reuse the lexical index

The built-in search paths read `/search-terms.json`, which stores document metadata, scoped fields, and compressed term postings for the full published HTML article. Phrase positions are retained for configured multiword synonyms. Section conditions are evaluated during lookup. Build-time exclusions are removed before indexing; reader views remain presentation controls over published content.

`/search-index.json` remains available as the excerpt-oriented format below for custom providers and existing consumers. Its 5,000-character excerpt limit doesn't limit the precompiled term index.

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
- `text` holds the first 5,000 characters of the HTML article as plain text. Body words beyond that limit aren't searchable through this field.
- Titles and the selected summary are indexed separately from body text.
- A section result links to a heading; it doesn't mean the section's full body was indexed.
- `id` and `markdownUrl` let local tools cite the matching page.

When reader views are enabled, `readerFilters` holds page marks and `readerSegments` holds shared and marked text. A custom provider must apply those marks to respect the selected view. The full text remains in the index; reader views don't restrict access to published files.

The browser index comes from the HTML article, including HTML-only blocks and excluding Markdown-only blocks written with [Only](https://www.shoalrun.com/author/components/only.md). It excludes the surrounding header, navigation, and search UI. Marked sections stay in the stored index; the built-in browser provider filters their text when a view is active. Each `readerSegments` text value is capped at 5,000 characters.

The `summary` field uses `outputs.text.search`, or a page’s `displayText.search` override. Without a configured selection, it uses the frontmatter summary. This site selects description before summary. The lexical provider uses the selected text for ranking and result snippets.

## Optional model selection

A hosted semantic search endpoint can ask a configured decision model to choose one landing page from a bounded shortlist. The model receives the query, page titles and types, summaries, and selected passage text. It can promote an existing candidate; it can't invent a URL, generate an answer, or expand the selected publication or reader view.

```yaml title="docs.config.yaml"
search:
  rerank:
    provider: decisions
    endpoint: https://openrouter.ai/api/alpha/decisions
    model: liquid/d1-ultra-20261015
    keyEnv: OPENROUTER_API_KEY
    maxCandidates: 12
    timeoutMs: 750
```

This example uses a pinned model release and an OpenRouter endpoint. Any compatible typed-decision endpoint can be configured with its own model and credential variable. Set the named variable in the server environment; credentials never belong in browser code or configuration files. Reranking is off by default and isn't required for keyword or vector retrieval.

Exact page titles, technical identifier queries, and explicit release-history queries retain their retrieval order. Other queries may use the model after publication and reader filtering. Invalid model output, failures, and deadlines leave the original order available. A model choosing no candidate also preserves results when keyword evidence exists. When both the model and keyword lookup find no support, the endpoint returns no matches. Model requests share the semantic query's spending reservation. Static search and keyword fallback don't call the decision model.

Compare representative queries before enabling a model. A model that follows source rules accurately may still make search rankings worse. Its probability scores aren't interchangeable with another model's. The endpoint reports whether reranking ran and whether it fell back; it doesn't return the model's evidence or credentials.

## Turn search off

Set the provider to `none` to remove the browser search box and its page index:

```yaml title="docs.config.yaml"
outputs:
  html:
    search:
      provider: none
```

This removes both the reader search box and its index, so the local search command has nothing to query. Markdown twins, `/llms.txt`, and `/documents.json` don't change with the provider. Agents can still discover and fetch pages, but `shoalrun search` needs a generated term index or legacy search index. The passage index and semantic endpoint are independent of this browser setting. Changing it doesn't remove those artifacts or disable a deployed endpoint.

## Local semantic preview

The optional search endpoint uses vector similarity when current query and passage embeddings are available. The browser resolves exact indexed symbols and qualified identifiers locally when possible. Direct endpoint requests use the same keyword rules without a query embedding. Queries without letters or numbers return no results. Unsupported flags and qualified names return no exact match rather than unrelated semantic guesses. It falls back to keyword passage search if vectors are unavailable, the provider fails, the budget is exhausted, or the deadline expires.

For dotted configuration keys or command flags, the endpoint can add an exact-identifier explanation as the third result. It must contain every requested identifier in prose; tables, code listings, and identifier prefixes don't qualify. The first two semantic results stay in place. File-name queries and requests for fewer than three results keep semantic ranking.

Result snippets prefer prose matching the substantive words in your question, omit generated discovery text, and keep a matching term visible in a long paragraph. Code-only and table-only passages use the page summary.

[Preview semantic search in this checkout](https://www.shoalrun.com/recipes/preview-hybrid-search.md) covers the embedding provider key, passage index, local endpoint, lexical fallback, and Network inspector checks.

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

## CLI and MCP ranking details

Browser, CLI, and MCP keyword lookups share the precompiled ranking rules. Rebuilding creates the term index; older builds without it retain their previous lexical behavior.

### Partial matches

`matchMode: partial` means no candidate covers all meaningful query terms or their synonyms. Field relevance is balanced against coverage; matching a sparse set of terms doesn't automatically beat a broader match. The returned `total` counts candidates, while `results` respects the requested limit. A large total doesn't mean every candidate is useful.

### Title plurals

Plain words use common English plural forms. Explicit CamelCase and qualified identifiers keep their spelling, so distinct symbols such as `getCredential` and `getCredentials` don't collapse into one name. A reported spelling correction is separate from identifier matching.

### Mixed matches

`matchMode: mixed` means the returned list includes both complete and near-complete candidates. For queries with at least three meaningful terms, a strong candidate missing one term can compete with a weak complete match. A completeness preference alone doesn't establish that a page answers the question.

## Read a search result with an agent

CLI and MCP search results include a ready-to-use `read` instruction: call `read.tool` with `read.arguments`. This selects `get_section` only when one eligible, author-declared standalone section heading matches the query after common English request wording and page-title context are removed. CLI/MCP ranking favors complete multiword matches to eligible section headings over incidental page-title words. Broad, ambiguous, cross-section, or undeclared-section queries select `get_page`. No outline request is needed first.

The result's `markdownUrl` points to the recommended section or page, with its byte/token size when available. `pageMarkdownUrl` always points to the full page. Use that fallback when more context is needed. This is a lexical recommendation, not proof that the selected content answers the question. Page reads can still truncate at the maximum budget; inspect their budget metadata.

Section resources exist only for pages of at least 2,000 `cl100k_base` tokens and only when they halve both bytes and tokens, including repeated context. Both search indexes include eligible section titles, URLs, sizes, and any `standalone: true` declaration without duplicating section bodies. Fetch-only agents should start with `/llms.min.txt`, which links to full pages and declared standalone sections, directly or through topic indexes. Each compact index is limited to 2,000 `cl100k_base` tokens; growing topics split automatically. Standalone links retain sizes and full-page fallbacks. The larger compact JSON index is optional when more headings are needed. The human search box continues to open HTML page or heading links. See [Markdown section resources](https://www.shoalrun.com/author/markdown-metadata.md).

## HTML, Markdown, and agents

The search results dropdown is an HTML interaction. It links to published pages and sections; it isn't written into a page's Markdown twin. An agent can read the same published Markdown pages through their `.md` routes and discovery files. The publication dropdown changes the active HTML product release and the search scope. It doesn't appear as an interactive control in Markdown. Agents retain the product/channel/version/language coordinates in CLI or MCP reads; a repeated page ID in another product is a different publication. The local semantic endpoint returns links and short text, not an answer or a new agent-only representation. [Publishing and agent representations](https://www.shoalrun.com/publish/output.md) describes the Markdown routes and discovery files.

## Related reading

### Next steps

- [Preview semantic search in this checkout](https://www.shoalrun.com/recipes/preview-hybrid-search.md) — Build the passage index and verify hybrid search and lexical fallback in this checkout.

### Reference while working

- [CLI reference](https://www.shoalrun.com/cli.md) — Query a built site's search index without a server.

### Related topics

- [Header links](https://www.shoalrun.com/styling/header.md) — The search box sits in the site header, before your header links.

- [How documentation answers work](https://www.shoalrun.com/chat.md) — Use retrieved passages to produce cited answers instead of page links. (Status: experimental.)

- [Agent authoring, search, and documentation answers](https://www.shoalrun.com/changelog/authoring-search.md) — Configure semantic search and lexical fallback.
