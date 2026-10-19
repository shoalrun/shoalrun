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
