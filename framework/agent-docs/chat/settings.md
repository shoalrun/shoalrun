---
id: reference.chat-config
title: Retrieval and chat settings
summary: Look up embedding, chat-model, scoring, and answer-reuse configuration.
type: reference
area: discovery
subarea: discovery-chat
subjectLifecycle: experimental
canonical: /chat/settings
---

# Retrieval and chat settings

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Search and chat > Reference > Retrieval and chat settings

**Updated: 2026-10-25.**

**Status: Experimental.**

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

## Configure chat

`chat` configures the OpenAI-compatible service that writes answers. Choose a provider and model; there is no default model. Start with these fields, then add optional checks or reuse settings as needed.

```yaml title="docs.config.yaml"
chat:
  provider: openai
  model: deepseek/deepseek-v4-flash
  baseUrl: https://openrouter.ai/api/v1
  keyEnv: OPENROUTER_API_KEY
```

These fields configure the service and answer limits:

| Key           | Meaning                                                                                                                                 |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `provider`    | Required. `openai`, which covers any OpenAI-style service.                                                                              |
| `model`       | Required. The model ID that your service uses.                                                                                          |
| `baseUrl`     | The service's API address. It defaults to `https://api.openai.com/v1`.                                                                  |
| `keyEnv`      | The name of the environment variable that holds the key. It defaults to `OPENAI_API_KEY`. Services on `localhost` need no key.          |
| `body`        | Extra fields to send with every request, such as OpenRouter's `reasoning`. See [Send extra request fields](#send-extra-request-fields). |
| `passages`    | How many passages the model sees, from 1 to 20.                                                                                         |
| `maxTokens`   | The longest answer the model may write. Reasoning models need a larger value.                                                           |
| `temperature` | A number from 0 to 2. Without it, the service's default applies.                                                                        |

### Optional layers

Add these fields to `chat` when the corresponding capability is needed. Scorer-dependent fields require `rerank: jev` or an equivalent scorer mapping.

| Key          | Meaning                                                                                                                                                                                                                                                              |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `readerView` | Whose questions the chat answers, as reader filter choices. See [Answer for one audience](https://www.shoalrun.com/chat/checks.md).                                                                                                                                  |
| `rerank`     | `jev` reorders the top 24 results with a relevance scorer. It needs `JEV_API_KEY`. To use a different service, give a mapping instead. See [Choose the scorer](#choose-the-scorer).                                                                                  |
| `gate`       | Needs `rerank: jev`. `decline` and `hedge` are Jev scores from 0 to 1, and `decline` must be lower.                                                                                                                                                                  |
| `verify`     | Needs `rerank: jev`. `threshold` is a Jev score above 0 and below 1. `onUnsupported` is `flag` (the default) or `remove`. See [How an answer is checked](https://www.shoalrun.com/chat/checks.md).                                                                   |
| `direct`     | Needs `rerank: jev`. Shows a passage word for word instead of calling the model. See [Answer without a model](https://www.shoalrun.com/chat/checks.md).                                                                                                              |
| `fallback`   | A list of one to five other models to try, in order, when the main one fails. See [Use more than one model](#use-more-than-one-model).                                                                                                                               |
| `escalate`   | A second model to ask when the checks flag an answer, with an optional `when` list. See [Use more than one model](#use-more-than-one-model).                                                                                                                         |
| `budget`     | Daily caps on questions that reach the model. See [Cap the daily spend](https://www.shoalrun.com/chat/host.md).                                                                                                                                                      |
| `challenge`  | A Turnstile check for a hosted chat. See [Host the chat on Vercel](https://www.shoalrun.com/chat/host.md).                                                                                                                                                           |
| `log`        | Records questions on a hosted chat. See [Host the chat on Vercel](https://www.shoalrun.com/chat/host.md).                                                                                                                                                            |
| `cache`      | Keeps clean answers so a repeated question costs nothing. `maxEntries` (default 500) and `ttlMinutes` (default 1,440) set the size and the age. See [Reuse answers](https://www.shoalrun.com/chat/checks.md).                                                        |
| `cards`      | Needs `rerank: jev`. Serves answers written ahead of time. `threshold` (default 0.75) shortlists a card by similarity, and `confirm` (default 0.9) is the Jev score that must confirm it. See [Prepared answers](https://www.shoalrun.com/chat/prepared-answers.md). |

The gate uses the best passage score:

- Below `decline`: return a not-covered response without a chat-model call.
- Between `decline` and `hedge`: generate an answer with a partial-coverage warning.
- At or above `hedge`: generate an answer normally.

The config never holds a key. A key setting fails validation, and `keyEnv` fails if its value isn't a variable name. The `--model` flag on `shoalrun ask` overrides `model`, so you can try another model without editing the config.

## Send extra request fields

Some services accept request fields that Shoalrun doesn't know about. `chat.body` adds them to every request. On OpenRouter, the useful ones are `reasoning`, which controls whether a model thinks before it answers, and `provider`, which picks who serves the model.

```yaml title="docs.config.yaml"
chat:
  model: deepseek/deepseek-v4-flash
  body: { reasoning: { enabled: false } }
```

The fields can add to a request but can't replace what Shoalrun sets, which is `model`, `messages`, `max_tokens`, `temperature`, and `stream`. Use `chat.model`, `chat.maxTokens`, and `chat.temperature` for those. A field whose name looks like a secret, such as a key, token, or password, fails validation, because the config never holds a key. Each fallback and escalation model inherits `body` and can replace it with its own. An empty `body: {}` clears it. Another service may reject a field it doesn't know, so check what yours accepts.

Service-specific fields can affect latency, cost, and quality. Test them with your own questions and model; support and effects vary by service. Shoalrun does not interpret those extra fields.

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
| `onError`     | What to do when the scorer fails: `search` (the default) or `answer`. See [When the scorer is down](#when-the-scorer-is-down).                                             |
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

## When the scorer is down

The scorer is what keeps a question the docs don't cover from reaching the model. If it fails, by timing out, running out of budget, returning an error, or having no key, there are two ways to go.

- **`search` (the default).** The chat doesn't call the model. It shows the closest pages from retrieval and says it can't check answers right now. Nobody can use an outage to get free model output for any question, and readers still get somewhere to go.
- **`answer`.** The model answers without the gate and the claim check, and the answer carries a note that the checks were skipped. Use this when a reader-facing outage costs more than the risk. On a public site, every question then reaches the model, and only the rate limits and token caps stand in the way.

```yaml title="docs.config.yaml"
chat:
  rerank: { provider: jev, onError: answer }
```

Neither mode caches anything from an outage, so an unchecked answer can't outlive it. This applies only when a scorer is configured. With no `rerank`, the model answers every question, because you chose that.

## Use more than one model

Use `fallback` for provider failures and `escalate` for answers flagged by checks. Both are optional:

```yaml title="docs.config.yaml"
chat:
  provider: openai
  model: deepseek/deepseek-v4-flash
  baseUrl: https://openrouter.ai/api/v1
  keyEnv: OPENROUTER_API_KEY
  fallback: [{ model: openai/gpt-6-luna }]
  escalate: { model: z-ai/glm-5.3-flash, when: [unsupported-claim, uncited] }
```

Each extra model inherits the provider, address, key variable, and limits from the main settings. Name only what differs. A model on a different service can set its own `baseUrl` and `keyEnv`. The `--model` flag on `ask` replaces the main model and leaves the others alone.

### Fallback

If the main model errors, times out, or returns no text, `ask` tries the next model in the list. Use a model from a different lab, so one outage doesn't stop the chat. The result records which model answered and which failed, with the reason. If every model fails, the error lists all of them.

### Escalation

The main model answers first, and the checks run. If one of the `when` reasons applies, `ask` asks the escalation model the same question with the same passages and runs the same checks. It shows whichever answer has fewer flags, and the first one if they tie. The supported reasons are:

| Reason              | Fires when                                                 |
| ------------------- | ---------------------------------------------------------- |
| `unsupported-code`  | The answer has code that isn't in the passages.            |
| `uncited`           | The answer cites no passage.                               |
| `unsupported-claim` | A sentence fails the claims check. It needs `chat.verify`. |

Without `when`, the reasons are `unsupported-code` and `uncited`, plus `unsupported-claim` when `verify` is set. The code check is a heuristic that can misjudge a valid example. A second answer from a thinking model adds seconds. So many sites limit `when` to `unsupported-claim` and `uncited`. A declined answer or a direct excerpt is never escalated. If the escalation model fails, the first answer is shown with a note. `--no-escalate` on `ask` turns it off for one run.

Choose an escalation model using reviewed questions that your primary model handles poorly. A larger model is not automatically a better fit.

## Related reading

No matching documents.
