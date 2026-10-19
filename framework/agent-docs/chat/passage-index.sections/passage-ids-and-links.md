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

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Search and chat > Reference > Passage index

**Updated: 2026-10-19.**

**Status: Experimental.**

Parent page: [Full Markdown page](/chat/passage-index.md)

A passage index splits built Markdown pages into smaller pieces for retrieval. Each passage keeps its page title, heading path, and source link. [Chat](https://www.shoalrun.com/chat.md) and custom passage-search providers use it to find relevant parts of a page.

The built-in [search box](https://www.shoalrun.com/author/search.md) uses the separate page-level `search-index.json`. You do not need a passage index for normal static-site search.

Create the files after building the site:

| Command                  | Adds                                               | Provider requests                                 |
| ------------------------ | -------------------------------------------------- | ------------------------------------------------- |
| `shoalrun index`         | `ai/chunks.json`, the passage text and metadata.   | None.                                             |
| `shoalrun index --embed` | Passage index plus embedding metadata and vectors. | Sends embedding input to the configured provider. |

Indexing leaves published page content unchanged. The files sit beside the build output, and you must rebuild the index when that output changes.

## Passage IDs and links

A passage ID is the page ID, `#`, and a slug of the heading path. A passage without headings uses `intro`. The chunker adds a suffix when IDs would collide:

| ID                                                  | Meaning                                                    |
| --------------------------------------------------- | ---------------------------------------------------------- |
| `guide.configuration#understand-the-three-stages`   | The first passage in that section.                         |
| `guide.configuration#understand-the-three-stages~2` | The second part of a section that split.                   |
| `guide.configuration#notes-2`                       | The second section on the page with the same heading path. |

IDs stay the same when body text changes. They change when you rename a heading or the page ID.

Section links come from the heading IDs in `search-index.json`. A passage links to the page, without a `#` anchor, when the build has no search index or when a component generated the heading. Walkthrough steps and tab labels are examples. The [site search](https://www.shoalrun.com/author/search.md) page describes the index.
