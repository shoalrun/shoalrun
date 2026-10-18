---
id: guide.chat-checks
title: Check and speed up answers
summary: Understand answer checks, direct excerpts, caching, and the limits of each.
type: explanation
subjectLifecycle: experimental
canonical: /chat/checks
---

# Check and speed up answers

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Search and chat > Documentation chat > Answer checks and reuse

**Updated: 2026-10-17.**

**Status: Experimental.**

Parent page: [Full Markdown page](/chat/checks.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [Generate and refresh answer cards](https://www.shoalrun.com/chat/prepared-answers.md) — Write reviewed answers to common questions so the chat serves them with no model call. (Status: experimental.)

Use this page after [local chat setup](https://www.shoalrun.com/chat/setup.md) to understand which checks run, which need a scorer, and when Shoalrun can reuse an answer. The [settings reference](https://www.shoalrun.com/chat/settings.md) defines the corresponding fields.

Citations and code are checked by default. Coverage gating, claim verification, direct excerpts, cards, and caching need their own configuration. None of these checks proves an answer is correct.

## Reuse answers

People ask the same questions. With `chat.cache`, `serve --ask` keeps recent answers in memory and returns a stored one when the same question comes back, with no model call. The question is compared after ignoring case, extra spaces, and closing punctuation, and separately for each publication and reader view.

Only an answer that passed every check is stored. A hedged answer, a declined one, and one with a flagged sentence, flagged code, or an invented citation are not. A follow-up is never stored and never served from the cache, because its meaning depends on the conversation.

A cache entry is removed when:

- It is older than `ttlMinutes`.
- The cache is full and it is the least recently used entry.
- A source passage shown to the model has changed.

The local panel labels reused answers with "from the answer cache".

The cache lives in the server's memory and starts empty each time the server starts. It applies to `serve --ask`. The one-shot `ask` command and the eval never use it.
