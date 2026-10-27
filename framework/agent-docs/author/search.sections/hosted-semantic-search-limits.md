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

**Updated: 2026-10-26.**

**Verified: 2026-10-01.**

Parent page: [Full Markdown page](/author/search.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [Preview semantic search in this checkout](https://www.shoalrun.com/recipes/preview-hybrid-search.md) — Build the passage index and verify hybrid search and lexical fallback in this checkout.

Site search returns links to pages and sections. It is enabled by default and matches words in the browser, with no provider account or server required.

Shoalrun supplies the search box and keyboard controls. A **search provider** supplies results; you can replace the built-in provider with your own module. [Search and chat](https://www.shoalrun.com/search-and-chat.md) explains when to add semantic search or cited answers.

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
