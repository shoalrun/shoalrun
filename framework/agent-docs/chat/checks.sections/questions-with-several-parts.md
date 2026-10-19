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

## Questions with several parts

An explicit request such as “Compare templates and snippets, then explain navigation and publish it as Markdown” needs evidence for several tasks. Ask separates up to three action clauses and retrieves each part within the same publication and reader view. Ordinary conjunctions, such as “fonts and colors,” stay together. Longer or implicit requests use the ordinary retrieval path.

For each part, Ask also considers introductions from up to three matching pages. An introduction can explain a prerequisite or automatic build behavior that a matching subsection omits. Related-reading lists are excluded from this evidence selection. With Jev, up to 36 topic/passage pairs are scored in at most two additional batches. Semantic retrieval can make one additional query-embedding request per part.

Evidence selection reserves a passage for each part before adding a second round, up to `chat.passages`. The model is asked to address every part and state when evidence is missing. A part with no passage above the relevance threshold makes the answer partial; when none qualify, Ask declines. Multi-part requests do not use the direct-excerpt or answer-card shortcuts.

The result's optional `coverage` field records the topic and whether selected evidence passed the relevance threshold. Without a scorer, that value is `null`. A positive relevance score means a passage may help; it does not prove the answer is complete or correct. Citation and claim checks still run on the generated answer. Questions whose meaning depends on several sources remain experimental.
