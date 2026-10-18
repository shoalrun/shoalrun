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

## Choose the scorer

The scorer behind `rerank`, `gate`, `verify`, `direct`, and `cards` is a service that answers yes-or-no questions about a passage. `provider: jev` names the protocol it speaks, `POST /v1/systemone`, and not one vendor. Any service or local server that speaks it works. With no other settings, Shoalrun reads the address, model, and key from `JEV_API_KEY`, `TYPESAFE_API_KEY`, `TYPESAFE_ENDPOINT`, and `JEV_MODEL`. To choose them in config, use a mapping.

```yaml title="docs.config.yaml"
chat:
  rerank:
    provider: jev
    endpoint: https://scorer.example.com
    model: your-model-name
    keyEnv: SCORER_API_KEY
```

| Setting       | What it does                                                                                                                                                               |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provider`    | Must be `jev`.                                                                                                                                                             |
| `endpoint`    | The service address. It must use `https`, except for `localhost`, and can't hold credentials or a query. Shoalrun adds `/v1/systemone` when the address doesn't end there. |
| `model`       | The model name the service expects.                                                                                                                                        |
| `onError`     | What to do when the scorer fails: `search` (the default) or `answer`. See [When the scorer is down](https://www.shoalrun.com/chat/settings.md#when-the-scorer-is-down).    |
| `keyEnv`      | The name of the environment variable that holds the key. The config never holds the key.                                                                                   |
| `stateFormat` | `object` (the default) or `string`. Some scorers accept the text to judge only as a string. Use `string` for those.                                                        |

OpenRouter serves Jev at the same protocol and price, so the chat model and the scorer can share one key:

```yaml title="docs.config.yaml"
chat:
  rerank:
    provider: jev
    endpoint: https://openrouter.ai/api/v1
    model: typesafe/jev-1.13
    keyEnv: OPENROUTER_API_KEY
```

Scores from different services aren't comparable. The gate, `verify`, `direct`, and `cards` thresholds are numbers on one scorer's scale. After a change, run `shoalrun answers` and the answer eval again, and expect to adjust them. Cached scores are kept per address and model, so a change never reuses an old service's scores.
