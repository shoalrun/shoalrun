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

## When the scorer is down

The scorer is what keeps a question the docs don't cover from reaching the model. If it fails, by timing out, running out of budget, returning an error, or having no key, there are two ways to go.

- **`search` (the default).** The chat doesn't call the model. It shows the closest pages from retrieval and says it can't check answers right now. Nobody can use an outage to get free model output for any question, and readers still get somewhere to go.
- **`answer`.** The model answers without the gate and the claim check, and the answer carries a note that the checks were skipped. Use this when a reader-facing outage costs more than the risk. On a public site, every question then reaches the model, and only the rate limits and token caps stand in the way.

```yaml title="docs.config.yaml"
chat:
  rerank: { provider: jev, onError: answer }
```

Neither mode caches anything from an outage, so an unchecked answer can't outlive it. This applies only when a scorer is configured. With no `rerank`, the model answers every question, because you chose that.
