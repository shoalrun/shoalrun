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

Navigation section: [Reference](https://www.shoalrun.com/.well-known/shoalrun/navigation/reference-tab-50f26fe22670.txt) (ID: reference-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Reference](https://www.shoalrun.com/cli.md) > Retrieval and chat > Retrieval and chat settings

**Updated: 2026-10-25.**

**Status: Experimental.**

Parent page: [Full Markdown page](/chat/settings.md)

Use this reference to look up fields after choosing a setup. For a working sequence, start with [local chat setup](https://www.shoalrun.com/chat/setup.md).

`retrieval` configures embeddings; `chat` configures answer generation and optional checks. Both sections are optional. A normal site build validates them without calling these providers.

## Send extra request fields

Some services accept request fields that Shoalrun doesn't know about. `chat.body` adds them to every request. On OpenRouter, the useful ones are `reasoning`, which controls whether a model thinks before it answers, and `provider`, which picks who serves the model.

```yaml title="docs.config.yaml"
chat:
  model: deepseek/deepseek-v4-flash
  body: { reasoning: { enabled: false } }
```

The fields can add to a request but can't replace what Shoalrun sets, which is `model`, `messages`, `max_tokens`, `temperature`, and `stream`. Use `chat.model`, `chat.maxTokens`, and `chat.temperature` for those. A field whose name looks like a secret, such as a key, token, or password, fails validation, because the config never holds a key. Each fallback and escalation model inherits `body` and can replace it with its own. An empty `body: {}` clears it. Another service may reject a field it doesn't know, so check what yours accepts.

Service-specific fields can affect latency, cost, and quality. Test them with your own questions and model; support and effects vary by service. Shoalrun does not interpret those extra fields.
