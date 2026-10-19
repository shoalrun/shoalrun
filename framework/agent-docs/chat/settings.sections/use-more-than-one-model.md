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

**Updated: 2026-10-19.**

**Status: Experimental.**

Parent page: [Full Markdown page](/chat/settings.md)

Use this reference to look up fields after choosing a setup. For a working sequence, start with [local chat setup](https://www.shoalrun.com/chat/setup.md).

`retrieval` configures embeddings; `chat` configures answer generation and optional checks. Both sections are optional. A normal site build validates them without calling these providers.

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
