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

## Follow-up questions

### Recognize a standalone question

A question that stands on its own is answered as if it were the first, even in the middle of a conversation. An example is "how do I export my data". It can use the cache, the answer cards, and the direct excerpt. It costs no rewrite call. A question counts as standing on its own when it has five words or more. It must not contain words that point back, such as "it", "that", or "instead", and it must not open with "and" or "so". When the wording is unclear, the question is treated as a follow-up. A wrong guess in that direction only costs time.

### Rewrite a follow-up for search

A follow-up such as "and how do I check that it worked?" needs the earlier conversation. The model rewrites it as a standalone search query. To rephrase an answer, search keeps the previous topic and the model changes the wording. For example, “Can you say that in plainer language?” searches the original question instead of the wording request. The local preview shows the query as "Searched for".

A rewrite is accepted only when it meets these constraints:

- One line, at most 30 words and 200 characters.
- No web address or proposed instruction such as “Set the draft property to false.”
- Technical names in backticks, dotted identifiers, and command flags already occur in the conversation.

If the rewrite or service fails, retrieval combines the previous and current questions. The rejected rewrite is not displayed; a note records the fallback. These checks do not prove that an accepted rewrite preserves the reader's intent.

Rewriting makes a model call and is skipped when the model budget is spent.
