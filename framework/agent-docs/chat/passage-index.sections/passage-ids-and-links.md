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

**Updated: 2026-11-05.**

**Status: Experimental.**

Parent page: [Full Markdown page](/chat/passage-index.md)

A passage index splits built Markdown pages into smaller pieces for retrieval. Each passage keeps its page title, heading path, and source link. [Chat](https://www.shoalrun.com/chat.md) and the optional semantic search endpoint use it to find relevant parts of a page.

The default keyword [search box](https://www.shoalrun.com/author/search.md) uses the separate page-level `search-index.json`. The included `semantic` provider connects that box to the passage-search endpoint. You don't need a passage index for normal static-site keyword search.

Create the files after building the site:

| Command                  | Adds                                               | Provider requests                                 |
| ------------------------ | -------------------------------------------------- | ------------------------------------------------- |
| `shoalrun index`         | `ai/chunks.json`, the passage text and metadata.   | None.                                             |
| `shoalrun index --embed` | Passage index plus embedding metadata and vectors. | Sends embedding input to the configured provider. |

Indexing leaves published page content unchanged. The files sit beside the build output, and you must rebuild the index when that output changes.

## Passage IDs and links

Since `0.1.0-alpha.16`, a passage ID contains the URL-encoded publication, `:`, the URL-encoded page ID, `#`, and a slug of the heading path. Repeated logical page IDs in different releases have distinct passage IDs. A passage without headings uses `intro`. The chunker adds a suffix when IDs would collide:

| ID                                                                            | Meaning                                                    |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `production%7Ccurrent%7Cen:guide.configuration#understand-the-three-stages`   | The first passage in that section.                         |
| `production%7Ccurrent%7Cen:guide.configuration#understand-the-three-stages~2` | The second part of a section that split.                   |
| `production%7Ccurrent%7Cen:guide.configuration#notes-2`                       | The second section on the page with the same heading path. |

IDs stay the same when body text changes. They change when you rename a heading, the page ID, or its publication. Treat the complete passage ID as an opaque identifier; use `docId` for the logical page identity.

When upgrading an existing index, rerun `shoalrun index site-dist --embed --config docs.config.yaml` with the same embedding configuration. Matching input vectors are reused even when stored passage IDs change. Regenerate answer cards after rebuilding their cited IDs. Older indexes with duplicate passage IDs fail with rebuild instructions instead of silently sharing vectors across releases.

The index command’s JSON summary includes `sourceDigest` and passage counts for each publication. Check these fields before starting a server, and index each customer’s already-pruned build separately. A running preview reads indexes at startup, so restart it after reindexing. Stored vectors remain file-backed; this release doesn't add an external vector database.

Section links come from the heading IDs in `search-index.json`. A passage links to the page, without a `#` anchor, when the build has no search index or when a component generated the heading. Walkthrough steps and tab labels are examples. The [site search](https://www.shoalrun.com/author/search.md) page describes the index.
