---
id: guide.passage-index
title: Passage index
summary: Passage file formats, chunking rules, identifiers, embedding behavior,
  and limits.
type: reference
subjectLifecycle: experimental
canonical: /chat/passage-index
---

# Passage index

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Search and chat > Reference > Passage index

**Updated: 2026-10-18.**

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

## What a passage contains

Each entry in `chunks` describes one passage:

```json title="ai/chunks.json"
{
  "id": "guide.configuration#understand-the-three-stages",
  "docId": "guide.configuration",
  "title": "Organize project configuration",
  "type": "how-to",
  "variant": "production|current|en",
  "headingPath": ["Understand the three stages"],
  "url": "/configuration#understand-the-three-stages",
  "markdownUrl": "/configuration.md",
  "text": "Configuration takes effect in three stages:\n\n1. **Resolve co…",
  "digest": "be259c2f4c0c896d1fe25ed496ac642f97391744675e06ee844f09372e47767a",
  "search": {
    "schemaVersion": 1,
    "paragraphs": ["Configuration takes effect in three stages: …"],
    "literalLines": []
  }
}
```

| Field                    | Value                                                                                                                                                                   |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                     | The passage ID. See [Passage IDs](https://www.shoalrun.com/chat/passage-index.md#passage-ids-and-links).                                                                |
| `docId`, `title`, `type` | The page's ID, title, and type.                                                                                                                                         |
| `variant`                | The page's channel, version, and language, joined by `\|`. Passages from different publications never mix.                                                              |
| `headingPath`            | The `##` and `###` headings above the passage, outermost first. Empty for an intro passage.                                                                             |
| `url`                    | The page URL, plus `#` and the section's heading ID when one exists.                                                                                                    |
| `markdownUrl`            | The page's Markdown twin.                                                                                                                                               |
| `readerFilters`          | Optional. The page's reader marks, such as `{ "audience": ["maintainers"] }`. It is present only when the page has marks. Retrieval uses it to answer for one audience. |
| `text`                   | The passage's Markdown, without its own heading.                                                                                                                        |
| `digest`                 | A SHA-256 hash of the passage's embedding input.                                                                                                                        |
| `search`                 | Prepared result content: `schemaVersion: 1`, explanatory `paragraphs`, and code/table `literalLines`. Generated navigation lists are excluded from the paragraphs.      |

The file also records `schemaVersion` and a `sourceDigest` that changes when any page's digest changes.

### Embedding input

The heading path isn't part of `text`. Anything that scores or embeds a passage reads the page title, the heading path, and the text together:

```text
Organize project configuration > Understand the three stages

Configuration takes effect in three stages: …
```

`digest` hashes that string, so it changes when the title, the heading path, or the text changes. A stored vector or score that no longer matches a passage's digest is stale.

The derived `search` data is not part of the embedding input or its digest. Preparing it does not require new embeddings for unchanged passages.
