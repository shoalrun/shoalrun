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

**Updated: 2026-10-19.**

**Status: Experimental.**

Parent page: [Full Markdown page](/chat/checks.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [Generate and refresh answer cards](https://www.shoalrun.com/chat/prepared-answers.md) — Write reviewed answers to common questions so the chat serves them with no model call. (Status: experimental.)

Use this page after [local chat setup](https://www.shoalrun.com/chat/setup.md) to understand which checks run, which need a scorer, and when Shoalrun can reuse an answer. The [settings reference](https://www.shoalrun.com/chat/settings.md) defines the corresponding fields.

Citations and code are checked by default. Coverage gating, claim verification, direct excerpts, cards, and caching need their own configuration. None of these checks proves an answer is correct.

## Answer ahead of time

Some questions are asked so often that they deserve a reviewed answer. An answer card is generated and reviewed ahead of time, then served without a new chat-model answer. Matching still needs a query embedding and scorer confirmation. A card is used only while the passages behind it are unchanged. See [Prepared answers](https://www.shoalrun.com/chat/prepared-answers.md) to make them.
