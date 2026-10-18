---
id: reference.chat-config
title: Retrieval and chat settings
summary: Look up embedding, chat-model, scoring, and answer-reuse configuration.
type: reference
subjectLifecycle: experimental
canonical: /chat/settings
---

# Retrieval and chat settings

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Search and chat > Reference > Retrieval and chat settings

**Updated: 2026-10-17.**

**Status: Experimental.**

Parent page: [Full Markdown page](/chat/settings.md)

Use this reference to look up fields after choosing a setup. For a working sequence, start with [local chat setup](https://www.shoalrun.com/chat/setup.md).

`retrieval` configures embeddings; `chat` configures answer generation and optional checks. Both sections are optional. A normal site build validates them without calling these providers.

## Configure retrieval

`retrieval.embeddings` supplies embeddings for passage indexing, semantic queries, and hosted chat builds. Choose a provider and model when you need meaning-based retrieval.

```yaml title="docs.config.yaml"
retrieval:
  embeddings:
    provider: voyage
    model: voyage-4-large
    dimension: 1024
    queryModel: voyage-4-lite
```

To use OpenAI's embeddings, or a server that copies its API, such as Ollama, vLLM, or a LiteLLM proxy, name the `openai` provider:

```yaml title="docs.config.yaml"
retrieval:
  embeddings:
    provider: openai
    model: text-embedding-3-small
    keyEnv: OPENAI_API_KEY
```

| Key          | Meaning                                                                                                                                   |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `provider`   | Required. `voyage` or `openai`.                                                                                                           |
| `model`      | Required. The embedding model ID.                                                                                                         |
| `dimension`  | The vector size. Voyage accepts 256, 512, 1024, or 2048. Other models need it unless Shoalrun knows the model's size.                     |
| `queryModel` | The model that embeds queries. It must share an embedding space with `model`, as the Voyage 4 models do. Without it, queries use `model`. |
| `baseUrl`    | `openai` only. An OpenAI-style server, such as `http://localhost:11434/v1` for Ollama.                                                    |
| `keyEnv`     | The name of the environment variable that holds the key. It defaults to `VOYAGE_API_KEY` or `OPENAI_API_KEY`.                             |

The config never holds a key. A key setting fails validation, and `keyEnv` fails if its value isn't a variable name. Command-line flags on `shoalrun index` override these settings. See [Passage index](https://www.shoalrun.com/chat/passage-index.md) for the files that `--embed` writes.
