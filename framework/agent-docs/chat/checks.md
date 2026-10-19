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

## Answer ahead of time

Some questions are asked so often that they deserve a reviewed answer. An answer card is generated and reviewed ahead of time, then served without a new chat-model answer. Matching still needs a query embedding and scorer confirmation. A card is used only while the passages behind it are unchanged. See [Prepared answers](https://www.shoalrun.com/chat/prepared-answers.md) to make them.

## Reuse answers

People ask the same questions. With `chat.cache`, `serve --ask` keeps recent answers in memory and returns a stored one when the same question comes back, with no model call. The question is compared after ignoring case, extra spaces, and closing punctuation, and separately for each publication and reader view.

Only an answer that passed every check is stored. A hedged answer, a declined one, and one with a flagged sentence, flagged code, or an invented citation are not. A follow-up is never stored and never served from the cache, because its meaning depends on the conversation.

A cache entry is removed when:

- It is older than `ttlMinutes`.
- The cache is full and it is the least recently used entry.
- A source passage shown to the model has changed.

The local panel labels reused answers with "from the answer cache".

The cache lives in the server's memory and starts empty each time the server starts. It applies to `serve --ask`. The one-shot `ask` command and the eval never use it.

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

## Questions with several parts

An explicit request such as “Compare templates and snippets, then explain navigation and publish it as Markdown” needs evidence for several tasks. Ask separates up to three action clauses and retrieves each part within the same publication and reader view. Ordinary conjunctions, such as “fonts and colors,” stay together. Longer or implicit requests use the ordinary retrieval path.

For each part, Ask also considers introductions from up to three matching pages. An introduction can explain a prerequisite or automatic build behavior that a matching subsection omits. Related-reading lists are excluded from this evidence selection. With Jev, up to 36 topic/passage pairs are scored in at most two additional batches. Semantic retrieval can make one additional query-embedding request per part.

Evidence selection reserves a passage for each part before adding a second round, up to `chat.passages`. The model is asked to address every part and state when evidence is missing. A part with no passage above the relevance threshold makes the answer partial; when none qualify, Ask declines. Multi-part requests do not use the direct-excerpt or answer-card shortcuts.

The result's optional `coverage` field records the topic and whether selected evidence passed the relevance threshold. Without a scorer, that value is `null`. A positive relevance score means a passage may help; it does not prove the answer is complete or correct. Citation and claim checks still run on the generated answer. Questions whose meaning depends on several sources remain experimental.

## Answer for one audience

`chat.readerView` limits retrieval to the configured audience, such as customers or staff. It filters whole pages using their reader marks. It does not make published files private; use host-level access controls for confidential content.

It uses the same reader filters as the search box. Define the audiences once under `readerFilters.facets`, name one in the chat, and tag pages with `audiences`:

```yaml title="docs.config.yaml"
readerFilters:
  facets:
    audience:
      label: Audience
      options: { customers: Customers, staff: Staff }
chat:
  readerView: { audience: [customers] }
```

```yaml title="A staff-only page"
audiences: [staff]
```

The rule is the one the search box uses:

- A page with no audience is for everyone, and the chat can use it.
- A page tagged `staff` is used only when the chat's view includes `staff`.
- A page tagged for several audiences is used when the view includes any of them.

`readerView` needs `readerFilters.facets`, and each name and choice must exist there. The build and `config validate` check that.

Rebuild the [passage index](https://www.shoalrun.com/chat/passage-index.md) after changing page marks. An older index without those marks treats every page as shared. Section-level marks are ignored by passage retrieval.

Use `--reader-view audience=staff` on `ask` or `serve --ask` to change the view for one run.

## Related reading

### Next steps

- [Generate and refresh answer cards](https://www.shoalrun.com/chat/prepared-answers.md) — Write reviewed answers to common questions so the chat serves them with no model call. (Status: experimental.)

### Reference while working

- [Retrieval and chat settings](https://www.shoalrun.com/chat/settings.md) — Look up the settings that turn each check on. (Status: experimental.)

### Related topics

- [Agent authoring, search, and documentation answers](https://www.shoalrun.com/changelog/authoring-search.md) — Understand documentation answer checks and their limits.
