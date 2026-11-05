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

**Updated: 2026-11-05.**

**Verified: 2026-10-01.**

Parent page: [Full Markdown page](/author/search.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [Preview semantic search in this checkout](https://www.shoalrun.com/recipes/preview-hybrid-search.md) — Build the passage index and verify hybrid search and lexical fallback in this checkout.

Site search returns links to pages and sections. It's enabled by default and matches words in the browser, with no provider account or server required.

Shoalrun supplies the search box and keyboard controls. A **search provider** supplies results; you can replace the built-in provider with your own module. [Search and chat](https://www.shoalrun.com/search-and-chat.md) explains when to add semantic search or cited answers.

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

Keys remain server-side. Each semantic query calls the embedding provider; no chat model is required. The browser sends the selected publication and reader view with each request. A missing or unavailable endpoint uses the included browser keyword index. Requests cancelled by further typing don't start fallback searches.

Confirm `mode: vector` in the endpoint response to verify semantic retrieval. Rebuild and reindex edited content, then restart the local server. The [passage index](https://www.shoalrun.com/chat/passage-index.md) explains input reuse and release-specific passage identities.

This setting selects the browser connection; it doesn't provision production hosting. The current [Vercel integration](https://www.shoalrun.com/publish/vercel.md) supplies search through its chat-function deployment. Profiled Vercel chat-function builds remain unsupported. Static deployments retain keyword search when no endpoint is present. Custom search services can continue to use `provider: custom`.
