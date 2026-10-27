---
id: guide.chat-checks
title: Check and speed up answers
summary: Understand answer checks, direct excerpts, caching, and the limits of each.
type: explanation
area: discovery
subarea: discovery-chat
subjectLifecycle: experimental
canonical: /chat/checks
---

# Check and speed up answers

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Search and chat > Documentation chat > Answer checks and reuse

**Updated: 2026-10-26.**

**Status: Experimental.**

Parent page: [Full Markdown page](/chat/checks.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [Generate and refresh answer cards](https://www.shoalrun.com/chat/prepared-answers.md) — Write reviewed answers to common questions so the chat serves them with no model call. (Status: experimental.)

Use this page after [local chat setup](https://www.shoalrun.com/chat/setup.md) to understand which checks run, which need a scorer, and when Shoalrun can reuse an answer. The [settings reference](https://www.shoalrun.com/chat/settings.md) defines the corresponding fields.

Citations and code are checked by default. Coverage gating, claim verification, direct excerpts, cards, and caching need their own configuration. None of these checks proves an answer is correct.

## Answer without a model

For a question answered by one passage, `chat.direct` can show the source text instead of generating an answer. This avoids a chat-model call, but the excerpt is only as accurate as the documentation behind it.

```yaml title="docs.config.yaml"
chat:
  rerank: jev
  direct: { threshold: 0.9, margin: 0.1, others: 1 }
```

A passage is shown only when all of these are true:

- Jev scores the best passage at `threshold` or higher.
- At most `others` other passages score within `margin` of the best. A broad question has many strong passages and needs a model to combine them.
- It is a question that stands on its own. A follow-up, which needs the conversation to make sense, always goes to the model.

Every other question goes to the model as usual. A passage longer than `maxChars` (default 1,200) is cut to the block that answers the question. The cut keeps the sentence that introduces a code example, or the example that a sentence introduces. If trimming fails, the whole passage is shown. The answer begins with **From the docs** and the page and section, and the result's decision is `excerpt`. `--no-direct` on `ask` turns the mode off for one run.

A higher `threshold`, a smaller `margin`, or fewer allowed `others` produces fewer excerpts and sends more questions to the model. Test both narrow questions and broad how-to questions; one relevant passage may answer only part of a request.
