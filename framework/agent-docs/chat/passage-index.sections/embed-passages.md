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

The command sends each passage's [embedding input](https://www.shoalrun.com/chat/passage-index.md#embedding-input) to the configured provider. The key is not written to the output.

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
