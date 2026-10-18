---
id: guide.prepared-answers
title: Generate and refresh answer cards
summary: Generate and review common answers ahead of time, then serve confirmed
  cards without a new chat-model answer.
type: how-to
subjectLifecycle: experimental
canonical: /chat/prepared-answers
---

# Generate and refresh answer cards

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Search and chat > Documentation chat > Answer cards

**Updated: 2026-10-17.**

**Status: Experimental.**

An answer card stores a reviewed answer to a recurring question. Generate cards after local chat works, then review their text before serving them. Start in your documentation project root with the CLI available.

A confirmed card avoids generating a new answer. Matching still calls the embedding provider and relevance scorer.

> **Note:** An answer card is not a page card. Page cards preview another page; see [Cards and collections](https://www.shoalrun.com/author/components/cards.md). Answer cards are stored answers.

## What you need

- A site indexed with `--embed`. See [Passage index](https://www.shoalrun.com/chat/passage-index.md).
- A `chat` section with `rerank: jev` and a `cards` setting. See [Retrieval and chat settings](https://www.shoalrun.com/chat/settings.md).
- A configured chat service and the provider keys used by `shoalrun ask`. Card generation can make new provider requests each time it runs.

## List the questions

Write the questions in a YAML or JSON file. Each is a string, or a mapping with `question` and `aliases`. Aliases are other ways to ask the same thing.

```yaml title="config/answers.yaml"
- question: how do I reset my password
  aliases: [forgot my password, change my password]
- question: how do I export my data
```

The file can live anywhere. You pass its path to the next command.

## Build the cards

Card generation uses providers and can produce different wording on each run:

- `index --embed` sends new or changed passages to the embedding provider.
- `answers` calls the embedding provider and scorer, then the chat model for questions that pass the coverage gate.
- Fallback and escalation settings can add chat-model calls.

Run the commands, then review the generated file before publishing:

```sh
shoalrun index site-dist --embed
shoalrun answers site-dist --questions config/answers.yaml
```

Each question goes through the normal retrieval and answer checks. The command turns off card reuse and direct excerpts while generating cards, so an accepted card contains a freshly written answer. It also embeds each kept question and its aliases for later similarity matching. A question the docs do not cover may be declined before a chat-model call. The command writes `ai/answers.json` and reports kept and skipped questions. It skips a question when:

- The docs don't cover it.
- The answer was hedged.
- The answer cites nothing.
- A check flagged a sentence, some code, or a citation.

A skipped question is a signal. Either the docs need a page for it, or the question is too broad for one answer.

`ai/answers.json` is plain JSON. Each card holds its question, aliases, answer, sources, and the digest of every passage behind it. Read the answers before you ship them. The command writes the whole file each time, so to drop a card, remove its question from your list and run the command again.

## How a card is used

With `chat.cards` set, a question that opens a conversation is checked against cards in two steps:

1. The query embedding provider embeds the new question. Its vector is compared with each card's question vectors. A card at least `threshold` similar is shortlisted. The default is 0.75.
2. The relevance scorer checks whether the card's stored answer really answers this question. The card is used only at `confirm` or higher. The default is 0.9. A confirmed card needs no new chat-model answer.

Similarity alone can confuse related questions, such as turning notifications on versus turning them off. Scorer confirmation is a separate check against the stored answer. If no card is confirmed, the question follows the normal answer pipeline.

A follow-up never uses a card. A card also belongs to one publication and reader view, and a question asked in another view never uses it. `--no-cards` on `shoalrun ask` turns cards off for one run.

## Keep cards current

A card records the digest of each source passage. When a passage changes, the card stops being used without a warning. Run `shoalrun answers` after documentation changes to refresh the cards.

If `ai/answers.json` is missing, or was made with a different embedding model, `ask` says so and carries on without cards.

## Find questions worth a card

The question log shows what readers ask. Questions that were asked at least twice, that the model answered cleanly, and that no card covers make good candidates.

```sh
shoalrun ask-log ask.jsonl --cards-out candidates.yaml
```

`--cards-out` writes a new file and never replaces one. Review the list and move the questions you want into your questions file. Change the repeat count with `--min-repeats`. See [Keep a record of questions](https://www.shoalrun.com/chat/host.md) for how to record the log.

## Where cards work

Cards work in the terminal, the local panel, and the Vercel chat function.

For Vercel, build with `--chat`, then run `shoalrun answers` against the function's private `site` directory before deployment. The function reads `site/ai/answers.json` from that directory. A plain `shoalrun vercel build --chat` embeds passages but does not generate cards.

This repository's `npm run docs:build-all` performs both steps. See [Publish on Vercel](https://www.shoalrun.com/publish/vercel.md) for the deployment workflow.

## Related reading

### Reference while working

- [CLI reference](https://www.shoalrun.com/cli.md) — Look up the answers and ask-log commands and the --no-cards option.

- [Retrieval and chat settings](https://www.shoalrun.com/chat/settings.md) — Look up the chat.cards settings. (Status: experimental.)
