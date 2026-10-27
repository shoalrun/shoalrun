---
id: guide.search-chat-overview
title: Search and chat
summary: Choose page search, meaning-based search, or cited answers for your
  documentation.
type: explanation
area: discovery
subarea: discovery-search
canonical: /search-and-chat
---

# Search and chat

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Search, chat, and agent access > Overview

**Updated: 2026-10-26.**

Start with [site search](https://www.shoalrun.com/author/search.md) if readers need links to pages and sections. It is built in, works on a static host, and needs no provider account. Add chat when readers need answers written from your documentation.

## Choose the result you want

These features have different setup and hosting needs. Passage retrieval and chat are experimental.

| Reader needs                           | Feature                                                                              | Requirements                                                                                                          |
| -------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Page and section links                 | [Site search](https://www.shoalrun.com/author/search.md)                             | A normal site build and a browser with JavaScript.                                                                    |
| Links that can match different wording | [Semantic search preview](https://www.shoalrun.com/recipes/preview-hybrid-search.md) | A passage index, embeddings, and a local search endpoint. The provider can fall back to keyword search.               |
| An answer with source citations        | [Documentation chat](https://www.shoalrun.com/chat/setup.md)                         | A passage index, a configured chat service, and a terminal or server. Embeddings and a scorer are optional additions. |

The sidebar's [navigation filter](https://www.shoalrun.com/author/navigation.md) only narrows the menu. Its search words do not change site-search results. The search dropdown returns links; it does not call a chat model.

## Start with a local chat

Follow [Set up local documentation chat](https://www.shoalrun.com/chat/setup.md) to configure a service, index your pages, and inspect an answer with sources.

Once that works, choose the next capability you need:

- [Answer checks](https://www.shoalrun.com/chat/checks.md) explain coverage, citations, code checks, and answer reuse.
- [Answer cards](https://www.shoalrun.com/chat/prepared-answers.md) prepare reviewed answers to recurring questions.
- [Hosting](https://www.shoalrun.com/chat/host.md) adds a Vercel function, shared limits, and an off switch.
- [Settings](https://www.shoalrun.com/chat/settings.md) define the provider fields and optional layers.

## Which index does each feature use?

Shoalrun keeps page search and passage retrieval separate.

| File                            | Created by                                             | Used for                                                                                                     |
| ------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `search-index.json`             | The normal site build when search indexing is enabled. | Browser page search and local documentation search. Contains titles, summaries, headings, and text excerpts. |
| `ai/chunks.json`                | `shoalrun index` after the build.                      | Passage retrieval for semantic search and chat. Contains text from built Markdown pages, with source links.  |
| `ai/embeddings.json` and `.bin` | `shoalrun index --embed`                               | Comparing the meaning of queries and passages. Requires an embedding provider.                               |

An **embedding** represents text as numbers. Keyword, or **lexical**, retrieval compares words. **Semantic** retrieval compares embeddings; **hybrid** retrieval combines word-based and meaning-based rankings. Neither requires a chat model just to return search links.

The [passage reference](https://www.shoalrun.com/chat/passage-index.md) describes these files in detail. The [glossary](https://www.shoalrun.com/glossary.md) defines the related terms.

## When an optional service is unavailable

Fallback behavior depends on the configured feature.

| Situation                                                    | Result                                                                      |
| ------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Built-in search has no server or provider key                | Browser keyword search still works.                                         |
| This site's custom search provider cannot reach its endpoint | It uses the browser keyword index.                                          |
| A search endpoint has no current vectors, or embeddings fail | It returns keyword passage results.                                         |
| Chat has no current vectors                                  | Retrieval uses keywords. A configured chat model can still write an answer. |
| A deployment has no chat function                            | The site remains available, but has no chat endpoint.                       |

A Vercel build with `--chat` includes search and answer endpoints. Semantic queries have shared rate and daily limits. When the embedding budget is exhausted, search returns keyword results. A static deployment can use browser search without those endpoints.

## Related reading

### Next steps

- [How documentation answers work](https://www.shoalrun.com/chat.md) — Turn passage retrieval into cited answers. (Status: experimental.)

- [Site search](https://www.shoalrun.com/author/search.md) — Configure the masthead box, its provider, and searchable index fields.

### Reference while working

- [Glossary](https://www.shoalrun.com/glossary.md) — Look up the search and retrieval terms used in this section.

- [Passage index](https://www.shoalrun.com/chat/passage-index.md) — Compare the page index with the passage and vector files. (Status: experimental.)
