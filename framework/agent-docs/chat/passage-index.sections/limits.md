---
id: guide.passage-index
title: Passage index
summary: Passage file formats, chunking rules, identifiers, embedding behavior,
  and limits.
type: reference
area: discovery
subarea: discovery-search
subjectLifecycle: experimental
canonical: /chat/passage-index
---

# Passage index

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Reference](https://www.shoalrun.com/.well-known/shoalrun/navigation/reference-tab-50f26fe22670.txt) (ID: reference-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Reference](https://www.shoalrun.com/cli.md) > Retrieval and chat > Passage index

**Updated: 2026-11-07.**

**Status: Experimental.**

Parent page: [Full Markdown page](/chat/passage-index.md)

A passage index splits built Markdown pages into smaller pieces for retrieval. Each passage keeps its page title, heading path, and source link. [Chat](https://www.shoalrun.com/chat.md) and the optional semantic search endpoint use it to find relevant parts of a page.

The default keyword [search box](https://www.shoalrun.com/author/search.md) uses the separate precompiled `search-terms.json`. The included `semantic` provider connects that box to the passage-search endpoint. You don't need a passage index for normal static-site keyword search.

Create the files after building the site:

| Command                  | Adds                                               | Provider requests                                 |
| ------------------------ | -------------------------------------------------- | ------------------------------------------------- |
| `shoalrun index`         | `ai/chunks.json`, the passage text and metadata.   | None.                                             |
| `shoalrun index --embed` | Passage index plus embedding metadata and vectors. | Sends embedding input to the configured provider. |

Indexing leaves published page content unchanged. The files sit beside the build output, and you must rebuild the index when that output changes.

## Limits

- Reader marks are copied from the page, so a section inside a page can't have its own audience. Run `shoalrun index` again after you change a page's marks. They aren't part of the embedding input, so changing them never re-embeds a passage.
- Passages don't overlap. The heading path supplies the context that overlap would.
- A few passages are very short, such as an empty related-reading block or a one-line API note.
- The chunker reads Markdown twins only. It doesn't read the OpenAPI source directly, so API detail appears only as far as the reference pages show it.
