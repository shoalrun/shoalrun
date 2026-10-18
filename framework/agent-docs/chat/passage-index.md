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

A passage index splits built Markdown pages into smaller pieces for retrieval. Each passage keeps its page title, heading path, and source link. [Chat](https://www.shoalrun.com/chat.md) and custom passage-search providers use it to find relevant parts of a page.

The built-in [search box](https://www.shoalrun.com/author/search.md) uses the separate page-level `search-index.json`. You do not need a passage index for normal static-site search.

Create the files after building the site:

| Command                  | Adds                                               | Provider requests                                 |
| ------------------------ | -------------------------------------------------- | ------------------------------------------------- |
| `shoalrun index`         | `ai/chunks.json`, the passage text and metadata.   | None.                                             |
| `shoalrun index --embed` | Passage index plus embedding metadata and vectors. | Sends embedding input to the configured provider. |

Indexing leaves published page content unchanged. The files sit beside the build output, and you must rebuild the index when that output changes.

## Build the index

Build the site, then run `shoalrun index` on the output directory:

```sh
shoalrun build docs.config.yaml site-dist
shoalrun index site-dist
```

The command prints a summary as JSON:

```json
{
  "status": "ok",
  "documents": 77,
  "chunks": 725,
  "output": "/path/to/site-dist/ai/chunks.json"
}
```

The command reads three files from the build output:

| File                   | Use                                                                             |
| ---------------------- | ------------------------------------------------------------------------------- |
| `documents.json`       | The list of published pages, with each page's ID, URL, publication, and digest. |
| Each page's `.md` twin | The text to split.                                                              |
| `search-index.json`    | The heading IDs that passage links use. Optional.                               |

It writes `ai/chunks.json`. Without `--embed`, it makes no network requests. Run it after each build. It replaces the previous file.

Indexing also prepares readable paragraphs, code lines, and table rows for passage-search results. Search requests use that prepared data instead of parsing Markdown on first use. If serving search rejects an older index, rerun `shoalrun index site-dist`. Existing embeddings remain usable when the passage text and embedding settings are unchanged.

Because it reads built output, the index holds only published pages in each publication. Drafts and pages outside enabled publications never appear.

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
| `id`                     | The passage ID. See [Passage IDs](#passage-ids-and-links).                                                                                                              |
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

## Passage IDs and links

A passage ID is the page ID, `#`, and a slug of the heading path. A passage without headings uses `intro`. The chunker adds a suffix when IDs would collide:

| ID                                                  | Meaning                                                    |
| --------------------------------------------------- | ---------------------------------------------------------- |
| `guide.configuration#understand-the-three-stages`   | The first passage in that section.                         |
| `guide.configuration#understand-the-three-stages~2` | The second part of a section that split.                   |
| `guide.configuration#notes-2`                       | The second section on the page with the same heading path. |

IDs stay the same when body text changes. They change when you rename a heading or the page ID.

Section links come from the heading IDs in `search-index.json`. A passage links to the page, without a `#` anchor, when the build has no search index or when a component generated the heading. Walkthrough steps and tab labels are examples. The [site search](https://www.shoalrun.com/author/search.md) page describes the index.

## Embed passages

Add `--embed` to turn each passage into a vector. Shoalrun has no default embedding provider, so choose one under [`retrieval.embeddings`](https://www.shoalrun.com/config.md) in your config:

```yaml title="docs.config.yaml"
retrieval:
  embeddings:
    provider: voyage
    model: voyage-4-large
    dimension: 1024
```

Set the provider's key in the environment, `VOYAGE_API_KEY` for Voyage, then run:

```sh
shoalrun index site-dist --embed --config docs.config.yaml
```

The summary gains an `embeddings` object:

```json
{
  "embeddings": {
    "passages": 725,
    "embedded": 725,
    "reused": 0,
    "model": "voyage-4-large",
    "dimension": 1024,
    "bytes": 2969600
  }
}
```

The command sends each passage's [embedding input](#embedding-input) to the configured provider. The key is not written to the output.

It writes two files next to `chunks.json`:

| File                 | Content                                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `ai/embeddings.json` | The provider, model, embedding space, dimension, the `sourceDigest` of the build, and each passage's `id` and `digest` in row order. |
| `ai/embeddings.bin`  | One row of 32-bit floats per passage, in the same order. Each row has unit length, so a dot product is the cosine similarity.        |

The vector-file size grows with passage count and dimension. The files don't record the provider's URL or key variable, so an internal server's address never reaches your published site.

A rerun embeds only passages whose digest changed. Changing the model or the dimension re-embeds every passage. A vector is never used for a passage whose text changed after it was embedded, because the digests no longer match.

### Choose a provider

Two providers are built in, and you can switch by editing the config and rerunning the command.

| Provider | Use it for                                                                                                                                        |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `voyage` | Voyage AI's embedding models.                                                                                                                     |
| `openai` | OpenAI's embedding models, and servers that copy OpenAI's embeddings API, such as Ollama, vLLM, and a LiteLLM proxy. Set `baseUrl` to reach them. |

Vectors from different models can't be compared, so switching provider or model means embedding every passage again. Queries must use a model from the same embedding space as the passages.

OpenAI's API has no separate query and document mode, so models that need one lose it behind an OpenAI-style server. Shoalrun sends the `dimensions` request only for OpenAI's `text-embedding-3` models. If a proxy renames a model, set `dimension` to the size the backend returns.

### Embed queries with a different model

Queries use the model that embedded the passages unless you set `queryModel`. A different query model must share the stored vectors’ embedding space and dimension.

Voyage 4 models share a space. For example, you can embed passages with `voyage-4-large` and queries with `voyage-4-lite` without re-embedding the passages. Check provider availability before choosing a query model.

## Limits

- Reader marks are copied from the page, so a section inside a page can't have its own audience. Run `shoalrun index` again after you change a page's marks. They aren't part of the embedding input, so changing them never re-embeds a passage.
- Passages don't overlap. The heading path supplies the context that overlap would.
- A few passages are very short, such as an empty related-reading block or a one-line API note.
- The chunker reads Markdown twins only. It doesn't read the OpenAPI source directly, so API detail appears only as far as the reference pages show it.

## Related reading

No matching documents.
