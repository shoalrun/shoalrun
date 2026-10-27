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

## How an answer is checked

The coverage gate runs before generation. The other checks inspect the generated answer.

| Check     | What it catches                                             | Needs                      |
| --------- | ----------------------------------------------------------- | -------------------------- |
| Gate      | A question the docs don't cover. The model is never called. | `rerank: jev` and `gate`   |
| Citations | A citation to a passage the model wasn't given.             | Always on                  |
| Code      | A command or config that isn't in the passages.             | Always on                  |
| Claims    | A sentence that its cited passage doesn't support.          | `rerank: jev` and `verify` |

### Citations

The model sees numbered passages and cites them as `[1]`, `[2]`. A citation to a number it wasn't given is removed. The rest are renumbered in order of first appearance, so a reader sees `[1]`, `[2]`, `[3]`. An answer with no citation is flagged.

### Code

A line of code must appear in the passages word for word, or every word in it must appear there. That allows a shorter form of a documented example, such as `<Table filter>` for `<Table filter sticky>`. It catches an invented flag, subcommand, or config key, and a glued path such as `docs.config.yaml.vercel/output`, where the model dropped a space.

Some differences are allowed. Sample content in a language that illustrates, such as a Mermaid diagram or plain output, isn't checked. A path or file name that a reader would choose, such as `content/my-page.mdx`, is accepted even when the docs never use it. Inline code may flatten a nested example. Numbers and comments are ignored. The check can't catch the right words in the wrong order.

### Claims

Jev reads each sentence that carries a citation, together with the passage it cites. It scores from 0 to 1 how well the passage supports the sentence. A sentence with no citation of its own uses the citations on its line.

Fenced code, lead-ins that end in a colon, and statements that the docs lack something are skipped, because no passage can support an absence. That covers phrasings such as "the docs don't specifically describe", "no other information is given", and "it only shows".

A sentence below `verify.threshold` is flagged in the notes, or removed when `onUnsupported` is `remove`. If removal leaves no supported sentence, the answer becomes "The documentation does not cover that." The check costs one more Jev call for each answer.

Start with flagging while you review the results. Choose a threshold using questions and source passages from your own project; scores and useful thresholds vary by scorer. Removing sentences can leave an answer incomplete.

The claims check can't catch a wrong sentence that a passage loosely supports, or a passage that is itself wrong. It reads only the passage a sentence cites.
