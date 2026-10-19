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

## How the default chunker splits a page

The default chunker follows structure. It doesn't cut text into fixed-length windows.

1. **Split at `##` and `###` headings.** Text before the first `##` heading forms an intro passage. Headings at `####` and below stay inside their section's text.
2. **Keep blocks whole.** A paragraph, list, table, or code block is never cut mid-block, except for large tables in step 4.
3. **Fill passages up to 2,000 characters.** A section longer than that splits between blocks into a first passage and later parts.
4. **Split large tables between rows.** Each part repeats the table's header rows, so every row keeps its column names.
5. **Keep large code blocks whole.** A code block over the limit becomes one passage that exceeds it. Fenced code never starts a heading, so `#` comments inside a fence don't split a section.
6. **Merge short sections into their first subsection.** A section under 200 characters with a subsection below it joins that subsection's first passage. A short section with no subsection stays a passage of its own.

These limits are fixed. You can't configure the chunker or replace it yet.

The number of passages changes as the documentation grows. Most passages are a few hundred characters long, and nearly all stay under 2,000.
