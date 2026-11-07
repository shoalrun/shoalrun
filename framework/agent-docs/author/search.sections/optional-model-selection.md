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
