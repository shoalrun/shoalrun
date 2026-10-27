---
id: recipe.preview-hybrid-search
title: Preview semantic search in this checkout
summary: Build the Shoalrun docs, index passages, and verify vector retrieval
  and lexical fallback locally.
type: recipe
area: discovery
subarea: discovery-search
canonical: /recipes/preview-hybrid-search
---

# Preview semantic search in this checkout

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Examples](https://www.shoalrun.com/.well-known/shoalrun/navigation/examples-tab-50f26fe22670.txt) (ID: examples-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Examples](https://www.shoalrun.com/config/examples.md) > Maintain this documentation site > Preview semantic search in this checkout

**Updated: 2026-10-26.**

Build the Shoalrun docs, index passages, and verify vector retrieval and lexical fallback locally.

## Before you start

- `repositoryCheckout`: A Shoalrun checkout with dependencies installed. Run commands from its root with Node.js 22.12 or newer.
- `embeddingCredentials`: A shell-readable environment file at `~/.config/shoalrun/.env` containing the key for the embedding provider configured under `retrieval.embeddings`. This site's current config uses Voyage; the key stays on the server.
- `previewPort`: Port 8770, available for the preview server. If occupied, use another port with the CLI and adjust the URL.

## Build and index the docs

- Use `repositoryCheckout` and `embeddingCredentials` from **Before you start**.

```sh
npm run docs:build
set -a; . ~/.config/shoalrun/.env; set +a
npm run docs:index
```

The build writes `search-index.json`. The index command sends documentation passages to the configured **embedding provider** and generates or reuses passage vectors. Each semantic query also calls the embedding provider. No chat model is needed for search.

If indexing reports a missing key or provider error, check `retrieval.embeddings` and the environment file, then rerun indexing. The [passage index guide](https://www.shoalrun.com/chat/passage-index.md) explains digests and vector reuse.

Save `indexedSite`: The successful site build and current passage index under docs/dist.

**Continue when:** The build and index commands both succeed.

## Start the semantic endpoint

- Use `indexedSite` from **Build and index the docs** and `previewPort` from **Before you start**.

```sh
npm run docs:search-preview
```

Open `http://127.0.0.1:8770/`. This command occupies the terminal. Restart it after rebuilding the passage index, because the local endpoint reads its files at startup. Vector results include only passages with current embeddings. Reindex after editing pages so semantic results include the changed passages. A literal configuration key or command flag can also recover one word-matching explanation, but this is not a substitute for refreshing vectors.

The browser search provider first asks `/__shoalrun/search`. That endpoint ranks passages by embedding similarity and returns page or section links. Successful semantic queries keep their first two pages ranked by meaning. A question containing dotted configuration keys or command flags can include one exact-identifier prose explanation as the third result. Filenames and requests for fewer than three results keep semantic ranking. It does not call the chat model. If the endpoint has no current vectors, it returns lexical passage results. If the endpoint is missing, slow, or fails, the browser uses `search-index.json` for lexical page search.

Save `runningPreview`: The local site and search endpoint while the server is running.

**Continue when:** The homepage and its search box load.

## Verify the retrieval mode

- Use `runningPreview` from **Start the semantic endpoint**.

Search for `navigation`, then describe a task in your own words without copying a page title or sentence. For example, ask about reusing warnings across documentation. Lexical search can now return partial matches for the sentence; returning a result alone does not prove semantic retrieval worked.

In the browser Network inspector, inspect `/__shoalrun/search`. A successful response with `"mode": "vector"` confirms the endpoint used embeddings. `"mode": "lexical"` means the endpoint returned word-matching results. It can do this when current document vectors are missing, the embedding budget is exhausted, the provider fails, or the three-second deadline expires. The response mode alone does not tell you whether document vectors exist. A failed request followed by results demonstrates the browser provider's lexical fallback. For a preview without the endpoint, stop this server and run `npm run docs:preview`.

Save `modeEvidence`: The response mode and relevant page or section links for the queries.

**Continue when:** You can identify the active retrieval mode and open a relevant result.

## Check the outcome

The indexed site serves local search, results open relevant documentation, and the Network inspector distinguishes vector retrieval from the lexical endpoint or browser fallback. Press **Ctrl+C** to stop the server.

## Related reading

### Next steps

- [Passage index](https://www.shoalrun.com/chat/passage-index.md) — Understand passage digests, embedding input, and vector reuse. (Status: experimental.)
